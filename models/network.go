package models

import "github.com/google/uuid"

// Area geographic zone mapping
type Area struct {
	TenantModel
	City              string     `gorm:"type:varchar(100);not null" json:"city"`
	Zone              string     `gorm:"type:varchar(100);not null" json:"zone"`
	Locality          string     `gorm:"type:varchar(255);not null" json:"locality"`
	SubLocality       string     `gorm:"type:varchar(255)" json:"subLocality"`
	RecoveryOfficerID *uuid.UUID `gorm:"type:uuid" json:"recoveryOfficerId"` // nullable
}

// OLT top level device
type OLT struct {
	TenantModel
	Name      string `gorm:"type:varchar(100);not null" json:"name"`
	Location  string `gorm:"type:varchar(255);not null" json:"location"`
	IPAddress string `gorm:"type:varchar(50);not null" json:"ipAddress"`
	Ports     int    `gorm:"not null" json:"ports"`
	PopID     string `gorm:"type:varchar(36)" json:"popId"`

	Splitters []Splitter `json:"splitters,omitempty"`
	POP       POP        `json:"pop,omitempty"`
}

// Splitter secondary distribution, holds the critical port availability
type Splitter struct {
	TenantModel
	Name           string    `gorm:"type:varchar(100);not null" json:"name"`
	Location       string    `gorm:"type:varchar(255);not null" json:"location"`
	OLTID          uuid.UUID `gorm:"type:uuid;not null;index" json:"oltId"`
	TotalPorts     int       `gorm:"not null" json:"totalPorts"`
	AvailablePorts int       `gorm:"not null" json:"availablePorts"` // Derived/computed physically, but stored for ease

	OLT OLT `json:"olt,omitempty"`
}

// POP statuses
type POP struct {
	TenantModel
	Name       string `gorm:"type:varchar(100);not null" json:"name"`
	Location   string `gorm:"type:varchar(255);not null" json:"location"`
	Status     string `gorm:"type:varchar(20);not null;default:'online'" json:"status"` // online, offline
	LastOutage string `json:"lastOutage"`                                               // Or time.Time
}
