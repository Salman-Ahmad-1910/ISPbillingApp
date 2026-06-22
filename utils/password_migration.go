package utils

import (
	"fmt"
	"log"

	"awesomeProject/config"
	"awesomeProject/models"

	"golang.org/x/crypto/bcrypt"
)

// HashExistingPasswords migrates plain text passwords to bcrypt hashes
func HashExistingPasswords() error {
	log.Println("Starting password hashing migration...")

	// Get all users with plain text passwords
	var users []models.User
	if err := config.DB.Find(&users).Error; err != nil {
		return fmt.Errorf("failed to fetch users: %w", err)
	}

	migratedCount := 0
	for _, user := range users {
		// Check if password is already hashed (bcrypt hashes start with $2$)
		if len(user.Password) >= 60 && user.Password[:2] == "$2" {
			log.Printf("User %s (ID: %d) already has hashed password, skipping", user.Email, user.ID)
			continue
		}

		// Hash the plain text password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Failed to hash password for user %s (ID: %d): %v", user.Email, user.ID, err)
			continue
		}

		// Update user with hashed password
		if err := config.DB.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
			log.Printf("Failed to update password for user %s (ID: %d): %v", user.Email, user.ID, err)
			continue
		}

		migratedCount++
		log.Printf("Successfully hashed password for user %s (ID: %d)", user.Email, user.ID)
	}

	log.Printf("Password hashing migration completed. Migrated %d users.", migratedCount)
	return nil
}

// VerifyPasswordHashing checks if all passwords are properly hashed
func VerifyPasswordHashing() error {
	log.Println("Verifying password hashing...")

	var users []models.User
	if err := config.DB.Find(&users).Error; err != nil {
		return fmt.Errorf("failed to fetch users: %w", err)
	}

	unhashedCount := 0
	for _, user := range users {
		if len(user.Password) < 60 || user.Password[:2] != "$2" {
			unhashedCount++
			log.Printf("User %s (ID: %d) has unhashed password", user.Email, user.ID)
		}
	}

	if unhashedCount > 0 {
		return fmt.Errorf("found %d users with unhashed passwords", unhashedCount)
	}

	log.Println("All passwords are properly hashed!")
	return nil
}
