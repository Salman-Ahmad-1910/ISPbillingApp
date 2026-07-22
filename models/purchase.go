package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Purchase - Purchase order from vendors
type Purchase struct {
	TenantModel
	VendorID         uuid.UUID       `gorm:"type:uuid;not null;index" json:"vendorId"`
	VendorName       string          `gorm:"type:varchar(255)" json:"vendorName"`
	PurchaseNumber   string          `gorm:"type:varchar(100);not null" json:"purchaseNumber"`
	PurchaseDate     string          `gorm:"type:varchar(50);not null" json:"purchaseDate"`
	TotalAmount      float64         `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
	RemainingAmount  float64         `gorm:"type:decimal(10,2);default:0" json:"remainingAmount"`
	Discount         float64         `gorm:"type:decimal(10,2);default:0" json:"discount"`
	SalesTax         float64         `gorm:"type:decimal(10,2);default:0" json:"salesTax"`
	WthTax           float64         `gorm:"type:decimal(10,2);default:0" json:"wthTax"`
	BillId           string          `gorm:"type:varchar(100)" json:"billId"`
	Batch            string          `gorm:"type:varchar(100)" json:"batch"`
	Status           string          `gorm:"type:varchar(20);default:'pending'" json:"status"`
	Items            []PurchaseItem  `gorm:"foreignKey:PurchaseID;constraint:OnDelete:CASCADE" json:"items"`
}

// BeforeCreate hook to auto-generate purchase number
func (p *Purchase) BeforeCreate(tx *gorm.DB) error {
	if p.PurchaseNumber == "" {
		now := time.Now()
		dateStr := now.Format("0601")
		prefix := fmt.Sprintf("PUR-%s-", dateStr)

		var maxNum int
		tx.Unscoped().Model(&Purchase{}).
			Where("company_id = ? AND purchase_number LIKE ?", p.CompanyID, prefix+"%").
			Select("COALESCE(MAX(CAST(SUBSTRING(purchase_number FROM '\\d+$') AS INTEGER)), 0)").
			Scan(&maxNum)

		p.PurchaseNumber = fmt.Sprintf("PUR-%s-%04d", dateStr, maxNum+1)
	}
	return nil
}

// PurchaseItem - Individual items in a purchase order
type PurchaseItem struct {
	TenantModel
	PurchaseID    uuid.UUID `gorm:"type:uuid;not null;index" json:"purchaseId"`
	ProductID     uuid.UUID `gorm:"type:uuid;not null;index" json:"productId"`
	ProductName   string    `gorm:"type:varchar(255)" json:"productName"`
	Quantity      int       `gorm:"not null" json:"quantity"`
	PurchasePrice float64   `gorm:"type:decimal(10,2);not null;default:0" json:"purchasePrice"`
	SellingPrice  float64   `gorm:"type:decimal(10,2);not null;default:0" json:"sellingPrice"`
	UnitPrice     float64   `gorm:"type:decimal(10,2);not null;default:0" json:"-"` // legacy column
	UnitType      string    `gorm:"type:varchar(50);not null" json:"unitType"`
	FocNormal     string    `gorm:"type:varchar(20);default:'normal'" json:"focNormal"`
	Subtotal      float64   `gorm:"type:decimal(10,2);not null" json:"subtotal"`
	SaleTax       float64   `gorm:"type:decimal(10,2);default:0" json:"saleTax"`
	WthTax        float64   `gorm:"type:decimal(10,2);default:0" json:"wthTax"`
	Disc          float64   `gorm:"type:decimal(10,2);default:0" json:"disc"`
	ExpiryDate    string    `gorm:"type:varchar(50)" json:"expiryDate"`
	SerialNumber  string    `gorm:"type:text" json:"serialNumber"`
}

// PurchasedProduct - Product info derived entirely from purchase_items.
// POS page reads from this so it only shows products that were actually purchased.
type PurchasedProduct struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Price        float64 `json:"price"`
	Stock        int     `json:"stock"`
	UnitType     string  `json:"unitType"`
	TaxPercent   float64 `json:"taxPercent"`
	PurchasePrice float64 `json:"purchasePrice"`
}
