package migrations

import (
	"log"

	"awesomeProject/config"
	"awesomeProject/models"
)

func RunMigrations() {
	log.Println("Running AutoMigration...")

	err := config.DB.AutoMigrate(
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
		&models.InstallmentPlan{},
		&models.PricingPlan{},
		&models.Sale{},
		&models.SaleItem{},
		&models.AlertTemplate{},
		&models.SystemConfig{},
		&models.SupportTicket{},
		&models.Purchase{},
		&models.PurchaseItem{},
	)

	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	// Partial unique index: only enforce uniqueness on non-empty serial numbers
	if err := config.DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_items_serial_number_unique
		ON purchase_items (serial_number)
		WHERE serial_number != ''
	`).Error; err != nil {
		log.Println("Warning: failed to create partial unique index on serial_number:", err)
	}

	log.Println("Migration completed successfully")
}
