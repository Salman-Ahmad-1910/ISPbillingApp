package main

import (
	"log"

	"awesomeProject/config"
	"awesomeProject/models"

	"github.com/joho/godotenv"
)

func main() {
	// Load ENV
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Connect to DB
	config.ConnectDatabase()

	// Create SupportTicket table
	log.Println("Creating SupportTicket table...")
	err := config.DB.AutoMigrate(&models.SupportTicket{})
	if err != nil {
		log.Fatal("Failed to migrate SupportTicket:", err)
	}

	log.Println("SupportTicket table created successfully!")
}
