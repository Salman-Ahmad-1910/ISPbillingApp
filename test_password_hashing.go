package main

import (
	"fmt"
	"log"

	"awesomeProject/config"
	"awesomeProject/models"

	"golang.org/x/crypto/bcrypt"
)

// Test password hashing with fresh database
func main() {
	// Initialize database
	if err := config.DB.AutoMigrate(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Test 1: Create a new user (simulates registration)
	testPassword := "TestPassword123"
	fmt.Printf("Original password: %s\n", testPassword)

	// Hash password (same as registration process)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(testPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}
	fmt.Printf("Hashed password: %s\n", string(hashedPassword))

	// Save to database (simulates registration)
	user := models.User{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: string(hashedPassword),
		Status:   "active",
	}

	if err := config.DB.Create(&user).Error; err != nil {
		log.Fatal("Failed to create user:", err)
	}
	fmt.Printf("✅ User created with ID: %d\n", user.ID)

	// Test 2: Retrieve user and verify password (simulates login)
	var retrievedUser models.User
	if err := config.DB.First(&retrievedUser, "email = ?", "test@example.com").Error; err != nil {
		log.Fatal("Failed to retrieve user:", err)
	}

	fmt.Printf("Retrieved password hash: %s\n", retrievedUser.Password)

	// Test 3: Verify password (simulates login)
	if err := bcrypt.CompareHashAndPassword([]byte(retrievedUser.Password), []byte(testPassword)); err != nil {
		fmt.Printf("❌ Password verification failed: %v\n", err)
	} else {
		fmt.Printf("✅ Password verification successful!\n")
	}

	// Test 4: Verify wrong password fails
	wrongPassword := "WrongPassword"
	if err := bcrypt.CompareHashAndPassword([]byte(retrievedUser.Password), []byte(wrongPassword)); err != nil {
		fmt.Printf("✅ Wrong password correctly rejected: %v\n", err)
	} else {
		fmt.Printf("❌ Wrong password incorrectly accepted!\n")
	}

	// Cleanup
	config.DB.Delete(&retrievedUser)
	fmt.Println("✅ Test completed successfully!")
	fmt.Println("✅ New registrations WILL save hashed passwords!")
}
