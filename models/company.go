package models

// Company handles multi-tenancy at the root level. No TenantID itself, but has Users, etc.
type Company struct {
	BaseModel
	Name             string `gorm:"type:varchar(255);not null" json:"name"`
	Email            string `gorm:"type:varchar(255);not null" json:"email"`
	Contact1         string `gorm:"type:varchar(50);not null;default:''" json:"contact1"`
	Contact2         string `gorm:"type:varchar(50)" json:"contact2"`
	Address          string `gorm:"type:text;not null;default:''" json:"address"`
	Description      string `gorm:"type:text" json:"description"`
	TaxRules         string `gorm:"type:text" json:"taxRules"`
	InvoiceTemplate  string `gorm:"type:varchar(100)" json:"invoiceTemplate"`
	Logo             string `gorm:"type:varchar(255)" json:"logo"`
	Stamp            string `gorm:"type:varchar(255)" json:"stamp"`
	ImageUrl         string `gorm:"type:varchar(255)" json:"imageUrl"`
	SubscriptionPlan string `gorm:"type:varchar(50)" json:"subscriptionPlan"`
	SubscriptionExp  string `gorm:"type:varchar(50)" json:"subscriptionExpiry"` // Or time.Time depending on usage

	// POS discount control. PoSDiscountPercent caps the discount a POS user can
	// apply (as a % of the sale's selling-price total). When PoSDiscountUnlimited
	// is true the cap is lifted and any discount below the selling price is allowed.
	PoSDiscountPercent   float64 `gorm:"type:decimal(5,2);not null;default:0" json:"posDiscountPercent"`
	PoSDiscountUnlimited bool    `gorm:"not null;default:false" json:"posDiscountUnlimited"`

	// Relationships
	UserCompanies   []UserCompany    `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
	Roles           []Role           `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
	RolePermissions []RolePermission `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
	SystemLogs      []SystemLog      `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
}
