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

	// Add role column to users table
	migrationSQL := `
	ALTER TABLE users 
	ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'staff';
	`

	if err := db.Exec(migrationSQL).Error; err != nil {
		log.Fatalf("Failed to run migration: %v", err)
	}

	fmt.Println("Migration completed successfully!")
}
