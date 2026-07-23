package models

import "github.com/google/uuid"

type AccountHead struct {
	TenantModel
	MasterAccount string `gorm:"type:varchar(255);not null" json:"masterAccount"`
	AccountType   string `gorm:"type:varchar(100);not null" json:"accountType"`
	Description   string `gorm:"type:text" json:"description"`
}

type AccountSubHead struct {
	TenantModel
	SubMasterAccount string    `gorm:"type:varchar(255);not null" json:"subMasterAccount"`
	MasterAccountID  uuid.UUID `gorm:"type:uuid;not null;index" json:"masterAccountId"`
	MasterAccount    string    `gorm:"type:varchar(255);not null" json:"masterAccount"`
	AccountType      string    `gorm:"type:varchar(100);not null" json:"accountType"`
	Budget           string    `gorm:"type:varchar(50)" json:"budget"`
	Description      string    `gorm:"type:text" json:"description"`
}

type AccountEntry struct {
	TenantModel
	HeadID          string  `gorm:"type:varchar(255);not null" json:"head"`
	SubHeadID       string  `gorm:"type:varchar(255);not null" json:"subHead"`
	Description     string  `gorm:"type:text" json:"description"`
	Date            string  `gorm:"type:varchar(50);not null" json:"date"`
	AddBy           string  `gorm:"type:varchar(255)" json:"addBy"`
	EditBy          string  `gorm:"type:varchar(255)" json:"editBy"`
	Amount          float64 `gorm:"type:decimal(10,2);not null" json:"amount"`
	TransactionType string  `gorm:"type:varchar(255)" json:"transactionType"`
}
