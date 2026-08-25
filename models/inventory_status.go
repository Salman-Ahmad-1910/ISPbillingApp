package models

import "github.com/google/uuid"

// InventoryStatus - Status values for inventory items (e.g. in_stock, assigned, damaged, returned)
type InventoryStatus struct {
	TenantModel
	// company_id is part of the composite unique key so the same status name can
	// exist in different companies, but stays unique within a company.
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_inventory_statuses_company_name,priority:1" json:"companyId"`
	Name        string    `gorm:"type:varchar(50);not null;uniqueIndex:idx_inventory_statuses_company_name,priority:2" json:"name"`
	Label       string    `gorm:"type:varchar(100)" json:"label"`
	Color       string    `gorm:"type:varchar(20)" json:"color"`
	Description string    `gorm:"type:text" json:"description"`
}
