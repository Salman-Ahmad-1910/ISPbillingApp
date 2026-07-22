package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Package billing specifics
type Package struct {
	TenantModel
	PackageNumber int     `gorm:"not null;default:0" json:"packageNumber"`
	Name          string  `gorm:"type:varchar(100);not null" json:"name"`
	Speed         string  `gorm:"type:varchar(50)" json:"speed"`
	Price         float64 `gorm:"type:decimal(10,2);default:0" json:"price"`
	DataLimit     string  `gorm:"type:varchar(50)" json:"dataLimit"`
	CompanyName   string  `gorm:"type:varchar(255)" json:"companyName"`
	SalePrice     float64 `gorm:"type:decimal(10,2);default:0" json:"salePrice"`
	PurchasePrice float64 `gorm:"type:decimal(10,2);default:0" json:"purchasePrice"`
	PackageType   string  `gorm:"type:varchar(50);default:'Internet'" json:"packageType"`
}

// BeforeCreate hook to auto-increment PackageNumber per company
func (p *Package) BeforeCreate(tx *gorm.DB) error {
	var maxNumber int
	tx.Session(&gorm.Session{NewDB: true}).
		Model(&Package{}).
		Where("company_id = ?", p.CompanyID).
		Select("COALESCE(MAX(package_number), 0)").
		Scan(&maxNumber)
	p.PackageNumber = maxNumber + 1
	return nil
}

// Subscriber is the main entity linked geographically and technically
type Subscriber struct {
	TenantModel
	SubscriberIdentity  string `gorm:"type:varchar(100);uniqueIndex" json:"subscriber_identity"`
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
	Name               string     `gorm:"type:varchar(255);not null" json:"name"`
	InternetID         string     `gorm:"type:varchar(100)" json:"internetId"`
	Cell               string     `gorm:"type:varchar(20)" json:"cell"`
	Mobile             string     `gorm:"type:varchar(20)" json:"mobile"`
	Address            string     `gorm:"type:text;not null" json:"address"`
	InstallationAmount float64    `gorm:"type:decimal(10,2);default:0" json:"installationAmount"`
	OtherAmount        float64    `gorm:"type:decimal(10,2);default:0" json:"otherAmount"`
	InstallationDate   string     `gorm:"type:varchar(50)" json:"installationDate"`
	RechargeDate       string     `gorm:"type:varchar(50)" json:"rechargeDate"`
	SubLocality        string     `gorm:"type:varchar(100)" json:"subLocality"`
	ConnectionType     string     `gorm:"type:varchar(50)" json:"connectionType"`
	BoxNumber          string     `gorm:"type:varchar(50)" json:"boxNumber"`
	PackageCable       string     `gorm:"type:varchar(100)" json:"packageCable"`
	Discount           float64    `gorm:"type:decimal(10,2);default:0" json:"discount"`
	Amount             float64    `gorm:"type:decimal(10,2);default:0" json:"amount"`
	Comments           string     `gorm:"type:text" json:"comments"`
	Status             string     `gorm:"type:varchar(20);default:'new'" json:"status"`
	AssignedToID       *uuid.UUID `gorm:"type:uuid" json:"assignedToId"`
	Notes              string     `gorm:"type:text" json:"notes"`
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
