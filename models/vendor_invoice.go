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
	InvoiceNumber string              `gorm:"type:varchar(100);not null;uniqueIndex" json:"invoiceNumber"`
	InvoiceDate   string              `gorm:"type:varchar(50);not null" json:"invoiceDate"`
	TotalAmount   float64             `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
	Items         []VendorInvoiceItem `gorm:"foreignKey:InvoiceID;constraint:OnDelete:CASCADE" json:"items"`
}

// BeforeCreate hook to auto-generate invoice number
func (vi *VendorInvoice) BeforeCreate(tx *gorm.DB) error {
	if vi.InvoiceNumber == "" {
		// Generate invoice number with format: INV-YYMM-XXXX (shorter and more professional)
		now := time.Now()
		dateStr := now.Format("0601") // YYMM format (e.g., 2403 for March 2024)

		// Get the count of invoices for this month to generate unique suffix
		var count int64
		monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
		tx.Model(&VendorInvoice{}).Where("created_at BETWEEN ? AND ?", monthStart, monthEnd).Count(&count)

		// Generate sequential number (4 digits, starting from 1)
		vi.InvoiceNumber = fmt.Sprintf("INV-%s-%04d", dateStr, count+1)
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
	UnitType    string    `gorm:"type:unit_type_enum;not null" json:"unitType"`
	Subtotal    float64   `gorm:"type:decimal(10,2);not null" json:"subtotal"`
}
