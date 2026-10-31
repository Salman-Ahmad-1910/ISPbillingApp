package main

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed all:frontend
var embeddedFrontend embed.FS

type spaFileSystem struct {
	root http.FileSystem
}

func isStaticAsset(name string) bool {
	extensions := []string{
		".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
		".ico", ".woff", ".woff2", ".ttf", ".eot", ".map",
		".json", ".webp", ".avif", ".mp4", ".webm",
	}
	lower := strings.ToLower(name)
	for _, ext := range extensions {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

func (s *spaFileSystem) Open(name string) (http.File, error) {
	// For static assets (JS, CSS, images, etc.), serve the actual file
	if isStaticAsset(name) {
		f, err := s.root.Open(name)
		if err != nil {
			return s.root.Open("/index.html")
		}
		return f, nil
	}

	// For root path, return the directory so http.FileServer
	// can serve index.html from it
	if name == "/" || name == "" || name == "." {
		return s.root.Open(".")
	}

	// For page routes, first try to serve the route-specific HTML file.
	// e.g. /crm/subscriber-detail/ -> crm/subscriber-detail/index.html
	// Append index.html to the path and attempt to open it.
	routePath := path.Clean(name)
	indexPath := routePath + "/index.html"
	if f, err := s.root.Open(indexPath); err == nil {
		return f, nil
	}

	// Also try without trailing slash handling
	dirPath := routePath
	if f, err := s.root.Open(dirPath); err == nil {
		return f, nil
	}

	// Fallback to root index.html for SPA client-side routing
	return s.root.Open("/index.html")
}

func serveFrontend() gin.HandlerFunc {
	subFS, err := fs.Sub(embeddedFrontend, "frontend")
	if err != nil {
		panic("failed to get frontend sub filesystem: " + err.Error())
	}

	spaFS := &spaFileSystem{root: http.FS(subFS)}
	fileServer := http.FileServer(spaFS)

	return func(c *gin.Context) {
		path := c.Request.URL.Path

		if strings.HasPrefix(path, "/api") {
			c.AbortWithStatusJSON(404, gin.H{"error": "not found"})
			return
		}

		// A normal browser page load of a Next.js RSC payload file
		// (".../index.txt") happens when the client router gives up on a soft
		// navigation and does a full reload — e.g. after a new deploy changed the
		// build ID while a tab was still running the previous version. In static
		// export mode Next reloads the .txt URL itself, so the user saw raw RSC
		// text. Send the browser to the real page instead; it then loads the
		// current build. RSC fetches made by the router carry the "RSC" header and
		// do not ask for text/html, so they are not affected.
		if strings.HasSuffix(path, "/index.txt") &&
			c.GetHeader("RSC") == "" &&
			strings.Contains(c.GetHeader("Accept"), "text/html") {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Redirect(http.StatusFound, strings.TrimSuffix(path, "index.txt"))
			return
		}

		// Go's built-in MIME table has no ".txt" entry, so on a server without
		// /etc/mime.types the type depended on content sniffing. Next's router
		// only accepts the RSC payload when it is served as text/plain.
		if strings.HasSuffix(path, ".txt") {
			c.Header("Content-Type", "text/plain; charset=utf-8")
		}

		// Hashed static assets can be cached forever (content-addressed names).
		// Everything else (HTML) must never be cached so the browser always
		// picks up newly deployed bundles.
		if strings.HasPrefix(path, "/_next/static/") {
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		}

		fileServer.ServeHTTP(c.Writer, c.Request)
	}
}
