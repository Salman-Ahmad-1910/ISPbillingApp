package models

import (
	"time"

	"github.com/google/uuid"
)

type Connection struct {
	TenantModel
	InternetID          string  `gorm:"type:varchar(100);uniqueIndex:idx_connection_internet_id_company" json:"internetId"`
	Name                string  `gorm:"type:varchar(255);not null" json:"name"`
	Address             string  `gorm:"type:text" json:"address"`
	Cell                string  `gorm:"type:varchar(20)" json:"cell"`
	Mobile              string  `gorm:"type:varchar(20)" json:"mobile"`
	InstallationAmount  float64 `gorm:"type:decimal(10,2);default:0" json:"installationAmount"`
	OtherAmount         float64 `gorm:"type:decimal(10,2);default:0" json:"otherAmount"`
	InstallationDate    string  `gorm:"type:varchar(50)" json:"installationDate"`
	RechargeDate        string  `gorm:"type:varchar(50)" json:"rechargeDate"`
	ConnectionProvider  string  `gorm:"type:varchar(100)" json:"connectionProvider"`
	ConnectionType      string  `gorm:"type:varchar(50);default:'both'" json:"connectionType"`
	BoxNumber           string  `gorm:"type:varchar(100)" json:"boxNumber"`
	PackageCable        string  `gorm:"type:varchar(100)" json:"packageCable"`
	Discount            string  `gorm:"type:varchar(50)" json:"discount"`
	Amount              float64 `gorm:"type:decimal(10,2);default:0" json:"amount"`
	PackageInternet     string  `gorm:"type:varchar(100)" json:"packageInternet"`
	CreateBalance       bool    `gorm:"default:false" json:"createBalance"`
	BalanceDays         int     `gorm:"default:0" json:"balanceDays"`
	SameDiscount        string  `gorm:"type:varchar(50)" json:"sameDiscount"`
	SameAmount          float64 `gorm:"type:decimal(10,2);default:0" json:"sameAmount"`
	Status              string  `gorm:"type:varchar(20);default:'active'" json:"status"`
	SublocalityID       string  `gorm:"type:varchar(255)" json:"sublocalityId"`
	LastPaymentDate     *string `gorm:"type:varchar(50)" json:"lastPaymentDate"`
	RemainingAmount     float64 `gorm:"type:decimal(10,2);default:0" json:"remainingAmount"`
	SplitterID          string  `gorm:"type:varchar(36)" json:"splitterId"`
	SplitterPort        int     `gorm:"default:0" json:"splitterPort"`
}

// ConnectionStatusChange logs every status transition for accurate historical tracking
type ConnectionStatusChange struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ConnectionID uuid.UUID  `gorm:"type:uuid;index;not null" json:"connectionId"`
	CompanyID    uuid.UUID  `gorm:"type:uuid;index;not null" json:"companyId"`
	OldStatus    *string    `gorm:"type:varchar(20)" json:"oldStatus"`
	NewStatus    string     `gorm:"type:varchar(20);not null" json:"newStatus"`
	ChangedAt    time.Time  `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"changedAt"`
}
