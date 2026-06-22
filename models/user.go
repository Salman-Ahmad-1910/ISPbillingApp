package models

import "github.com/google/uuid"

// UserCompany represents the many-to-many relationship between users and companies
type UserCompany struct {
	BaseModel
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"userId"`
	CompanyID uuid.UUID `gorm:"type:uuid;not null;index" json:"companyId"`
	UserRole  string    `gorm:"type:varchar(50);not null;column:role_in_company;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"roleInCompany"` // owner, admin, staff, recovery_officer, dealer, etc
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	Company   Company   `gorm:"foreignKey:CompanyID" json:"company"`
}

type User struct {
	BaseModel
	Name      string     `gorm:"type:varchar(255);not null" json:"name"`
	Email     string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password  string     `gorm:"type:varchar(255);not null" json:"-"`             // Hashed password
	Status    string     `gorm:"type:varchar(20);default:'active'" json:"status"` // active, inactive
	Role      string     `gorm:"type:varchar(50)" json:"role"`                    // admin, dealer, recovery_officer, sub_dealer, staff
	CreatedBy *uuid.UUID `gorm:"type:uuid;index" json:"createdBy"`                // Parent user who created this user
	Creator   *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`

	// Relationships
	UserCompanies []UserCompany `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;" json:"userCompanies"`
	CreatedUsers  []User        `gorm:"foreignKey:CreatedBy" json:"createdUsers,omitempty"`
}
