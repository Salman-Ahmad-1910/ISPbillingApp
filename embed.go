package main

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed frontend/*
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

		fileServer.ServeHTTP(c.Writer, c.Request)
	}
}
