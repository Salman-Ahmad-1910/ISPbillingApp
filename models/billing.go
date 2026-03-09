package models

import "github.com/google/uuid"

// Invoice connects Subscriber to monthly/recurring billing
type Invoice struct {
	TenantModel
	SubscriberID   uuid.UUID `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string    `gorm:"type:varchar(255)" json:"subscriberName"`
	Amount         float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
	DueDate        string    `gorm:"type:varchar(50);not null" json:"dueDate"`
	Status         string    `gorm:"type:varchar(20);default:'pending'" json:"status"` // paid, pending, overdue, draft
	BillingPeriod  string    `gorm:"type:varchar(50);not null" json:"billingPeriod"`

	Subscriber Subscriber `json:"subscriber,omitempty"`
}

// Payment handles specific remittances
type Payment struct {
	TenantModel
	InvoiceID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"invoiceId"`
	SubscriberID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string     `gorm:"type:varchar(255)" json:"subscriberName"`
	Amount         float64    `gorm:"type:decimal(10,2);not null" json:"amount"`
	PaymentDate    string     `gorm:"type:varchar(50);not null" json:"paymentDate"`
	Method         string     `gorm:"type:varchar(50);not null" json:"method"` // cash, bank, online, dealer
	CollectorID    *uuid.UUID `gorm:"type:uuid" json:"collectorId"`

	Invoice    Invoice    `json:"invoice,omitempty"`
	Subscriber Subscriber `json:"subscriber,omitempty"`
}

// CustomBill handles ad-hoc charges outside of standard cycle
type CustomBill struct {
	TenantModel
	SubscriberID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string     `gorm:"type:varchar(255)" json:"subscriberName"`
	DealerID       *uuid.UUID `gorm:"type:uuid" json:"dealerId"`
	Amount         float64    `gorm:"type:decimal(10,2);not null" json:"amount"`
	Description    string     `gorm:"type:text;not null" json:"description"`
	Status         string     `gorm:"type:varchar(20);default:'pending'" json:"status"`
	Date           string     `gorm:"type:varchar(50)" json:"date"`

	// Relationships
	Subscriber Subscriber `gorm:"foreignKey:SubscriberID" json:"subscriber,omitempty"`
}

// LedgerEntry is the source of truth for all financial movements
type LedgerEntry struct {
	TenantModel
	Date         string     `gorm:"type:varchar(50);not null" json:"date"`
	Description  string     `gorm:"type:text;not null" json:"description"`
	Debit        float64    `gorm:"type:decimal(10,2);default:0" json:"debit"`
	Credit       float64    `gorm:"type:decimal(10,2);default:0" json:"credit"`
	Balance      float64    `gorm:"type:decimal(10,2);default:0" json:"balance"`  // View of running total
	SubscriberID *uuid.UUID `gorm:"type:uuid;index" json:"subscriberId"`          // For customer-specific ledgers
	AccountType  string     `gorm:"type:varchar(50);not null" json:"accountType"` // 'cash', 'bank', 'customer'
}

type Expense struct {
	TenantModel
	Category    string  `gorm:"type:varchar(100);not null" json:"category"`
	Amount      float64 `gorm:"type:decimal(10,2);not null" json:"amount"`
	Date        string  `gorm:"type:varchar(50);not null" json:"date"`
	Description string  `gorm:"type:text" json:"description"`
}
