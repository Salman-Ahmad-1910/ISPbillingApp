package config

import (
	"awesomeProject/models"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = db
	log.Println("Database connection established")
}

func RunMigrations() {
	log.Println("Running AutoMigration...")

	err := DB.AutoMigrate(
		&models.Company{},
		&models.User{},
		&models.UserCompany{},
		&models.Role{},
		&models.Permission{},
		&models.RolePermission{},

		&models.Area{},
		&models.OLT{},
		&models.Splitter{},
		&models.POP{},

		&models.Package{},
		&models.Subscriber{},
		&models.Inquiry{},
		&models.CorporateCustomer{},

		&models.Invoice{},
		&models.Payment{},
		&models.CustomBill{},
		&models.LedgerEntry{},
		&models.Expense{},

		&models.DealerFranchise{},
		&models.Dealer{},
		&models.DealerCollection{},

		&models.Complaint{},
		&models.Staff{},
		&models.RecoveryOfficer{}, // Add Recovery Officer model
		&models.Attendance{},
		&models.AdvanceLoan{},
		&models.InventoryItem{},
		&models.RecoveryTransaction{},
		&models.SystemLog{},

		&models.Customer{},
		&models.Guarantor{},
		&models.Product{},
		&models.Vendor{},
		&models.VendorInvoice{},
		&models.VendorInvoiceItem{},
		&models.InstallmentPlan{},
		&models.PricingPlan{},
		&models.Sale{},
		&models.SaleItem{},
		&models.AlertTemplate{},
		&models.SystemConfig{},
		&models.SupportTicket{},
	)

	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	log.Println("Migration completed successfully")
}
