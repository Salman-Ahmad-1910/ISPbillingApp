package models

import "github.com/google/uuid"

type DistributionBox struct {
	TenantModel
	// name is unique per company, not globally: two different companies may
	// independently use the same box name. company_id is part of the composite
	// unique key so a box name is only unique within its company.
	CompanyID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_box_name_company,priority:1" json:"companyId"`
	Name      string    `gorm:"type:varchar(255);not null;uniqueIndex:idx_box_name_company,priority:2" json:"name"`
}
