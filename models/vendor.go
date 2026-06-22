package models

// Vendor - Supplier/Provider for inventory purchases
type Vendor struct {
	TenantModel
	Name          string `gorm:"type:varchar(255);not null" json:"name"`
	ContactPerson string `gorm:"type:varchar(255)" json:"contactPerson"`
	Phone         string `gorm:"type:varchar(20)" json:"phone"`
	Email         string `gorm:"type:varchar(255)" json:"email"`
	Address       string `gorm:"type:text" json:"address"`
}
