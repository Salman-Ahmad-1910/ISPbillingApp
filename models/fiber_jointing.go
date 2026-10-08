package models

import (
	"time"

	"github.com/google/uuid"
)

// Sale type markers. A fiber jointing / cable repair charge is recorded as a
// normal Sale row (so it appears in the sales list and receipts) tagged with its
// own type so monthly-package and POS filters can keep them apart.
const (
	SaleTypePOS           = "pos"
	SaleTypeFiberJointing = "fiber_jointing"
)

// Payment statuses used on the fiber jointing record and its linked sale row.
const (
	FiberPaymentStatusPaid    = "paid"
	FiberPaymentStatusPartial = "partial"
	FiberPaymentStatusPromise = "promise"
	FiberPaymentStatusUnpaid  = "unpaid"
)

// FiberJointing records a one-time fiber jointing / cable repair service charge
// for a subscriber. It is deliberately separate from the monthly billing cycle:
// the outstanding service charge is tracked here (and mirrored on the linked
// sale), never added to the subscriber's monthly connections.remaining_amount,
// so the two debts cannot be counted twice. Money actually received is recorded
// as a Payment plus a LedgerEntry against the subscriber.
type FiberJointing struct {
	TenantModel

	SaleID         uuid.UUID `gorm:"type:uuid;not null;index" json:"saleId"`
	SubscriberID   uuid.UUID `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string    `gorm:"type:varchar(255)" json:"subscriberName"`
	InternetID     string    `gorm:"type:varchar(255)" json:"internetId"`
	Phone          string    `gorm:"type:varchar(50)" json:"phone"`

	Description    string  `gorm:"type:text" json:"description"`
	JointCount     int     `gorm:"default:0" json:"jointCount"`
	MaterialCost   float64 `gorm:"type:decimal(10,2);not null;default:0" json:"materialCost"`
	LaborCost      float64 `gorm:"type:decimal(10,2);not null;default:0" json:"laborCost"`
	JointingCharge float64 `gorm:"type:decimal(10,2);not null;default:0" json:"jointingCharge"`
	TotalAmount    float64 `gorm:"type:decimal(10,2);not null" json:"totalAmount"`

	PaidAmount      float64 `gorm:"type:decimal(10,2);not null;default:0" json:"paidAmount"`
	RemainingAmount float64 `gorm:"type:decimal(10,2);not null;default:0" json:"remainingAmount"`
	PaymentStatus   string  `gorm:"type:varchar(20);not null;default:'unpaid';index" json:"paymentStatus"`

	PaymentMethod  string     `gorm:"type:varchar(50)" json:"paymentMethod"`
	TechnicianID   *uuid.UUID `gorm:"type:uuid" json:"technicianId"`
	TechnicianName string     `gorm:"type:varchar(255)" json:"technicianName"`
	ServiceDate    string     `gorm:"type:varchar(50)" json:"serviceDate"`
	PromiseDueDate string     `gorm:"type:varchar(50)" json:"promiseDueDate"`
	PromiseNote    string     `gorm:"type:text" json:"promiseNote"`
	Reason         string     `gorm:"type:text" json:"reason"`
	Notes          string     `gorm:"type:text" json:"notes"`

	CreatedByID     *uuid.UUID `gorm:"type:uuid" json:"createdById"`
	CreatedByName   string     `gorm:"type:varchar(255)" json:"createdByName"`
	LastCollectedAt *time.Time `json:"lastCollectedAt"`
	CollectorID     *uuid.UUID `gorm:"type:uuid" json:"collectorId"`
	CollectorName   string     `gorm:"type:varchar(255)" json:"collectorName"`
}

// TableName pins the table so the name is stable across environments.
func (FiberJointing) TableName() string {
	return "fiber_jointings"
}

// FiberJointingPayment is one money receipt against a fiber jointing charge,
// kept as its own rows so the money received over time is auditable rather than
// only a running total.
type FiberJointingPayment struct {
	TenantModel

	FiberJointingID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"fiberJointingId"`
	Amount           float64    `gorm:"type:decimal(10,2);not null" json:"amount"`
	PaymentMethod    string     `gorm:"type:varchar(50)" json:"paymentMethod"`
	TransactionID    string     `gorm:"type:varchar(255)" json:"transactionId"`
	PaymentDate      string     `gorm:"type:varchar(50)" json:"paymentDate"`
	Note             string     `gorm:"type:text" json:"note"`
	CollectedByID    *uuid.UUID `gorm:"type:uuid" json:"collectedById"`
	CollectedByName  string     `gorm:"type:varchar(255)" json:"collectedByName"`
}

// TableName pins the table so the name is stable across environments.
func (FiberJointingPayment) TableName() string {
	return "fiber_jointing_payments"
}