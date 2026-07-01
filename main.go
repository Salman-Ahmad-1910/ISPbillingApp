package main

import (
	"flag"
	"log"
	"os"

	"awesomeProject/config"
	_ "awesomeProject/models"
	"awesomeProject/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Parse command line flags
	migrateOnly := flag.Bool("migrate-only", false, "Run database migration only and exit")
	flag.Parse()

	// Load ENV
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Connect to DB
	config.ConnectDatabase()

	// Run all migrations
	config.RunMigrations()

	// If migrate-only flag is set, exit after migration
	if *migrateOnly {
		log.Println("✅ Migration completed successfully. Exiting...")
		os.Exit(0)
	}

	// Init Router
	r := gin.Default()

	// Serve uploaded files (images) at /uploads/ so the stored DB paths
	// (e.g. "/uploads/product_images/uuid.png") resolve without the /api/v1 prefix.
	r.Static("/uploads", "./uploads")

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
