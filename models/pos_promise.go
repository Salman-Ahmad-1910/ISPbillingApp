package models

import (
	"time"

	"github.com/google/uuid"
)

// POSPromise stores a promise-to-pay created from the Point of Sale page.
//
// It is deliberately a separate table from Promise (monthly billing promises)
// and from SubscriberInstallment (fixed plan installments): this records money
// owed on goods handed over at the counter, where the operator may also sell
// below list price. It never touches the subscriber's monthly remaining_amount,
// so the two debts cannot be counted twice.
type POSPromise struct {
	TenantModel

	// The sale that handed the goods over. Goods leave the shop immediately even
	// when only part of the money is paid, so the sale is recorded in full and
	// stock/serial numbers are consumed as normal.
	SaleID         uuid.UUID `gorm:"type:uuid;index" json:"saleId"`
	SaleNumber     string    `gorm:"type:varchar(100)" json:"saleNumber"`
	SubscriberID   uuid.UUID `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string    `gorm:"type:varchar(255)" json:"subscriberName"`
	InternetID     string    `gorm:"type:varchar(255)" json:"internetId"`
	Phone          string    `gorm:"type:varchar(50)" json:"phone"`

	// Money at the moment the promise was made. TotalAmount already reflects any
	// price the operator reduced, so PendingAmount is what the customer actually
	// still owes and never has to be recalculated from the cart later.
	TotalAmount     float64 `gorm:"type:decimal(10,2);not null" json:"totalAmount"`
	PaidAmount      float64 `gorm:"type:decimal(10,2);not null;default:0" json:"paidAmount"`
	PendingAmount   float64 `gorm:"type:decimal(10,2);not null;default:0" json:"pendingAmount"`
	CollectedAmount float64 `gorm:"type:decimal(10,2);not null;default:0" json:"collectedAmount"`

	PromiseDate string    `gorm:"type:varchar(50);not null" json:"promiseDate"`
	PromiseAt   time.Time `json:"promiseAt"`
	Description string    `gorm:"type:text" json:"description"`

	// pending -> partial -> completed, or cancelled if the goods came back.
	Status string `gorm:"type:varchar(20);not null;default:'pending';index" json:"status"`

	CreatedByID   *uuid.UUID `gorm:"type:uuid" json:"createdById"`
	CreatedByName string     `gorm:"type:varchar(255)" json:"createdByName"`

	// Collectors on each later collection, most recent last.
	CollectorID     *uuid.UUID `gorm:"type:uuid" json:"collectorId"`
	CollectorName   string     `gorm:"type:varchar(255)" json:"collectorName"`
	LastCollectedAt *time.Time `json:"lastCollectedAt"`
}

// TableName pins the table so the name is stable across environments.
func (POSPromise) TableName() string {
	return "pos_promises"
}

// POSPromiseCollection is one collection against a promise, kept as its own rows
// so the money received over time is auditable rather than only a running total.
type POSPromiseCollection struct {
	TenantModel

	POSPromiseID  uuid.UUID `gorm:"type:uuid;not null;index" json:"posPromiseId"`
	Amount        float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
	PaymentMethod string    `gorm:"type:varchar(50)" json:"paymentMethod"`
	TransactionID string    `gorm:"type:varchar(255)" json:"transactionId"`
	CollectedAt   time.Time `json:"collectedAt"`
	Note          string    `gorm:"type:text" json:"note"`

	CollectorID   *uuid.UUID `gorm:"type:uuid" json:"collectorId"`
	CollectorName string     `gorm:"type:varchar(255)" json:"collectorName"`
}

func (POSPromiseCollection) TableName() string {
	return "pos_promise_collections"
}
