package models

import "github.com/google/uuid"

// UnitType - Units of measurement for products (e.g. piece, meter, kilogram, liter)
type UnitType struct {
	TenantModel
	// company_id is part of the composite unique key so the same unit-type name
	// can exist in different companies, but stays unique within a company.
	CompanyID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_unit_types_company_name,priority:1" json:"companyId"`
	Name      string    `gorm:"type:varchar(50);not null;uniqueIndex:idx_unit_types_company_name,priority:2" json:"name"`
	Label     string    `gorm:"type:varchar(100); not null" json:"label"`
}
