package models

import "github.com/google/uuid"

// Complaint handles customer tickets
type Complaint struct {
	TenantModel
	SubscriberID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string     `gorm:"type:varchar(255)" json:"subscriberName"`
	Category       string     `gorm:"type:varchar(50);not null" json:"category"` // network, billing, service
	Description    string     `gorm:"type:text;not null" json:"description"`
	Status         string     `gorm:"type:varchar(50);default:'open'" json:"status"` // open, in-progress, resolved, closed
	AssignedToID   *uuid.UUID `gorm:"type:uuid" json:"assignedToId"`
	ResolvedAt     string     `gorm:"type:varchar(50)" json:"resolvedAt"`
}

// Staff HR definition
type Staff struct {
	TenantModel
	Name           string     `gorm:"type:varchar(255);not null" json:"name"`
	Email          string     `gorm:"type:varchar(255)" json:"email"`
	Phone          string     `gorm:"type:varchar(20);not null" json:"phone"`
	SecondaryPhone string     `gorm:"type:varchar(20)" json:"secondaryPhone"`
	Designation    string     `gorm:"type:varchar(100);not null" json:"designation"`
	Department     string     `gorm:"type:varchar(50);not null" json:"department"` // technical, recovery, sales, admin
	Salary         float64    `gorm:"type:decimal(10,2);not null" json:"salary"`
	AreaID         *uuid.UUID `gorm:"type:uuid" json:"areaId"`
}

// Recovery Officer definition
type RecoveryOfficer struct {
	TenantModel
	Name           string     `gorm:"type:varchar(255);not null" json:"name"`
	Email          string     `gorm:"type:varchar(255);not null" json:"email"`
	Password       string     `gorm:"type:varchar(255);not null" json:"-"` // Hidden in JSON
	Phone          string     `gorm:"type:varchar(20);not null" json:"phone"`
	SecondaryPhone string     `gorm:"type:varchar(20)" json:"secondaryPhone"`
	AreaID         *uuid.UUID `gorm:"type:uuid" json:"areaId"`
	Status         string     `gorm:"type:varchar(20);default:'active'" json:"status"`
}

// Attendance tracking
type Attendance struct {
	TenantModel
	StaffID   uuid.UUID `gorm:"type:uuid;not null;index" json:"staffId"`
	StaffName string    `gorm:"type:varchar(255)" json:"staffName"`
	Date      string    `gorm:"type:varchar(50);not null" json:"date"`
	Status    string    `gorm:"type:varchar(20);not null" json:"status"` // present, absent, late, leave
	CheckIn   string    `gorm:"type:varchar(20)" json:"checkIn"`
	CheckOut  string    `gorm:"type:varchar(20)" json:"checkOut"`
}

// AdvanceLoan employee loans
type AdvanceLoan struct {
	TenantModel
	StaffID         uuid.UUID `gorm:"type:uuid;not null;index" json:"staffId"`
	StaffName       string    `gorm:"type:varchar(255)" json:"staffName"`
	Amount          float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
	Date            string    `gorm:"type:varchar(50);not null" json:"date"`
	Description     string    `gorm:"type:text;not null" json:"description"`
	RepaymentStatus string    `gorm:"type:varchar(20);default:'pending'" json:"repaymentStatus"`
}

// InventoryItem POS / Stock management for routers and accessories
type InventoryItem struct {
	TenantModel
	Name         string     `gorm:"type:varchar(255);not null" json:"name"`
	Type         string     `gorm:"type:varchar(50);not null" json:"type"` // router, ont, cable, accessory
	Stock        int        `gorm:"not null;default:0" json:"stock"`
	Price        float64    `gorm:"type:decimal(10,2);not null" json:"price"`
	Status       string     `gorm:"type:varchar(50);default:'in_stock'" json:"status"` // in_stock, assigned, damaged, returned
	SubscriberID *uuid.UUID `gorm:"type:uuid" json:"subscriberId"`
}

// RecoveryTransaction track cash floats
type RecoveryTransaction struct {
	TenantModel
	OfficerID   uuid.UUID `gorm:"type:uuid;not null;index" json:"officerId"`
	Date        string    `gorm:"type:varchar(50);not null" json:"date"`
	Description string    `gorm:"type:text;not null" json:"description"`
	Type        string    `gorm:"type:varchar(20);not null" json:"type"` // credit, debit
	Amount      float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
}

// TableName specifies the exact table name
func (RecoveryTransaction) TableName() string {
	return "recovery_transactions"
}

// AlertTemplate for automated notifications
type AlertTemplate struct {
	TenantModel
	TemplateID       string `gorm:"type:varchar(100);not null;index" json:"templateId"` // invoice-generated, etc.
	Title            string `gorm:"type:varchar(255);not null" json:"title"`
	Description      string `gorm:"type:text" json:"description"`
	SMSEnabled       bool   `gorm:"default:true" json:"smsEnabled"`
	SMSTemplate      string `gorm:"type:text" json:"smsTemplate"`
	WhatsAppEnabled  bool   `gorm:"default:true" json:"whatsAppEnabled"`
	WhatsAppTemplate string `gorm:"type:text" json:"whatsAppTemplate"`
}

// SystemConfig for global application settings
type SystemConfig struct {
	TenantModel
	AppName         string `gorm:"type:varchar(255);not null" json:"appName"`
	DefaultCurrency string `gorm:"type:varchar(10);default:'PKR'" json:"defaultCurrency"`
	AutoSuspend     bool   `gorm:"default:true" json:"autoSuspend"`
	GracePeriod     int    `gorm:"default:3" json:"gracePeriod"`
	InvoiceTemplate string `gorm:"type:text" json:"invoiceTemplate"`
	SMSGateway      string `gorm:"type:varchar(255)" json:"smsGateway"`
	WhatsAppGateway string `gorm:"type:varchar(255)" json:"whatsAppGateway"`
	InvoiceSms      string `gorm:"type:text" json:"invoiceSms"`
	Enable2FA       bool   `gorm:"default:false" json:"enable2fa"`
	SessionTimeout  int    `gorm:"default:60" json:"sessionTimeout"`
}

// SupportTicket for customer/system help desk
type SupportTicket struct {
	TenantModel
	UserID   uuid.UUID `gorm:"type:uuid;not null;index" json:"userId"`
	Subject  string    `gorm:"type:varchar(255);not null" json:"subject"`
	Message  string    `gorm:"type:text;not null" json:"message"`
	Status   string    `gorm:"type:varchar(20);default:'open'" json:"status"`     // open, closed
	Priority string    `gorm:"type:varchar(20);default:'medium'" json:"priority"` // low, medium, high

	// Temporarily comment out relationship to test migration
	// User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
