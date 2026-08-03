package models

import "github.com/google/uuid"

// Complaint handles customer tickets
type Complaint struct {
	TenantModel
	SubscriberID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"subscriberId"`
	SubscriberName string     `gorm:"type:varchar(255)" json:"subscriberName"`
	Phone          string     `gorm:"type:varchar(50)" json:"phone"`
	Address        string     `gorm:"type:text" json:"address"`
	Type           string     `gorm:"type:varchar(50)" json:"type"`               // internet, cable, both
	Subject        string     `gorm:"type:varchar(255)" json:"subject"`
	Department     string     `gorm:"type:varchar(100)" json:"department"`        // technical, cro-support, technician, subscriber-support-desk, subscriber-care-support, finance
	Priority       string     `gorm:"type:varchar(20);default:'medium'" json:"priority"` // low, medium, high
	Deadline       string     `gorm:"type:varchar(50)" json:"deadline"`
	Category       string     `gorm:"type:varchar(50);not null" json:"category"` // network, billing, service
	Description    string     `gorm:"type:text;not null" json:"description"`
	Status         string     `gorm:"type:varchar(50);default:'open'" json:"status"` // open, in-progress, resolved, closed
	AssignedToID   *uuid.UUID `gorm:"type:uuid" json:"assignedToId"`
	ResolvedAt     string     `gorm:"type:varchar(50)" json:"resolvedAt"`
}

// ComplaintSubject defines predefined complaint subjects organized by type
type ComplaintSubject struct {
	TenantModel
	Subject string `gorm:"type:varchar(255);not null" json:"subject"`
	Type    string `gorm:"type:varchar(50);not null" json:"type"` // Internet, Cable
}

// ComplaintType defines complaint type categories
type ComplaintType struct {
	TenantModel
	Name string `gorm:"type:varchar(100);not null" json:"name"`
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

	// Personal Information
	Gender        string `gorm:"type:varchar(20)" json:"gender"`
	MaritalStatus string `gorm:"type:varchar(20)" json:"maritalStatus"`
	FatherName    string `gorm:"type:varchar(255)" json:"fatherName"`
	NIC           string `gorm:"type:varchar(50)" json:"nic"`
	Address       string `gorm:"type:text" json:"address"`

	// Accounts
	BasicPay     float64 `gorm:"type:decimal(10,2);default:0" json:"basicPay"`
	LeaveAllow   float64 `gorm:"type:decimal(10,2);default:0" json:"leaveAllow"`
	PaymentMode  string  `gorm:"type:varchar(20)" json:"paymentMode"` // cash, bank
	BankName     string  `gorm:"type:varchar(255)" json:"bankName"`
	AccountTitle string  `gorm:"type:varchar(255)" json:"accountTitle"`
	AccountNo    string  `gorm:"type:varchar(100)" json:"accountNo"`

	// Employment
	AppointedDate string `gorm:"type:varchar(50)" json:"appointedDate"`
	Technical     string `gorm:"type:varchar(10)" json:"technical"` // yes, no
	Status        string `gorm:"type:varchar(20);default:'working'" json:"status"` // working, left
	LeaveDate     string `gorm:"type:varchar(50)" json:"leaveDate"`
	PlainPassword string `gorm:"type:varchar(255)" json:"plainPassword"`

	// Attachments (base64 data URLs)
	CNICFront     string `gorm:"type:text" json:"cnicFront"`
	CNICBack      string `gorm:"type:text" json:"cnicBack"`
	EmployeeImage string `gorm:"type:text" json:"employeeImage"`
	CV            string `gorm:"type:text" json:"cv"`

	Qualifications []StaffQualification `gorm:"foreignKey:StaffID" json:"qualifications"`
	Experiences    []StaffExperience    `gorm:"foreignKey:StaffID" json:"experiences"`
	WorkTimes      []StaffWorkTime      `gorm:"foreignKey:StaffID" json:"workTimes"`
}

// StaffQualification individual education entry on a staff member
type StaffQualification struct {
	TenantModel
	StaffID       uuid.UUID `gorm:"type:uuid;not null;index" json:"staffId"`
	Qualification string    `gorm:"type:varchar(100)" json:"qualification"`
	Institute     string    `gorm:"type:varchar(255)" json:"institute"`
	StartDate     string    `gorm:"type:varchar(50)" json:"startDate"`
	EndDate       string    `gorm:"type:varchar(50)" json:"endDate"`
	ObtainedMarks string    `gorm:"type:varchar(50)" json:"obtainedMarks"`
	Grade         string    `gorm:"type:varchar(20)" json:"grade"`
	MajorSubject  string    `gorm:"type:varchar(255)" json:"majorSubject"`
}

// StaffExperience individual work experience entry on a staff member
type StaffExperience struct {
	TenantModel
	StaffID      uuid.UUID `gorm:"type:uuid;not null;index" json:"staffId"`
	Organization string    `gorm:"type:varchar(255)" json:"organization"`
	Designation  string    `gorm:"type:varchar(100)" json:"designation"`
	StartDate    string    `gorm:"type:varchar(50)" json:"startDate"`
	EndDate      string    `gorm:"type:varchar(50)" json:"endDate"`
	Description  string    `gorm:"type:text" json:"description"`
}

// StaffWorkTime working hours entry for a staff member
type StaffWorkTime struct {
	TenantModel
	StaffID   uuid.UUID `gorm:"type:uuid;not null;index" json:"staffId"`
	Day       string    `gorm:"type:varchar(20)" json:"day"`
	StartTime string    `gorm:"type:varchar(20)" json:"startTime"`
	EndTime   string    `gorm:"type:varchar(20)" json:"endTime"`
}

// StaffDepartment configurable staff department
type StaffDepartment struct {
	TenantModel
	Name string `gorm:"type:varchar(100);not null" json:"name"`
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
	Category        string    `gorm:"type:varchar(20);default:'advance'" json:"category"`
	Direction       string    `gorm:"type:varchar(20);default:'issue'" json:"direction"`
	Amount          float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
	Date            string    `gorm:"type:varchar(50);not null" json:"date"`
	ReturnValue     float64   `gorm:"type:decimal(10,2);default:0" json:"returnValue"`
	TransactionType string    `gorm:"type:varchar(50);default:'cash'" json:"transactionType"`
	Comments        string    `gorm:"type:text" json:"comments"`
	Description     string    `gorm:"type:text;not null" json:"description"`
	RepaymentStatus string    `gorm:"type:varchar(20);default:'pending'" json:"repaymentStatus"`
}

// SalaryPayment monthly salary payout for a staff member
type SalaryPayment struct {
	TenantModel
	StaffID        uuid.UUID `gorm:"type:uuid;not null;index" json:"staffId"`
	StaffName      string    `gorm:"type:varchar(255)" json:"staffName"`
	Month          string    `gorm:"type:varchar(20);not null" json:"month"`
	Year           int       `gorm:"not null" json:"year"`
	Salary         float64   `gorm:"type:decimal(10,2);default:0" json:"salary"`
	BasicPay       float64   `gorm:"type:decimal(10,2);default:0" json:"basicPay"`
	LeaveAllow     float64   `gorm:"type:decimal(10,2);default:0" json:"leaveAllow"`
	OtherAllowance float64   `gorm:"type:decimal(10,2);default:0" json:"otherAllowance"`
	Deduction      float64   `gorm:"type:decimal(10,2);default:0" json:"deduction"`
	NetPay         float64   `gorm:"type:decimal(10,2);default:0" json:"netPay"`
	PaymentMode    string    `gorm:"type:varchar(20)" json:"paymentMode"`
	PaidAt         string    `gorm:"type:varchar(50)" json:"paidAt"`
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

// Message for SMS/notification management (draft, sent, outbox)
type Message struct {
	TenantModel
	Status      string `gorm:"type:varchar(20);default:'draft';index" json:"status"` // draft, sent, outbox
	EntityID    string `gorm:"type:varchar(50)" json:"entityId"`
	InternetID  string `gorm:"type:varchar(50)" json:"internetId"`
	Name        string `gorm:"type:varchar(255)" json:"name"`
	MobileNo    string `gorm:"type:varchar(50)" json:"mobileNo"`
	Phone       string `gorm:"type:varchar(50)" json:"phone"`
	Address     string `gorm:"type:text" json:"address"`
	MessageType string `gorm:"type:varchar(100)" json:"messageType"`
	MessageText string `gorm:"type:text" json:"messageText"`
	SentBy      string `gorm:"type:varchar(100)" json:"sentBy"`
	SendedAt    string `gorm:"type:varchar(50)" json:"sendedAt"`
	SendTo      string `gorm:"type:varchar(50)" json:"sendTo"` // Subscriber, Dealer, Inquiry, Staff, Admin, Other
}

// TableName specifies the exact table name
func (Message) TableName() string {
	return "messages"
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

// MessageTemplate holds reusable SMS/notification message templates with
// dynamic parameters (e.g. {name}, {balance}) that get filled when sending.
type MessageTemplate struct {
	TenantModel
	Title      string `gorm:"type:varchar(255);not null" json:"title"`
	Message    string `gorm:"type:text;not null" json:"message"`
	Parameters string `gorm:"type:text" json:"parameters"` // comma-separated parameter names
}

// TableName specifies the exact table name
func (MessageTemplate) TableName() string {
	return "message_templates"
}
