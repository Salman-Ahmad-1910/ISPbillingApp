package main

import (
	"awesomeProject/config"
	"fmt"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Could not load .env file")
	}

	// Initialize database connection
	config.ConnectDatabase()
	db := config.DB

	// Add email and password columns to dealers table
	migrationSQL := `
	ALTER TABLE dealers 
	ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL DEFAULT '',
	ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT '';
	`

	if err := db.Exec(migrationSQL).Error; err != nil {
		log.Fatalf("Failed to run migration: %v", err)
	}

	fmt.Println("Migration completed successfully!")
}
