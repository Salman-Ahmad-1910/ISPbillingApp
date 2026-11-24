package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DemandPage is one page/permission a user asks for (id + readable name, as
// listed on the Roles & Permissions page).
type DemandPage struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// PermissionDemand is a request from a user to their admin for permissions
// they need. It is sent to the account that created the user (or, when that
// account is missing/inactive, to a company admin/owner). The admin approves or
// rejects it with a reply; permissions themselves are still granted on the
// Roles & Permissions page.
type PermissionDemand struct {
	TenantModel

	RequesterID    uuid.UUID `gorm:"type:uuid;not null;index" json:"requesterId"`
	RequesterName  string    `gorm:"type:varchar(255)" json:"requesterName"`
	RequesterEmail string    `gorm:"type:varchar(255)" json:"requesterEmail"`
	AccountType    string    `gorm:"type:varchar(50)" json:"accountType"` // role of the requester in the company

	RecipientID   *uuid.UUID `gorm:"type:uuid;index" json:"recipientId"`
	RecipientName string     `gorm:"type:varchar(255)" json:"recipientName"`

	Pages       string       `gorm:"type:text" json:"-"` // JSON list of DemandPage
	PageList    []DemandPage `gorm:"-" json:"pages"`
	Platform    string       `gorm:"type:varchar(20);default:'both'" json:"platform"`   // web, mobile, both
	Priority    string       `gorm:"type:varchar(20);default:'normal'" json:"priority"` // normal, urgent
	Description string       `gorm:"type:text;not null" json:"description"`

	Status          string     `gorm:"type:varchar(20);default:'pending';index" json:"status"` // pending, approved, rejected
	Reply           string     `gorm:"type:text" json:"reply"`
	RespondedByID   *uuid.UUID `gorm:"type:uuid" json:"respondedById"`
	RespondedByName string     `gorm:"type:varchar(255)" json:"respondedByName"`
	RespondedAt     *time.Time `json:"respondedAt"`
}

// AfterFind fills PageList from the stored JSON.
func (d *PermissionDemand) AfterFind(tx *gorm.DB) error {
	d.PageList = []DemandPage{}
	if d.Pages != "" {
		_ = json.Unmarshal([]byte(d.Pages), &d.PageList)
	}
	return nil
}
