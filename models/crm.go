package models

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

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
// BeforeCreate hook to auto-generate product code
func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ProductCode == "" {
		var maxNum int
		tx.Unscoped().Model(&Product{}).
			Where("company_id = ? AND product_code LIKE ?", p.CompanyID, "P-%").
			Select("COALESCE(MAX(CAST(SUBSTRING(product_code FROM '\\d+$') AS INTEGER)), 0)").
			Scan(&maxNum)
		p.ProductCode = fmt.Sprintf("P-%03d", maxNum+1)
	}
	return nil
}

type Product struct {
	TenantModel
	ProductCode         string  `gorm:"type:varchar(50);uniqueIndex" json:"productCode"`
	Name               string  `gorm:"type:varchar(255);not null" json:"name"`
	Category           string  `gorm:"type:varchar(100);not null" json:"category"`
	Price              float64 `gorm:"type:decimal(10,2);not null" json:"price"`
	Stock              int     `gorm:"not null;default:0" json:"stock"`
	UnitType           string  `gorm:"type:varchar(50);not null;default:'piece'" json:"unitType"`
	TaxPercent         float64 `gorm:"type:decimal(5,2);not null;default:0" json:"taxPercent"`
	Image              string  `gorm:"type:varchar(255)" json:"image"`
	SalePrice float64 `gorm:"type:decimal(10,2);not null;default:0" json:"salePrice"`
	PurchasePrice      float64 `gorm:"type:decimal(10,2);not null;default:0" json:"purchasePrice"`
	Discount           float64 `gorm:"type:decimal(10,2);not null;default:0" json:"discount"`
	BrandID            string  `gorm:"type:varchar(100)" json:"brandId"`
	BrandName          string  `gorm:"type:varchar(255)" json:"brandName"`
	ProductTypeID      string  `gorm:"type:varchar(100)" json:"productTypeId"`
	ProductTypeName    string  `gorm:"type:varchar(255)" json:"productTypeName"`
	SerialNumber       string  `gorm:"type:varchar(255)" json:"serialNumber"`
	CurrentSerialIndex int     `gorm:"not null;default:0" json:"currentSerialIndex"`
}

func (p *Product) ParseSerialNumbers() []string {
	if p.SerialNumber == "" {
		return nil
	}
	parts := strings.FieldsFunc(p.SerialNumber, func(r rune) bool {
		return r == ',' || r == ' '
	})
	var result []string
	for _, s := range parts {
		s = strings.TrimSpace(s)
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

func (p *Product) GetCurrentSerialNumber() string {
	sns := p.ParseSerialNumbers()
	if len(sns) == 0 {
		return p.SerialNumber
	}
	if p.CurrentSerialIndex >= 0 && p.CurrentSerialIndex < len(sns) {
		return sns[p.CurrentSerialIndex]
	}
	return sns[0]
}

func (p *Product) AdvanceSerialNumber() string {
	sns := p.ParseSerialNumbers()
	if len(sns) == 0 {
		return p.SerialNumber
	}
	current := p.GetCurrentSerialNumber()
	if p.CurrentSerialIndex < len(sns)-1 {
		p.CurrentSerialIndex++
	}
	return current
}

// SerialNumberPool - Pool of serial numbers to be auto-assigned to products
type SerialNumberPool struct {
	TenantModel
	SerialNumber string `gorm:"type:varchar(255);not null;index" json:"serialNumber"`
	Status       string `gorm:"type:varchar(50);not null;default:'available'" json:"status"` // available | used
	ProductID    string `gorm:"type:varchar(100)" json:"productId"`
}

// InstallmentPlan - Defined schedule for physical goods
type InstallmentPlan struct {
	TenantModel
	Name               string  `gorm:"type:varchar(255);not null" json:"name"`
	Installments       int     `gorm:"not null" json:"installments"`
	PercentageIncrease float64 `gorm:"type:decimal(5,2);not null;default:0" json:"percentageIncrease"`
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
	SubscriberID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName  string     `gorm:"type:varchar(255)" json:"subscriberName"`
	TotalAmount     float64    `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
	TaxAmount       float64    `gorm:"type:decimal(10,2);not null" json:"taxAmount"`
	PaymentMethod   string     `gorm:"type:varchar(50);not null" json:"paymentMethod"`
	Date            string     `gorm:"type:varchar(50);not null" json:"date"`
	IsInstallment   bool       `gorm:"default:false" json:"isInstallment"`
	Status          string     `gorm:"type:varchar(20);default:'completed'" json:"status"`
	Discount        float64    `gorm:"type:decimal(10,2);default:0" json:"discount"`
	Items           []SaleItem `gorm:"foreignKey:SaleID;constraint:OnDelete:CASCADE" json:"items"`
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
	SerialNumber string  `gorm:"type:text" json:"serialNumber"`
}

// SubscriberInstallment tracks an installment agreement for a subscriber on a sale.
type SubscriberInstallment struct {
	TenantModel
	SaleID             uuid.UUID `gorm:"type:uuid;not null;index" json:"saleId"`
	SubscriberID       uuid.UUID `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName     string    `gorm:"type:varchar(255)" json:"subscriberName"`
	InstallmentPlanID  uuid.UUID `gorm:"type:uuid;not null;index" json:"installmentPlanId"`
	PlanName           string    `gorm:"type:varchar(255)" json:"planName"`
	TotalInstallments  int       `gorm:"not null" json:"totalInstallments"`
	PaidInstallments   int       `gorm:"not null;default:0" json:"paidInstallments"`
	InstallmentAmount  float64   `gorm:"type:decimal(10,2);not null" json:"installmentAmount"`
	TotalAmount        float64   `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
	NextInstallment    int       `gorm:"not null;default:1" json:"nextInstallment"`
	Status             string    `gorm:"type:varchar(20);default:'active'" json:"status"` // active, completed, defaulted
}
