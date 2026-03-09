package main

import (
	"log"
	"os"

	"awesomeProject/cmd/seed"
	"awesomeProject/config"
	"awesomeProject/models"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize database
	config.InitDB()

	// Get company ID from command line argument or use a default one
	companyIDStr := os.Getenv("SEED_COMPANY_ID")
	var companyID uuid.UUID

	if companyIDStr == "" {
		// Use a default company ID for testing
		companyIDStr = "5b771a77-70dc-4d7b-a3e3-1161b018a7ab"
		log.Printf("Using default company ID: %s", companyIDStr)
	}

	var err error
	companyID, err = uuid.Parse(companyIDStr)
	if err != nil {
		log.Fatal("Invalid company ID:", err)
	}

	// Check if company exists
	var company models.Company
	if err := config.DB.Where("id = ?", companyID).First(&company).Error; err != nil {
		log.Printf("Company not found, creating new company with ID: %s", companyID)
		company = models.Company{
			TenantModel: models.TenantModel{ID: companyID},
			Name:        "Test Company",
			Email:       "test@example.com",
			Phone:       "+1234567890",
			Address:     "Test Address",
		}
		if err := config.DB.Create(&company).Error; err != nil {
			log.Fatal("Failed to create company:", err)
		}
	}

	// Seed alert templates
	seed.SeedAlertTemplates(companyID)

	log.Println("Seeding completed successfully!")
}
