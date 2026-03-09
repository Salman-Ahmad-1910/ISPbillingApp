package main

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"fmt"
	"log"
)

func main() {
	// Load ENV
	config.ConnectDatabase()

	// Test subscriber relationships
	subscriberID := "e79605ae-2cd7-4082-8c2e-b2d4d1a26d5d"
	packageID := "7ca796a6-227b-4673-961a-b0cf1175830a"
	areaID := "f70d1f4f-70dc-4fd2-b43d-37662447dad4"
	companyID := "5b771a77-70dc-4d7b-a3e3-1161b018a7ab"

	fmt.Printf("Testing relationships for subscriber %s\n", subscriberID)

	// Check if subscriber exists
	var subscriber models.Subscriber
	if err := config.DB.Where("id = ?", subscriberID).First(&subscriber).Error; err != nil {
		log.Printf("Subscriber not found: %v", err)
		return
	}

	fmt.Printf("Subscriber found: %s\n", subscriber.Name)
	fmt.Printf("PackageID: %s\n", subscriber.PackageID)
	fmt.Printf("AreaID: %s\n", subscriber.AreaID)

	// Check if package exists
	var pkg models.Package
	if err := config.DB.Where("id = ? AND company_id = ?", packageID, companyID).First(&pkg).Error; err != nil {
		log.Printf("Package not found: %v", err)
	} else {
		fmt.Printf("Package found: %s\n", pkg.Name)
	}

	// Check if area exists
	var area models.Area
	if err := config.DB.Where("id = ? AND company_id = ?", areaID, companyID).First(&area).Error; err != nil {
		log.Printf("Area not found: %v", err)
	} else {
		fmt.Printf("Area found: %s, %s, %s\n", area.City, area.Zone, area.Locality)
	}

	// Test preload
	fmt.Println("\n--- Testing Preload ---")
	var subscribers []models.Subscriber
	if err := config.DB.Preload("Package").Preload("Area").Where("id = ?", subscriberID).Find(&subscribers).Error; err != nil {
		log.Printf("Error with preload: %v", err)
	} else {
		for _, sub := range subscribers {
			fmt.Printf("Preloaded Package ID: %s, Name: %s\n", sub.Package.ID, sub.Package.Name)
			fmt.Printf("Preloaded Area ID: %s, City: %s\n", sub.Area.ID, sub.Area.City)
		}
	}
}
