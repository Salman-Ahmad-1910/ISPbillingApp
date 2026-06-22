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

	// Create custom enum types manually before auto-migration
	createEnumTypes()

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

func createEnumTypes() {
	log.Println("Creating custom enum types...")

	// Create unit_type_enum type with better error handling
	enumSQL := `CREATE TYPE IF NOT EXISTS unit_type_enum AS ENUM ('piece', 'meter', 'kilogram', 'liter')`

	if err := DB.Exec(enumSQL).Error; err != nil {
		log.Printf("Warning: Failed to create unit_type_enum with IF NOT EXISTS: %v", err)
		// Try alternative approach
		altEnumSQL := `DO $$ BEGIN
			CREATE TYPE unit_type_enum AS ENUM ('piece', 'meter', 'kilogram', 'liter');
		EXCEPTION
			WHEN duplicate_object THEN NULL;
		END $$;`

		if err2 := DB.Exec(altEnumSQL).Error; err2 != nil {
			log.Printf("Error: Failed to create unit_type_enum with alternative approach: %v", err2)
		} else {
			log.Println("unit_type_enum created successfully (alternative approach)")
		}
	} else {
		log.Println("unit_type_enum created successfully")
	}

	// Create status_enum type
	statusEnumSQL := `CREATE TYPE IF NOT EXISTS status_enum AS ENUM ('active', 'inactive', 'pending', 'completed', 'cancelled')`

	if err := DB.Exec(statusEnumSQL).Error; err != nil {
		log.Printf("Warning: Failed to create status_enum with IF NOT EXISTS: %v", err)
		// Try alternative approach
		altStatusSQL := `DO $$ BEGIN
			CREATE TYPE status_enum AS ENUM ('active', 'inactive', 'pending', 'completed', 'cancelled');
		EXCEPTION
			WHEN duplicate_object THEN NULL;
		END $$;`

		if err2 := DB.Exec(altStatusSQL).Error; err2 != nil {
			log.Printf("Error: Failed to create status_enum with alternative approach: %v", err2)
		} else {
			log.Println("status_enum created successfully (alternative approach)")
		}
	} else {
		log.Println("status_enum created successfully")
	}

	// Create gender_enum type
	genderEnumSQL := `CREATE TYPE IF NOT EXISTS gender_enum AS ENUM ('male', 'female', 'other')`

	if err := DB.Exec(genderEnumSQL).Error; err != nil {
		log.Printf("Warning: Failed to create gender_enum with IF NOT EXISTS: %v", err)
		// Try alternative approach
		altGenderSQL := `DO $$ BEGIN
			CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
		EXCEPTION
			WHEN duplicate_object THEN NULL;
		END $$;`

		if err2 := DB.Exec(altGenderSQL).Error; err2 != nil {
			log.Printf("Error: Failed to create gender_enum with alternative approach: %v", err2)
		} else {
			log.Println("gender_enum created successfully (alternative approach)")
		}
	} else {
		log.Println("gender_enum created successfully")
	}

	// Verify enum types were created
	log.Println("Verifying enum types...")
	var enumExists bool

	// Check unit_type_enum
	DB.Raw("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_type_enum')").Scan(&enumExists)
	if enumExists {
		log.Println("✓ unit_type_enum exists")
	} else {
		log.Println("✗ unit_type_enum does not exist")
	}

	// Check status_enum
	DB.Raw("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum')").Scan(&enumExists)
	if enumExists {
		log.Println("✓ status_enum exists")
	} else {
		log.Println("✗ status_enum does not exist")
	}

	// Check gender_enum
	DB.Raw("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum')").Scan(&enumExists)
	if enumExists {
		log.Println("✓ gender_enum exists")
	} else {
		log.Println("✗ gender_enum does not exist")
	}
}
