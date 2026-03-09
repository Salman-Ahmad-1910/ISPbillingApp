package models

import "github.com/google/uuid"

// Package billing specifics
type Package struct {
	TenantModel
	Name      string  `gorm:"type:varchar(100);not null" json:"name"`
	Speed     string  `gorm:"type:varchar(50);not null" json:"speed"`
	Price     float64 `gorm:"type:decimal(10,2);not null" json:"price"`
	DataLimit string  `gorm:"type:varchar(50);not null" json:"dataLimit"`
}

// Subscriber is the main entity linked geographically and technically
type Subscriber struct {
	TenantModel
	Name                string `gorm:"type:varchar(255);not null" json:"name"`
	Cnic                string `gorm:"type:varchar(20);not null" json:"cnic"`
	Phone               string `gorm:"type:varchar(20);not null" json:"phone"`
	InstallationAddress string `gorm:"type:text;not null" json:"installationAddress"`

	PackageID   uuid.UUID `gorm:"type:uuid;not null;index" json:"packageId"`
	PackageName string    `gorm:"type:varchar(100)" json:"packageName"`

	// Billing
	BillingCycle string  `gorm:"type:varchar(20);not null" json:"billingCycle"`
	Status       string  `gorm:"type:varchar(20);not null;default:'active'" json:"status"`
	Balance      float64 `gorm:"type:decimal(10,2);default:0" json:"balance"`

	// Network mapping
	AreaID   uuid.UUID `gorm:"type:uuid;not null;index" json:"areaId"`
	AreaName string    `gorm:"type:varchar(255)" json:"areaName"`

	// Enforcing specific port per splitter via composite unique index
	SplitterID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_splitter_port" json:"splitterId"`
	SplitterPort int       `gorm:"not null;uniqueIndex:idx_splitter_port" json:"splitterPort"`

	ConnectionDate string `gorm:"type:varchar(50)" json:"connectionDate"`

	// External ties
	DealerID    *uuid.UUID `gorm:"type:uuid" json:"dealerId"`
	CollectorID *uuid.UUID `gorm:"type:uuid" json:"collectorId"`

	// Relationships
	Package  Package  `gorm:"foreignKey:PackageID" json:"package"`
	Area     Area     `gorm:"foreignKey:AreaID" json:"area"`
	Splitter Splitter `gorm:"foreignKey:SplitterID" json:"splitter"`
}

// Inquiry handling pre-sales
type Inquiry struct {
	TenantModel
	Name         string     `gorm:"type:varchar(255);not null" json:"name"`
	Phone        string     `gorm:"type:varchar(20);not null" json:"phone"`
	Address      string     `gorm:"type:text;not null" json:"address"`
	Status       string     `gorm:"type:varchar(20);default:'new'" json:"status"`
	AssignedToID *uuid.UUID `gorm:"type:uuid" json:"assignedToId"`
	Notes        string     `gorm:"type:text" json:"notes"`
	CreatedAt    string     `gorm:"type:varchar(50)" json:"createdAt"`
}

// CorporateCustomer specialized billing
type CorporateCustomer struct {
	TenantModel
	CompanyName       string `gorm:"type:varchar(255);not null" json:"companyName"`
	ContactPerson     string `gorm:"type:varchar(255);not null" json:"contactPerson"`
	ContactPhone      string `gorm:"type:varchar(20);not null" json:"contactPhone"`
	NegotiatedPricing string `gorm:"type:text" json:"negotiatedPricing"`
	ContractStartDate string `gorm:"type:varchar(50);not null" json:"contractStartDate"`
	ContractEndDate   string `gorm:"type:varchar(50);not null" json:"contractEndDate"`
	TotalConnections  int    `gorm:"not null" json:"totalConnections"`
}
