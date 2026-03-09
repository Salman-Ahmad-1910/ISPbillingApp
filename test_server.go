package main

import (
"fmt"
"net/http"
"github.com/gin-gonic/gin"
)

func main() {
r := gin.Default()

r.GET("/test", func(c *gin.Context) {
fmt.Printf("DEBUG: Test route called!\n")
c.JSON(http.StatusOK, gin.H{"message": "Test works!"})
})

fmt.Println("Starting test server on :8081")
r.Run(":8081")
}
