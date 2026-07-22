package models

import (
	"github.com/google/uuid"
)

// Define valid roles
const (
	RoleAdmin     = "admin"
	RoleDealer    = "dealer"
	RoleRecovery  = "recovery_officer"
	RoleSubDealer = "sub_dealer"
	RoleStaff     = "staff"
)

// Define permissions for dealers
var DealerPermissions = []string{
	// Dashboard & Home
	"dashboard.view",
	"sales_summary.view",
	"alerts.view",

	// Sales & Orders
	"orders.create",
	"orders.view",
	"orders.update",
	"orders.history.view",

	// Inventory
	"inventory.view",
	"inventory.view_allocated",
	"inventory.view_details",
	"inventory.request_transfer",

	// Invoices & Billing
	"invoices.view",
	"invoices.download",
	"payments.submit",
	"returns.create",
	"returns.track",

	// Reports
	"reports.sales.view",
	"reports.stock_movement.view",
	"reports.outstanding_payments.view",

	// Profile & Account
	"profile.manage",
	"password.change",
	"notifications.manage",
}

// Define permissions for admins (full access)
var AdminPermissions = []string{
	"*", // Wildcard for all permissions
}

// Define permissions for recovery officers
var RecoveryOfficerPermissions = []string{
	"dashboard.view",
	"subscribers.view",
	"subscribers.manage",
	"collections.view",
	"collections.manage",
	"reports.collections.view",
}

// Permission represents a specific action that can be performed on a module
type Permission struct {
	BaseModel
	Module string `gorm:"type:varchar(50);not null" json:"module"` // areas, dealers, users, subscribers, etc
	Action string `gorm:"type:varchar(20);not null" json:"action"` // read, write, add, delete
	Name   string `gorm:"type:varchar(100);not null" json:"name"`  // e.g., "Add Dealer", "Edit User"

	// Relationships
	RolePermissions []RolePermission `gorm:"foreignKey:PermissionID;constraint:OnDelete:CASCADE;" json:"-"`
}

// Role represents a role within a company
type Role struct {
	TenantModel
	Name        string `gorm:"type:varchar(100);not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Permissions string `gorm:"type:text" json:"permissions"` // Temporary fix for legacy schema

	// Relationships
	RolePermissions []RolePermission `gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE;" json:"-"`
}

// RolePermission represents the many-to-many relationship between roles and permissions within a company
type RolePermission struct {
	BaseModel
	RoleID       uuid.UUID `gorm:"type:uuid;not null;index" json:"roleId"`
	PermissionID uuid.UUID `gorm:"type:uuid;not null;index" json:"permissionId"`
	CompanyID    uuid.UUID `gorm:"type:uuid;not null;index" json:"companyId"`

	// Relationships
	Role       Role       `gorm:"foreignKey:RoleID" json:"role"`
	Permission Permission `gorm:"foreignKey:PermissionID" json:"permission"`
	Company    Company    `gorm:"foreignKey:CompanyID" json:"company"`
}

// SystemLog represents an audit trail entry for system actions
type SystemLog struct {
	TenantModel
	UserID      uuid.UUID   `gorm:"type:uuid;not null;index" json:"userId"`
	CompanyID   uuid.UUID   `gorm:"type:uuid;not null;index" json:"companyId"`
	Action      string      `gorm:"type:varchar(50);not null" json:"action"`          // add, edit, delete, login, etc
	Module      string      `gorm:"type:varchar(50);not null" json:"module"`          // users, dealers, subscribers, etc
	Description string      `gorm:"type:text;not null" json:"description"`            // Human-readable description
	IPAddress   string      `gorm:"type:varchar(45)" json:"ipAddress"`                // IPv4 or IPv6
	UserAgent   string      `gorm:"type:text" json:"userAgent"`                       // Browser/client info
	Status      string      `gorm:"type:varchar(20);default:'success'" json:"status"` // success, error, warning
	Page        string      `gorm:"type:varchar(100)" json:"page"`                    // Page where action was taken
	Details     interface{} `gorm:"type:jsonb" json:"details,omitempty"`              // Additional log details

	// Relationships
	User    User    `gorm:"foreignKey:UserID" json:"user"`
	Company Company `gorm:"foreignKey:CompanyID" json:"company"`
}

// TableName specifies the table name for SystemLog
func (SystemLog) TableName() string {
	return "audit_logs"
}
