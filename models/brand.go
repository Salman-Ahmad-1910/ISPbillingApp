package models

import "github.com/google/uuid"

// Brand - Product brands/manufacturers
type Brand struct {
	TenantModel
	// company_id is part of the composite unique key so the same brand name can
	// exist in different companies, but stays unique within a company.
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_brands_company_name,priority:1" json:"companyId"`
	Name        string    `gorm:"type:varchar(255);not null;uniqueIndex:idx_brands_company_name,priority:2" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
}
