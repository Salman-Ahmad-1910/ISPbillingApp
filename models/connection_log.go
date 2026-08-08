package models

import (
	"github.com/google/uuid"
)

// ConnectionLog records every single change made to a connection (subscriber):
// what changed, old vs new value, who did it, their role, branch, device/IP and
// any remarks. Used by the "Update Connection Log" page.
type ConnectionLog struct {
	TenantModel
	ConnectionID   uuid.UUID  `gorm:"type:uuid;index;not null" json:"connectionId"`
	SubscriberName string     `gorm:"type:varchar(255);index" json:"subscriberName"`
	InternetID     string     `gorm:"type:varchar(100)" json:"internetId"`
	ConnectionType string     `gorm:"type:varchar(50)" json:"connectionType"`
	ActionType     string     `gorm:"type:varchar(120);index" json:"actionType"`
	FieldName      string     `gorm:"type:varchar(100)" json:"fieldName"`
	OldValue       string     `gorm:"type:text" json:"oldValue"`
	NewValue       string     `gorm:"type:text" json:"newValue"`
	Reason         string     `gorm:"type:text" json:"reason"`
	Remarks        string     `gorm:"type:text" json:"remarks"`
	UpdatedBy      *uuid.UUID `gorm:"type:uuid;index" json:"updatedBy"`
	UserRole       string     `gorm:"type:varchar(100)" json:"userRole"`
	Branch         string     `gorm:"type:varchar(255)" json:"branch"`
	IPAddress      string     `gorm:"type:varchar(64)" json:"ipAddress"`
	DeviceName     string     `gorm:"type:varchar(255)" json:"deviceName"`
	LogDate        string     `gorm:"type:varchar(20);index" json:"logDate"`
	LogTime        string     `gorm:"type:varchar(20)" json:"logTime"`

	// Enriched for response only (not persisted)
	UpdatedByName string `gorm:"-" json:"updatedByName"`
}
