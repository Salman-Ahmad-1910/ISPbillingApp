package models

import (
	"encoding/json"

	"github.com/google/uuid"
)

// DealerFranchise top level distributor
type DealerFranchise struct {
	TenantModel
	Name          string `gorm:"type:varchar(255);not null" json:"name"`
	ContactPerson string `gorm:"type:varchar(255);not null" json:"contactPerson"`
	ContactPhone  string `gorm:"type:varchar(20);not null" json:"contactPhone"`
	Status        string `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, approved, rejected
}

// Dealer sub-distributor
type Dealer struct {
	TenantModel
	Name           string     `gorm:"type:varchar(255);not null" json:"name"`
	Phone          string     `gorm:"type:varchar(20);not null" json:"phone"`
	Email          string     `gorm:"type:varchar(255);not null" json:"email"`
	Password       string     `gorm:"type:varchar(255);not null" json:"password,omitempty"` // Hidden in JSON output via MarshalJSON
	Cnic           string     `gorm:"type:varchar(20);not null" json:"cnic"`
	Address        string     `gorm:"type:varchar(500)" json:"address"`
	CommissionRate float64    `gorm:"type:decimal(5,2);not null" json:"commissionRate"`
	WalletBalance  float64    `gorm:"type:decimal(10,2);default:0" json:"walletBalance"`
	FranchiseID    *uuid.UUID `gorm:"type:uuid" json:"franchiseId"`
	ParentDealerID *uuid.UUID `gorm:"type:uuid" json:"parentDealerId"`
	AreaID          *uuid.UUID `gorm:"type:uuid" json:"areaId"`
	AreaName        string     `gorm:"type:varchar(255)" json:"areaName"`
	LastPaymentDate *string    `gorm:"type:varchar(50)" json:"lastPaymentDate"`
	RemainingAmount float64    `gorm:"type:decimal(10,2);default:0" json:"remainingAmount"`
}

// MarshalJSON hides the password in JSON output
func (d Dealer) MarshalJSON() ([]byte, error) {
	type Alias Dealer
	return json.Marshal(&struct {
		Password string `json:"-"`
		*Alias
	}{
		Alias: (*Alias)(&d),
	})
}

// UnmarshalJSON custom unmarshaling for Dealer to handle "none" parentDealerId
func (d *Dealer) UnmarshalJSON(data []byte) error {
	type Alias Dealer
	aux := &struct {
		ParentDealerID *string `json:"parentDealerId"`
		*Alias
	}{
		Alias: (*Alias)(d),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Handle "none" or empty string parentDealerId
	if aux.ParentDealerID != nil {
		if *aux.ParentDealerID == "none" || *aux.ParentDealerID == "" {
			d.ParentDealerID = nil
		} else {
			parsedUUID, err := uuid.Parse(*aux.ParentDealerID)
			if err != nil {
				return err
			}
			d.ParentDealerID = &parsedUUID
		}
	}

	return nil
}

// DealerCollection settlements
type DealerCollection struct {
	TenantModel
	DealerID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"dealerId"`
	DealerName       string     `gorm:"type:varchar(255)" json:"dealerName"`
	DealerAddress    string     `gorm:"type:varchar(500)" json:"dealerAddress"`
	Amount           float64    `gorm:"type:decimal(10,2)" json:"amount"`
	CollectionDate   string     `gorm:"type:varchar(50)" json:"collectionDate"`
	SettlementStatus string     `gorm:"type:varchar(20);default:'pending'" json:"settlementStatus"` // pending, settled
	TransactionType  string     `gorm:"type:varchar(50);default:'cash'" json:"transactionType"`     // cash, bank, easypaisa, jazzcash
	Comment          string     `gorm:"type:varchar(500)" json:"comment"`
	ReceivedByID     *uuid.UUID `gorm:"type:uuid" json:"receivedById"`
	ReceivedByName   string     `gorm:"type:varchar(255)" json:"receivedByName"`
}
