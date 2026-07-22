package models

// TransactionType handles payment method / channel configuration
type TransactionType struct {
	TenantModel
	Transaction    string  `gorm:"type:varchar(255);not null" json:"transaction"`
	OpeningBalance float64 `gorm:"type:decimal(10,2);default:0" json:"openingBalance"`
	Title          string  `gorm:"type:varchar(255)" json:"title"`
	PaymentChannel string  `gorm:"type:varchar(100)" json:"paymentChannel"`
}

func (TransactionType) TableName() string {
	return "transaction_types"
}
