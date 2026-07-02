package main

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed frontend/*
var embeddedFrontend embed.FS

type spaFileSystem struct {
	root http.FileSystem
}

func (s *spaFileSystem) Open(name string) (http.File, error) {
	f, err := s.root.Open(name)
	if err != nil {
		return s.root.Open("/index.html")
	}
	return f, nil
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
