package models

import "github.com/google/uuid"

// Promise tracks a subscriber's commitment to pay an outstanding amount by a specific date
type Promise struct {
	TenantModel
	SubscriberID   *uuid.UUID `gorm:"type:uuid;index" json:"subscriberId"`
	SubscriberName string     `gorm:"type:varchar(255)" json:"subscriberName"`
	InternetID     string     `gorm:"type:varchar(255)" json:"internetId"`
	Phone          string     `gorm:"type:varchar(50)" json:"phone"`
	Address        string     `gorm:"type:text" json:"address"`
	Sublocality    string     `gorm:"type:varchar(255)" json:"sublocality"`
	ConnectionType string     `gorm:"type:varchar(20)" json:"connectionType"`
	Amount         float64    `gorm:"type:decimal(10,2);default:0" json:"amount"`
	PromiseDate    string     `gorm:"type:varchar(50);not null" json:"promiseDate"`
	Description    string     `gorm:"type:text;not null" json:"description"`
	Status         string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, completed, overdue
	CollectorID    *uuid.UUID `gorm:"type:uuid" json:"collectorId"`
	CollectorName  string     `gorm:"type:varchar(255)" json:"collectorName"`
}
