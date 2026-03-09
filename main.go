package main

import (
	"log"
	"os"

	"awesomeProject/config"
	_ "awesomeProject/models"
	"awesomeProject/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load ENV
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Connect to DB
	config.ConnectDatabase()

	// Run all migrations
	config.RunMigrations()

	// Init Router
	r := gin.Default()

	routes.SetupRoutes(r)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}

	log.Printf("Server running on port %s", port)
	r.Run(":" + port)
}
