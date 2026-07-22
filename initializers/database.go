package initializers

import (
	"awesomeProject/models"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := os.Getenv("DB_URL")
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to DB:", err)
		return
	}

	log.Println("Database connection established")

	err = DB.AutoMigrate(&models.User{})
	if err != nil {
		log.Fatal("Failed to migrate DB:", err)
		return
	}

	// Test SupportTicket migration early
	log.Println("Attempting to migrate SupportTicket table (early test)...")
	err = DB.AutoMigrate(&models.SupportTicket{})
	if err != nil {
		log.Fatal("Failed to migrate SupportTicket DB:", err)
		return
	}
	log.Println("SupportTicket table migrated successfully (early test)!")

	err = DB.AutoMigrate(&models.Customer{})
	if err != nil {
		log.Fatal("Failed to migrate Customer DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Expense{})
	if err != nil {
		log.Fatal("Failed to migrate Expense DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.LedgerEntry{})
	if err != nil {
		log.Fatal("Failed to migrate LedgerEntry DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Subscriber{})
	if err != nil {
		log.Fatal("Failed to migrate Subscriber DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Package{})
	if err != nil {
		log.Fatal("Failed to migrate Package DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Invoice{})
	if err != nil {
		log.Fatal("Failed to migrate Invoice DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.CustomBill{})
	if err != nil {
		log.Fatal("Failed to migrate CustomBill DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Area{})
	if err != nil {
		log.Fatal("Failed to migrate Area DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.OLT{})
	if err != nil {
		log.Fatal("Failed to migrate OLT DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Splitter{})
	if err != nil {
		log.Fatal("Failed to migrate Splitter DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.POP{})
	if err != nil {
		log.Fatal("Failed to migrate POP DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.UserCompany{})
	if err != nil {
		log.Fatal("Failed to migrate UserCompany DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Guarantor{})
	if err != nil {
		log.Fatal("Failed to migrate Guarantor DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Product{})
	if err != nil {
		log.Fatal("Failed to migrate Product DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.PricingPlan{})
	if err != nil {
		log.Fatal("Failed to migrate PricingPlan DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.InstallmentPlan{})
	if err != nil {
		log.Fatal("Failed to migrate InstallmentPlan DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.InventoryItem{})
	if err != nil {
		log.Fatal("Failed to migrate InventoryItem DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Complaint{})
	if err != nil {
		log.Fatal("Failed to migrate Complaint DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Staff{})
	if err != nil {
		log.Fatal("Failed to migrate Staff DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Attendance{})
	if err != nil {
		log.Fatal("Failed to migrate Attendance DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.AdvanceLoan{})
	if err != nil {
		log.Fatal("Failed to migrate AdvanceLoan DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.RecoveryTransaction{})
	if err != nil {
		log.Fatal("Failed to migrate RecoveryTransaction DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.AlertTemplate{})
	if err != nil {
		log.Fatal("Failed to migrate AlertTemplate DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.SystemConfig{})
	if err != nil {
		log.Fatal("Failed to migrate SystemConfig DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Inquiry{})
	if err != nil {
		log.Fatal("Failed to migrate Inquiry DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.Dealer{})
	if err != nil {
		log.Fatal("Failed to migrate Dealer DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.DealerFranchise{})
	if err != nil {
		log.Fatal("Failed to migrate DealerFranchise DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.DealerCollection{})
	if err != nil {
		log.Fatal("Failed to migrate DealerCollection DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.CorporateCustomer{})
	if err != nil {
		log.Fatal("Failed to migrate CorporateCustomer DB:", err)
		return
	}

	err = DB.AutoMigrate(&models.SystemLog{})
	if err != nil {
		log.Fatal("Failed to migrate SystemLog DB:", err)
		return
	}

	// Message table for SMS/notification management
	log.Println("Attempting to migrate Message table...")
	err = DB.AutoMigrate(&models.Message{})
	if err != nil {
		log.Fatal("Failed to migrate Message DB:", err)
		return
	}
	log.Println("Message table migrated successfully!")

	// SupportTicket migration moved to the end
	log.Println("Attempting to migrate SupportTicket table...")
	err = DB.AutoMigrate(&models.SupportTicket{})
	if err != nil {
		log.Fatal("Failed to migrate SupportTicket DB:", err)
		return
	}
	log.Println("SupportTicket table migrated successfully!")

}
