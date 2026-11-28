package models

import "github.com/google/uuid"

// SaleReturn records one partial return of a POS sale: the items/pieces the
// customer brought back and the amount taken off the sale. A sale can have
// several returns; together they make up Sale.ReturnedAmount.
type SaleReturn struct {
	TenantModel
	SaleID         uuid.UUID        `gorm:"type:uuid;not null;index" json:"saleId"`
	ReturnDate     string           `gorm:"type:varchar(50)" json:"returnDate"`
	Subtotal       float64          `gorm:"type:decimal(10,2);not null;default:0" json:"subtotal"`  // price x quantity of the returned items
	TaxAmount      float64          `gorm:"type:decimal(10,2);not null;default:0" json:"taxAmount"` // tax on the returned items
	Discount       float64          `gorm:"type:decimal(10,2);not null;default:0" json:"discount"`  // share of the sale discount
	TotalAmount    float64          `gorm:"type:decimal(10,2);not null;default:0" json:"totalAmount"`
	ReturnedByID   *uuid.UUID       `gorm:"type:uuid" json:"returnedById"`
	ReturnedByName string           `gorm:"type:varchar(255)" json:"returnedByName"`
	Items          []SaleReturnItem `gorm:"foreignKey:SaleReturnID;constraint:OnDelete:CASCADE" json:"items"`
}

// SaleReturnItem is one returned line (a product and how many pieces of it).
type SaleReturnItem struct {
	TenantModel
	SaleReturnID uuid.UUID `gorm:"type:uuid;not null;index" json:"saleReturnId"`
	SaleItemID   uuid.UUID `gorm:"type:uuid;index" json:"saleItemId"`
	ProductID    uuid.UUID `gorm:"type:uuid;index" json:"productId"`
	ProductName  string    `gorm:"type:varchar(255)" json:"productName"`
	Quantity     int       `gorm:"not null" json:"quantity"`
	Price        float64   `gorm:"type:decimal(10,2);not null;default:0" json:"price"`
	TaxPercent   float64   `gorm:"type:decimal(5,2);not null;default:0" json:"taxPercent"`
	TaxAmount    float64   `gorm:"type:decimal(10,2);not null;default:0" json:"taxAmount"`
	Amount       float64   `gorm:"type:decimal(10,2);not null;default:0" json:"amount"` // price x quantity
	SerialNumber string    `gorm:"type:text" json:"serialNumber"`
	Model        string    `gorm:"type:text" json:"model"`
}
