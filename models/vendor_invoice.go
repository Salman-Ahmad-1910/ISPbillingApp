package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// VendorInvoice - Purchase invoice from vendors
type VendorInvoice struct {
	TenantModel
	VendorID      uuid.UUID           `gorm:"type:uuid;not null;index" json:"vendorId"`
	VendorName    string              `gorm:"type:varchar(255)" json:"vendorName"`
	InvoiceNumber string              `gorm:"type:varchar(100);not null" json:"invoiceNumber"`
	InvoiceDate   string              `gorm:"type:varchar(50);not null" json:"invoiceDate"`
	TotalAmount   float64             `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
	Batch         string              `gorm:"type:varchar(100)" json:"batch"`
	Items         []VendorInvoiceItem `gorm:"foreignKey:InvoiceID;constraint:OnDelete:CASCADE" json:"items"`
}

// BeforeCreate hook to auto-generate invoice number
func (vi *VendorInvoice) BeforeCreate(tx *gorm.DB) error {
	if vi.InvoiceNumber == "" {
		now := time.Now()
		dateStr := now.Format("0601")
		prefix := fmt.Sprintf("INV-%s-", dateStr)

		var maxNum int
		tx.Unscoped().Model(&VendorInvoice{}).
			Where("company_id = ? AND invoice_number LIKE ?", vi.CompanyID, prefix+"%").
			Select("COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\\d+$') AS INTEGER)), 0)").
			Scan(&maxNum)

		vi.InvoiceNumber = fmt.Sprintf("INV-%s-%04d", dateStr, maxNum+1)
	}
	return nil
}

// VendorInvoiceItem - Individual items in a vendor invoice
type VendorInvoiceItem struct {
	TenantModel
	InvoiceID   uuid.UUID `gorm:"type:uuid;not null;index" json:"invoiceId"`
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"productId"`
	ProductName string    `gorm:"type:varchar(255)" json:"productName"`
	Quantity    int       `gorm:"not null" json:"quantity"`
	UnitPrice   float64   `gorm:"type:decimal(10,2);not null" json:"unitPrice"`
	UnitType    string    `gorm:"type:varchar(50);not null" json:"unitType"`
	Subtotal    float64   `gorm:"type:decimal(10,2);not null" json:"subtotal"`
}
