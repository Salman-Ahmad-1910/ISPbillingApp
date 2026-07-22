package models

type DistributionBox struct {
	TenantModel
	Name string `gorm:"type:varchar(255);not null;uniqueIndex:idx_box_name_company" json:"name"`
}
