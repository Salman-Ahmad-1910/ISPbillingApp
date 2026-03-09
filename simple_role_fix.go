package main

import (
	"log"

	"awesomeProject/config"
	"awesomeProject/models"

	"github.com/google/uuid"
)

// Simple role fix using existing database connection
func main() {
	// Use existing database connection
	config.ConnectDatabase()

	log.Println("Starting simple role synchronization...")

	// User ID from your debug output
	userID := uuid.MustParse("fec90801-109f-41fa-a78b-fb5d313ff01e")

	log.Printf("Updating user %s to have admin role in both tables", userID)

	// Update users table
	if err := config.DB.Model(&models.User{}).Where("id = ?", userID).Update("role", "admin").Error; err != nil {
		log.Printf("Failed to update users table: %v", err)
	} else {
		log.Println("✅ Updated users table role to 'admin'")
	}

	// Update user_companies table (should already be admin)
	if err := config.DB.Model(&models.UserCompany{}).Where("user_id = ?", userID).Update("role_in_company", "admin").Error; err != nil {
		log.Printf("Failed to update user_companies table: %v", err)
	} else {
		log.Println("✅ Updated user_companies table role to 'admin'")
	}

	// Verify the changes
	var user models.User
	if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
		log.Printf("Failed to fetch updated user: %v", err)
	} else {
		log.Printf("✅ User role in users table: %s", user.Role)
	}

	var userCompany models.UserCompany
	if err := config.DB.Where("user_id = ?", userID).First(&userCompany).Error; err != nil {
		log.Printf("Failed to fetch user company: %v", err)
	} else {
		log.Printf("✅ User role in user_companies table: %s", userCompany.UserRole)
	}

	log.Println("🎉 Role fix completed! User should now have admin access.")
}
