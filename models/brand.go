package models

// Brand - Product brands/manufacturers
type Brand struct {
	TenantModel
	Name        string `gorm:"type:varchar(255);not null;uniqueIndex" json:"name"`
	Description string `gorm:"type:text" json:"description"`
}
