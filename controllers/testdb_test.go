package controllers

// Test database guard.
//
// Database tests NEVER use the application's database settings (DB_* or the
// .env file). They connect only to a separate PostgreSQL database given by:
//
//	TEST_DB_NAME      required; must contain "test" (e.g. fintrack_test)
//	TEST_DB_HOST      default localhost
//	TEST_DB_PORT      default 5432
//	TEST_DB_USER      default postgres
//	TEST_DB_PASSWORD
//
// Rules:
//   - TEST_DB_NAME not set      -> database tests are skipped with a message.
//   - name without "test", or the same name as the application database in
//     DB_NAME / ../.env        -> the test FAILS and nothing connects.
//   - test database unreachable -> the test FAILS with a clear error; there is
//     no fallback to any other database.
//
// Example (PowerShell):
//
//	createdb -U postgres fintrack_test
//	$env:TEST_DB_NAME="fintrack_test"; $env:TEST_DB_PASSWORD="..."; go test ./controllers/

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"

	"awesomeProject/config"
	"awesomeProject/models"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	testDBOnce sync.Once
	testDBErr  error
)

// productionDBNames returns the application database names that tests must
// never use: DB_NAME from the environment and from ../.env (read, not loaded).
func productionDBNames() []string {
	names := []string{}
	if v := strings.TrimSpace(os.Getenv("DB_NAME")); v != "" {
		names = append(names, v)
	}
	if env, err := godotenv.Read("../.env"); err == nil {
		if v := strings.TrimSpace(env["DB_NAME"]); v != "" {
			names = append(names, v)
		}
	}
	return names
}

// validateTestDBName rejects any database that is not clearly a test database.
func validateTestDBName(name string, production []string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("TEST_DB_NAME is empty")
	}
	if !strings.Contains(strings.ToLower(name), "test") {
		return fmt.Errorf("refusing to use database %q for tests: TEST_DB_NAME must contain \"test\"", name)
	}
	for _, p := range production {
		if strings.EqualFold(name, p) {
			return fmt.Errorf("refusing to use database %q for tests: it is the application database (DB_NAME)", name)
		}
	}
	return nil
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

// requireTestDB points config.DB at the separate test database (migrated once)
// or skips / fails the test as described above.
func requireTestDB(t *testing.T) {
	t.Helper()
	name := strings.TrimSpace(os.Getenv("TEST_DB_NAME"))
	if name == "" {
		t.Skip("database tests skipped: set TEST_DB_NAME (and TEST_DB_*) to a separate PostgreSQL test database")
	}
	if err := validateTestDBName(name, productionDBNames()); err != nil {
		t.Fatal(err)
	}

	testDBOnce.Do(func() {
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
			envOr("TEST_DB_HOST", "localhost"), envOr("TEST_DB_USER", "postgres"),
			os.Getenv("TEST_DB_PASSWORD"), name, envOr("TEST_DB_PORT", "5432"))
		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
		if err == nil {
			var sqlDB interface{ Ping() error }
			if sqlDB, err = db.DB(); err == nil {
				err = sqlDB.Ping()
			}
		}
		if err != nil {
			testDBErr = fmt.Errorf("test database %q is not reachable (no fallback to the application database): %w", name, err)
			return
		}
		config.DB = db
		config.RunMigrations()
	})
	if testDBErr != nil {
		t.Fatal(testDBErr)
	}
}

// newTestCompany creates an isolated company for one test and hard-deletes
// every row created under it when the test finishes.
func newTestCompany(t *testing.T, name string) uuid.UUID {
	t.Helper()
	company := models.Company{Name: name + " " + uuid.NewString()[:8], Email: uuid.NewString()[:8] + "@test.local"}
	if err := config.DB.Create(&company).Error; err != nil {
		t.Fatalf("create test company: %v", err)
	}
	t.Cleanup(func() {
		id := company.ID
		// A fresh session per statement: reusing one chained *gorm.DB would
		// carry conditions from one delete into the next.
		for _, m := range []interface{}{
			&models.Payment{}, &models.Invoice{}, &models.BillRecord{}, &models.ConnectionLog{},
			&models.ConnectionStatusChange{}, &models.Connection{}, &models.Area{},
		} {
			config.DB.Unscoped().Where("company_id = ?", id).Delete(m)
		}
		config.DB.Unscoped().Where("id = ?", id).Delete(&models.Company{})
	})
	return company.ID
}

// TestValidateTestDBName: the guard that keeps tests off the real database.
// Runs without any database.
func TestValidateTestDBName(t *testing.T) {
	cases := []struct {
		name       string
		production []string
		ok         bool
	}{
		{"fintrack_test", []string{"db3"}, true},
		{"billtest", nil, true},
		{"db3", []string{"db3"}, false},             // the real database
		{"DB3", []string{"db3"}, false},             // same name, other case
		{"db3_test", []string{"db3_test"}, false},   // production misnamed with "test"
		{"fintrack", []string{"db3"}, false},        // no "test" in the name
		{"", []string{"db3"}, false},                // nothing configured
		{"  ", nil, false},
	}
	for _, c := range cases {
		err := validateTestDBName(c.name, c.production)
		if (err == nil) != c.ok {
			t.Errorf("validateTestDBName(%q, %v) error = %v, want ok=%v", c.name, c.production, err, c.ok)
		}
	}
}

// TestRequireTestDBIgnoresAppDatabase: with only the application settings
// (DB_*) present and no TEST_DB_NAME, a database test is skipped and nothing
// connects - DB_NAME is never used as a fallback.
func TestRequireTestDBIgnoresAppDatabase(t *testing.T) {
	if os.Getenv("TEST_DB_NAME") != "" {
		t.Skip("only meaningful when TEST_DB_NAME is not set")
	}
	t.Setenv("DB_NAME", "db3")
	t.Setenv("DB_HOST", "localhost")
	before := config.DB
	ran := t.Run("inner", func(t *testing.T) {
		requireTestDB(t)
		t.Fatal("requireTestDB must skip without TEST_DB_NAME")
	})
	if !ran {
		// A skipped subtest reports true; false means it failed.
		t.Fatal("inner test failed")
	}
	if config.DB != before {
		t.Fatal("config.DB was changed without a test database")
	}
}
