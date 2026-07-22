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

	// Convert unit_type columns from enum to varchar
	log.Println("Converting unit_type columns from enum to varchar...")
	DB.Exec(`ALTER TABLE products ALTER COLUMN unit_type TYPE varchar(50)`)
	DB.Exec(`ALTER TABLE vendor_invoice_items ALTER COLUMN unit_type TYPE varchar(50)`)
	log.Println("unit_type columns converted")

	// Drop FK constraints that were removed from models
	log.Println("Dropping removed FK constraints...")
	DB.Exec(`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_subscriber`)
	DB.Exec(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_subscriber`)
	DB.Exec(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_invoice`)
	DB.Exec(`ALTER TABLE invoices ALTER COLUMN subscriber_id DROP NOT NULL`)
	DB.Exec(`ALTER TABLE payments ALTER COLUMN subscriber_id DROP NOT NULL`)
	DB.Exec(`ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL`)
	log.Println("FK constraints dropped")

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
		&models.Brand{},
		&models.UnitType{},
		&models.ProductType{},
		&models.InventoryStatus{},
		&models.Purchase{},
		&models.PurchaseItem{},
		&models.DistributionBox{},
		&models.Connection{},
		&models.ConnectionStatusChange{},
		&models.TransactionType{},
		&models.BillRecord{},
	)

	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	log.Println("Migration completed successfully")

	// Fix unique indexes: drop global unique indexes on purchase_number and
	// invoice_number, then create composite (company_id, ...) unique indexes.
	// This allows different companies to have the same purchase/invoice numbers.
	DB.Exec("DROP INDEX IF EXISTS uniq_purchase_company")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_company_number ON purchases (company_id, purchase_number) WHERE deleted_at IS NULL")

	DB.Exec("DROP INDEX IF EXISTS uniq_vendor_invoice_company")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_invoice_company_number ON vendor_invoices (company_id, invoice_number) WHERE deleted_at IS NULL")

	// Backfill connection status change log:
	// 1) Initial creation record for every connection
	// 2) Last status change for connections currently non-active (approximated via updated_at)
	log.Println("Backfilling connection status changes...")
	DB.Exec(`
		INSERT INTO connection_status_changes (id, connection_id, company_id, old_status, new_status, changed_at)
		SELECT gen_random_uuid(), c.id, c.company_id, NULL, 'active', c.created_at
		FROM connections c
		LEFT JOIN connection_status_changes csc ON csc.connection_id = c.id AND csc.old_status IS NULL
		WHERE csc.id IS NULL AND c.deleted_at IS NULL
	`)
	DB.Exec(`
		INSERT INTO connection_status_changes (id, connection_id, company_id, old_status, new_status, changed_at)
		SELECT gen_random_uuid(), c.id, c.company_id, 'active', c.status, c.updated_at
		FROM connections c
		WHERE c.deleted_at IS NULL AND c.status != 'active'
		AND NOT EXISTS (
			SELECT 1 FROM connection_status_changes csc
			WHERE csc.connection_id = c.id AND csc.old_status = 'active' AND csc.new_status != 'active'
		)
	`)
	log.Println("✓ Connection status changes backfilled")

	// Create trigger to log status changes on connections table
	log.Println("Creating connection status change trigger...")
	DB.Exec(`
		CREATE OR REPLACE FUNCTION log_connection_status_change()
		RETURNS TRIGGER AS $$
		BEGIN
			IF TG_OP = 'INSERT' THEN
				INSERT INTO connection_status_changes (id, connection_id, company_id, old_status, new_status, changed_at)
				VALUES (gen_random_uuid(), NEW.id, NEW.company_id, NULL, NEW.status, NOW());
			ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
				INSERT INTO connection_status_changes (id, connection_id, company_id, old_status, new_status, changed_at)
				VALUES (gen_random_uuid(), NEW.id, NEW.company_id, OLD.status, NEW.status, NOW());
			END IF;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`)
	DB.Exec(`
		DROP TRIGGER IF EXISTS trg_connection_status_change ON connections;
	`)
	DB.Exec(`
		CREATE TRIGGER trg_connection_status_change
		AFTER INSERT OR UPDATE OF status ON connections
		FOR EACH ROW
		EXECUTE FUNCTION log_connection_status_change();
	`)
	log.Println("✓ Connection status change trigger created")

	// Package number unique per company
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_package_company_number ON packages (company_id, package_number) WHERE deleted_at IS NULL")

	// Seed initial data
	seedInitialData()
}

func seedInitialData() {
	log.Println("Seeding initial data...")

	// Seed unit types
	var unitTypeCount int64
	DB.Model(&models.UnitType{}).Count(&unitTypeCount)
	if unitTypeCount == 0 {
		unitTypes := []models.UnitType{
			{Name: "piece", Label: "Per Piece"},
			{Name: "meter", Label: "Per Meter"},
			{Name: "kilogram", Label: "Per Kilogram"},
			{Name: "liter", Label: "Per Liter"},
		}
		for _, ut := range unitTypes {
			DB.Where("name = ?", ut.Name).FirstOrCreate(&ut)
		}
		log.Println("✓ Unit types seeded")
	}

	// Seed inventory statuses
	var statusCount int64
	DB.Model(&models.InventoryStatus{}).Count(&statusCount)
	if statusCount == 0 {
		statuses := []models.InventoryStatus{
			{Name: "in_stock", Label: "In Stock", Color: "#22c55e", Description: "Item is available in stock"},

			{Name: "assigned", Label: "Assigned", Color: "#3b82f6", Description: "Item assigned to a subscriber"},
			{Name: "damaged", Label: "Damaged", Color: "#ef4444", Description: "Item is damaged or defective"},
			{Name: "returned", Label: "Returned", Color: "#f59e0b", Description: "Item has been returned"},
		}
		for _, s := range statuses {
			DB.Where("name = ?", s.Name).FirstOrCreate(&s)
		}
		log.Println("✓ Inventory statuses seeded")
	}

	log.Println("Initial data seeding completed")
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
