package models

// InventoryStatus - Status values for inventory items (e.g. in_stock, assigned, damaged, returned)
type InventoryStatus struct {
	TenantModel
	Name        string `gorm:"type:varchar(50);not null;uniqueIndex" json:"name"`
	Label       string `gorm:"type:varchar(100)" json:"label"`
	Color       string `gorm:"type:varchar(20)" json:"color"`
	Description string `gorm:"type:text" json:"description"`
}
