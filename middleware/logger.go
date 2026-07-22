package middleware

import (
	"bytes"
	"io"
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger logs the request path, method, response status, and latency
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		method := c.Request.Method
		path := c.Request.URL.Path

		// Only log body if it's not a GET
		if method != "GET" && c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes)) // reset body reader
			log.Printf("--> %s %s Body: %s", method, path, string(bodyBytes))
		} else {
			log.Printf("--> %s %s", method, path)
		}

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		log.Printf("<-- %s %s [%d] %v", method, path, status, latency)
	}
}
