package models

import "github.com/google/uuid"

// ProductType - Category/type of product (e.g. Router, ONT, Cable, Accessory)
type ProductType struct {
	TenantModel
	// company_id is part of the composite unique key so the same product-type
	// name can exist in different companies, but stays unique within a company.
	CompanyID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_product_types_company_name,priority:1" json:"companyId"`
	Name      string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_product_types_company_name,priority:2" json:"name"`
}
