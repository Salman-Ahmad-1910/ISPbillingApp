package models

// Company handles multi-tenancy at the root level. No TenantID itself, but has Users, etc.
type Company struct {
	BaseModel
	Name             string `gorm:"type:varchar(255);not null" json:"name"`
	Email            string `gorm:"type:varchar(255);not null" json:"email"`
	Contact1         string `gorm:"type:varchar(50);not null" json:"contact1"`
	Contact2         string `gorm:"type:varchar(50)" json:"contact2"`
	Address          string `gorm:"type:text;not null" json:"address"`
	Description      string `gorm:"type:text" json:"description"`
	TaxRules         string `gorm:"type:text" json:"taxRules"`
	InvoiceTemplate  string `gorm:"type:varchar(100)" json:"invoiceTemplate"`
	Logo             string `gorm:"type:varchar(255)" json:"logo"`
	ImageUrl         string `gorm:"type:varchar(255)" json:"imageUrl"`
	SubscriptionPlan string `gorm:"type:varchar(50)" json:"subscriptionPlan"`
	SubscriptionExp  string `gorm:"type:varchar(50)" json:"subscriptionExpiry"` // Or time.Time depending on usage

	// Relationships
	UserCompanies   []UserCompany    `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
	Roles           []Role           `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
	RolePermissions []RolePermission `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
	SystemLogs      []SystemLog      `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;" json:"-"`
}
