package main

import (
	"log"

	"awesomeProject/config"
	"awesomeProject/models"
)

// Fix user roles to match their company roles
func main() {
	// Initialize database
	if err := config.DB.AutoMigrate(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	log.Println("Starting user role synchronization...")

	// Get all users with their company relationships
	var users []models.User
	if err := config.DB.Preload("UserCompanies").Find(&users).Error; err != nil {
		log.Fatal("Failed to fetch users:", err)
	}

	updatedCount := 0
	for _, user := range users {
		if len(user.UserCompanies) > 0 {
			// Get the first company role (in multi-tenant, users might have multiple roles)
			companyRole := user.UserCompanies[0].UserRole

			// Update user role to match company role
			if user.Role != companyRole {
				log.Printf("Updating user %s (ID: %s): role '%s' -> '%s'",
					user.Email, user.ID, user.Role, companyRole)

				if err := config.DB.Model(&user).Update("role", companyRole).Error; err != nil {
					log.Printf("Failed to update user %s: %v", user.Email, err)
					continue
				}
				updatedCount++
			} else {
				log.Printf("User %s (ID: %s) already has correct role: %s",
					user.Email, user.ID, user.Role)
			}
		} else {
			log.Printf("User %s (ID: %s) has no company relationships",
				user.Email, user.ID)
		}
	}

	log.Printf("Role synchronization completed. Updated %d users.", updatedCount)

	// Verify the changes
	log.Println("\nVerifying user roles...")
	var verifiedUsers []models.User
	if err := config.DB.Preload("UserCompanies").Find(&verifiedUsers).Error; err != nil {
		log.Fatal("Failed to verify users:", err)
	}

	mismatchCount := 0
	for _, user := range verifiedUsers {
		if len(user.UserCompanies) > 0 {
			companyRole := user.UserCompanies[0].UserRole
			if user.Role != companyRole {
				mismatchCount++
				log.Printf("MISMATCH: User %s has role '%s' but company role '%s'",
					user.Email, user.Role, companyRole)
			}
		}
	}

	if mismatchCount == 0 {
		log.Println("✅ All user roles are now synchronized with company roles!")
	} else {
		log.Printf("❌ Found %d users with role mismatches", mismatchCount)
	}
}
