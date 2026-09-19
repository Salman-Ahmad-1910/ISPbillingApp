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
	QuantityEntered int     `gorm:"not null;default:0" json:"quantityEntered"`
	PurchasePrice float64   `gorm:"type:decimal(10,2);not null;default:0" json:"purchasePrice"`
	SellingPrice  float64   `gorm:"type:decimal(10,2);not null;default:0" json:"sellingPrice"`
	UnitPrice     float64   `gorm:"type:decimal(10,2);not null;default:0" json:"-"` // legacy column
	UnitType      string    `gorm:"type:varchar(50);not null" json:"unitType"`
	FocNormal     string    `gorm:"type:varchar(20);default:'normal'" json:"focNormal"`
	Subtotal      float64   `gorm:"type:decimal(10,2);not null" json:"subtotal"`
	SaleTax       float64   `gorm:"type:decimal(10,2);default:0" json:"saleTax"`
	WthTax        float64   `gorm:"type:decimal(10,2);default:0" json:"wthTax"`
	Disc          float64   `gorm:"type:decimal(10,2);default:0" json:"disc"`
	ExpiryDate    string                      `gorm:"type:varchar(50)" json:"expiryDate"`
	SerialNumber  string                      `gorm:"type:text" json:"serialNumber"`
	Model         string                      `gorm:"type:text" json:"model"`
	History       []PurchaseQuantityHistory    `gorm:"foreignKey:PurchaseItemID;constraint:OnDelete:CASCADE" json:"history"`
}

// PurchaseQuantityHistory - records every "add quantity" operation performed on
// a purchase item, including the serial / model numbers added and the unit
// price, stamped with the date and time of the operation.
type PurchaseQuantityHistory struct {
	TenantModel
	PurchaseID         uuid.UUID `gorm:"type:uuid;not null;index" json:"purchaseId"`
	PurchaseItemID     uuid.UUID `gorm:"type:uuid;not null;index" json:"purchaseItemId"`
	ProductID          uuid.UUID `gorm:"type:uuid;not null;index" json:"productId"`
	QuantityBefore     int       `gorm:"not null;default:0" json:"quantityBefore"`
	QuantityAdded      int       `gorm:"not null" json:"quantityAdded"`
	SerialNumbersAdded string    `gorm:"type:text" json:"serialNumbersAdded"`
	ModelsAdded        string    `gorm:"type:text" json:"modelsAdded"`
	UnitPrice          float64   `gorm:"type:decimal(10,2);not null;default:0" json:"unitPrice"`
}

// PurchasedProduct - Product info derived from purchase_items grouped by
// product. Purchase and vendor-invoice records are static documents, so the
// available stock is computed as the sum of purchased quantity minus the sum
// of sold quantity (POS page and Stock page both read this and show the same
// number). Each entry carries the per-purchase "versions" in Lines.
type PurchasedProduct struct {
	PurchaseItemID       string                 `json:"purchaseItemId"`
	ID                   string                 `json:"id"`
	Name                 string                 `json:"name"`
	Price                float64                `json:"price"`
	Stock                int                    `json:"stock"`
	TotalPurchased       int                    `json:"totalPurchased"`
	TotalSold            int                    `json:"totalSold"`
	UnitType             string                 `json:"unitType"`
	TaxPercent           float64                `json:"taxPercent"`
	PurchasePrice        float64                `json:"purchasePrice"`
	BillId               string                 `json:"billId"`
	PurchaseNumber       string                 `json:"purchaseNumber"`
	VendorName           string                 `json:"vendorName"`
	PurchaseDate         string                 `json:"purchaseDate"`
	Batch                string                 `json:"batch"`
	SerialNumber         string                 `json:"serialNumber"`
	ProductSerialNumber  string                 `json:"productSerialNumber"`
	CurrentSerialIndex   int                    `json:"currentSerialIndex"`
	Model                string                 `json:"model"`
	ProductModel         string                 `json:"productModel"`
	CurrentModelIndex    int                    `json:"currentModelIndex"`
	Image                string                 `json:"image"`
	Lines                []PurchasedProductLine `json:"lines"`
}

// PurchasedProductLine - one purchase line ("version") of a product shown in
// the Stock page when a product has been purchased more than once.
type PurchasedProductLine struct {
	PurchaseItemID string  `json:"purchaseItemId"`
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Quantity       int     `json:"quantity"`
	PurchasePrice  float64 `json:"purchasePrice"`
	SellingPrice   float64 `json:"sellingPrice"`
	UnitType       string  `json:"unitType"`
	SerialNumber   string  `json:"serialNumber"`
	Model          string  `json:"model"`
	BillId         string  `json:"billId"`
	PurchaseNumber string  `json:"purchaseNumber"`
	VendorName     string  `json:"vendorName"`
	PurchaseDate   string  `json:"purchaseDate"`
	Batch          string  `json:"batch"`
	CreatedAt      string  `json:"createdAt"`
}
