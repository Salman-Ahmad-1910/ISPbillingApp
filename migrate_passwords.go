package main

import (
	"log"

	"awesomeProject/config"
	"awesomeProject/utils"
)

func main() {
	// Initialize database connection
	if err := config.DB.AutoMigrate(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Run password hashing migration
	log.Println("Starting password security migration...")

	if err := utils.HashExistingPasswords(); err != nil {
		log.Fatal("Password hashing migration failed:", err)
	}

	// Verify all passwords are hashed
	if err := utils.VerifyPasswordHashing(); err != nil {
		log.Fatal("Password verification failed:", err)
	}

	log.Println("Password security migration completed successfully!")
	log.Println("All user passwords are now properly hashed with bcrypt.")
}
