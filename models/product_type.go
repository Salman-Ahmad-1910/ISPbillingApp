package models

// ProductType - Category/type of product (e.g. Router, ONT, Cable, Accessory)
type ProductType struct {
	TenantModel
	Name string `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
}
