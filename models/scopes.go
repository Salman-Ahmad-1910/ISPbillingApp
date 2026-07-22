package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TenantScope is the global scope that forces queries to filter by CompanyID
func TenantScope(companyID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("company_id = ?", companyID)
	}
}
