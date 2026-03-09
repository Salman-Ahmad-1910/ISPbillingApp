package main

import (
	"fmt"
	"log"
	"your-project-path/initializers"
)

func main() {
	// Initialize database connection
	initializers.ConnectToDB()

	// Run the migration
	err := initializers.DB.Exec("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT").Error
	if err != nil {
		log.Fatal("Failed to add description column:", err)
	} else {
		fmt.Println("Successfully added description column to invoices table")
	}
}
