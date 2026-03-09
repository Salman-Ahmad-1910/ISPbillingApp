package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel provides UUID and timestamps for all models
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TenantModel adds CompanyID to support multi-tenancy
type TenantModel struct {
	BaseModel
	CompanyID uuid.UUID `gorm:"type:uuid;index;not null" json:"companyId"`
}
