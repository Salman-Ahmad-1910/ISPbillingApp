package models

import "github.com/google/uuid"

// Customer - Specific to Installment / Product Sales Tracking
type Customer struct {
	TenantModel
	Name               string  `gorm:"type:varchar(255);not null" json:"name"`
	Cnic               string  `gorm:"type:varchar(20);not null" json:"cnic"`
	Phone              string  `gorm:"type:varchar(20);not null" json:"phone"`
	City               string  `gorm:"type:varchar(100);not null" json:"city"`
	Status             string  `gorm:"type:varchar(20);default:'active'" json:"status"` // active, inactive, blacklisted
	TotalInvoices      int     `gorm:"default:0" json:"totalInvoices"`
	OutstandingBalance float64 `gorm:"type:decimal(10,2);default:0" json:"outstandingBalance"`
}

// Guarantor - Vouched individual for a Customer Installment Plan
type Guarantor struct {
	TenantModel
	Name         string    `gorm:"type:varchar(255);not null" json:"name"`
	Cnic         string    `gorm:"type:varchar(20);not null" json:"cnic"`
	Phone        string    `gorm:"type:varchar(20);not null" json:"phone"`
	CustomerID   uuid.UUID `gorm:"type:uuid;not null;index" json:"customerId"`
	CustomerName string    `gorm:"type:varchar(255)" json:"customerName"`
}

// Product - Point of Sale items / General Items
type Product struct {
	TenantModel
	Name           string  `gorm:"type:varchar(255);not null" json:"name"`
	Category       string  `gorm:"type:varchar(100);not null" json:"category"`
	Price          float64 `gorm:"type:decimal(10,2);not null" json:"price"`
	Stock          int     `gorm:"not null;default:0" json:"stock"`
	UnitType       string  `gorm:"type:varchar(50);not null;default:'piece'" json:"unitType"`
	TaxPercent     float64 `gorm:"type:decimal(5,2);not null;default:0" json:"taxPercent"`
	Image          string  `gorm:"type:varchar(255)" json:"image"`
	Barcode        string  `gorm:"type:varchar(100)" json:"barcode"`
	SalePrice      float64 `gorm:"type:decimal(10,2);not null;default:0" json:"salePrice"`
	PurchasePrice  float64 `gorm:"type:decimal(10,2);not null;default:0" json:"purchasePrice"`
	Discount       float64 `gorm:"type:decimal(10,2);not null;default:0" json:"discount"`
	BrandID        string  `gorm:"type:varchar(100)" json:"brandId"`
	BrandName      string  `gorm:"type:varchar(255)" json:"brandName"`
	ProductTypeID  string  `gorm:"type:varchar(100)" json:"productTypeId"`
	ProductTypeName string `gorm:"type:varchar(255)" json:"productTypeName"`
}

// InstallmentPlan - Defined schedule for physical goods
type InstallmentPlan struct {
	TenantModel
	Name              string    `gorm:"type:varchar(255);not null" json:"name"`
	ProductID         uuid.UUID `gorm:"type:uuid;not null;index" json:"productId"`
	ProductName       string    `gorm:"type:varchar(255)" json:"productName"`
	DownPayment       float64   `gorm:"type:decimal(10,2);not null" json:"downPayment"`
	Installments      int       `gorm:"not null" json:"installments"`
	InstallmentAmount float64   `gorm:"type:decimal(10,2);not null" json:"installmentAmount"`
	TotalAmount       float64   `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
}

// PricingPlans (SaaS tier definition, different from package context, mainly root level)
type PricingPlan struct {
	TenantModel
	Name     string  `gorm:"type:varchar(100);not null" json:"name"`
	Price    float64 `gorm:"type:decimal(10,2);not null" json:"price"`
	Features string  `gorm:"type:text" json:"features"` // comma separated or JSON string
}

// Sale - Point of Sale Transaction
type Sale struct {
	TenantModel
	SubscriberID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string     `gorm:"type:varchar(255)" json:"subscriberName"`
	TotalAmount    float64    `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
	TaxAmount      float64    `gorm:"type:decimal(10,2);not null" json:"taxAmount"`
	PaymentMethod  string     `gorm:"type:varchar(50);not null" json:"paymentMethod"`
	Date           string     `gorm:"type:varchar(50);not null" json:"date"`
	Items          []SaleItem `gorm:"foreignKey:SaleID;constraint:OnDelete:CASCADE" json:"items"`
}

// SaleItem - Individual product in a Sale
type SaleItem struct {
	TenantModel
	SaleID      uuid.UUID `gorm:"type:uuid;not null;index" json:"saleId"`
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"productId"`
	ProductName string    `gorm:"type:varchar(255)" json:"productName"`
	Quantity    int       `gorm:"not null" json:"quantity"`
	Price       float64   `gorm:"type:decimal(10,2);not null" json:"price"`
	TaxPercent  float64   `gorm:"type:decimal(5,2);not null;default:0" json:"taxPercent"` // tax % applied to this line
	SaleTax     float64   `gorm:"type:decimal(10,2);default:0" json:"saleTax"`
	WthTax      float64   `gorm:"type:decimal(10,2);default:0" json:"wthTax"`
}
