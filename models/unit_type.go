package models

// UnitType - Units of measurement for products (e.g. piece, meter, kilogram, liter)
type UnitType struct {
	TenantModel
	Name  string `gorm:"type:varchar(50);not null;uniqueIndex" json:"name"`
	Label string `gorm:"type:varchar(100);not null" json:"label"`
}
