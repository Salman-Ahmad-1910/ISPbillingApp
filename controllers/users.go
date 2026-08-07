package controllers

import (
	"awesomeProject/config"
	"awesomeProject/middleware"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"
	"strings"

	"github.com/lib/pq"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type CreateUserRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required"` // recovery_officer, dealer, staff
}

type CreateSubUserRequest struct {
	CreateUserRequest
	Phone          string  `json:"phone,omitempty"`          // For recovery officers
	AreaID         *string `json:"areaId,omitempty"`         // For recovery officers
	FranchiseID    *string `json:"franchiseId,omitempty"`    // For dealers
	ParentDealerID *string `json:"parentDealerId,omitempty"` // For sub-dealers
	Department     string  `json:"department,omitempty"`     // For staff
	Designation    string  `json:"designation,omitempty"`    // For staff
	Salary         float64 `json:"salary,omitempty"`         // For staff
	CommissionRate float64 `json:"commissionRate,omitempty"` // For dealers

	// Recovery Officer specific fields
	SecondaryPhone string `json:"secondaryPhone,omitempty"` // For recovery officers

	// Staff extended profile
	Gender        string  `json:"gender,omitempty"`
	MaritalStatus string  `json:"maritalStatus,omitempty"`
	FatherName    string  `json:"fatherName,omitempty"`
	NIC           string  `json:"nic,omitempty"`
	Address       string  `json:"address,omitempty"`
	BasicPay      float64 `json:"basicPay,omitempty"`
	LeaveAllow    float64 `json:"leaveAllow,omitempty"`
	PaymentMode   string  `json:"paymentMode,omitempty"`
	BankName      string  `json:"bankName,omitempty"`
	AccountTitle  string  `json:"accountTitle,omitempty"`
	AccountNo     string  `json:"accountNo,omitempty"`
	AppointedDate string  `json:"appointedDate,omitempty"`
	Technical     string  `json:"technical,omitempty"`
	Status        string  `json:"status,omitempty"`
	LeaveDate     string  `json:"leaveDate,omitempty"`
	PlainPassword string  `json:"plainPassword,omitempty"`
	CNICFront     string  `json:"cnicFront,omitempty"`
	CNICBack      string  `json:"cnicBack,omitempty"`
	EmployeeImage string  `json:"employeeImage,omitempty"`
	CV            string  `json:"cv,omitempty"`

	Qualifications []models.StaffQualification `json:"qualifications,omitempty"`
	Experiences    []models.StaffExperience    `json:"experiences,omitempty"`
	WorkTimes      []models.StaffWorkTime      `json:"workTimes,omitempty"`
}

type UpdateSubUserRequest struct {
	Name           string  `json:"name" binding:"required"`
	Email          string  `json:"email" binding:"required,email"`
	Password       string  `json:"password" binding:"omitempty,min=6"`
	Role           string  `json:"role" binding:"required"`
	Phone          string  `json:"phone,omitempty"`
	AreaID         *string `json:"areaId,omitempty"`
	FranchiseID    *string `json:"franchiseId,omitempty"`
	ParentDealerID *string `json:"parentDealerId,omitempty"`
	Department     string  `json:"department,omitempty"`
	Designation    string  `json:"designation,omitempty"`
	Salary         float64 `json:"salary,omitempty"`
	CommissionRate float64 `json:"commissionRate,omitempty"`
	SecondaryPhone string  `json:"secondaryPhone,omitempty"`

	// Staff extended profile
	Gender        string  `json:"gender,omitempty"`
	MaritalStatus string  `json:"maritalStatus,omitempty"`
	FatherName    string  `json:"fatherName,omitempty"`
	NIC           string  `json:"nic,omitempty"`
	Address       string  `json:"address,omitempty"`
	BasicPay      float64 `json:"basicPay,omitempty"`
	LeaveAllow    float64 `json:"leaveAllow,omitempty"`
	PaymentMode   string  `json:"paymentMode,omitempty"`
	BankName      string  `json:"bankName,omitempty"`
	AccountTitle  string  `json:"accountTitle,omitempty"`
	AccountNo     string  `json:"accountNo,omitempty"`
	AppointedDate string  `json:"appointedDate,omitempty"`
	Technical     string  `json:"technical,omitempty"`
	Status        string  `json:"status,omitempty"`
	LeaveDate     string  `json:"leaveDate,omitempty"`
	PlainPassword string  `json:"plainPassword,omitempty"`
	CNICFront     string  `json:"cnicFront,omitempty"`
	CNICBack      string  `json:"cnicBack,omitempty"`
	EmployeeImage string  `json:"employeeImage,omitempty"`
	CV            string  `json:"cv,omitempty"`

	Qualifications []models.StaffQualification `json:"qualifications,omitempty"`
	Experiences    []models.StaffExperience    `json:"experiences,omitempty"`
	WorkTimes      []models.StaffWorkTime      `json:"workTimes,omitempty"`
}

// GetRecoveryOfficers retrieves all recovery officers for a company
func GetRecoveryOfficers(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	var recoveryOfficers []models.RecoveryOfficer
	if err := config.DB.Where("company_id = ?", companyID).Find(&recoveryOfficers).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch recovery officers", err.Error())
		return
	}

	utils.SuccessResponse(c, "Recovery officers retrieved successfully", recoveryOfficers)
}

// UpdateSubUser updates a sub-user (Recovery Officer, Dealer, Staff)
func UpdateSubUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.ErrorResponse(c, 400, "User ID is required", nil)
		return
	}

	var req UpdateSubUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Validation failed", err.Error())
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	// Normalize role to lowercase
	req.Role = strings.ToLower(req.Role)

	// Parse optional UUID fields from strings
	var areaID *uuid.UUID
	if req.AreaID != nil && *req.AreaID != "" {
		if parsed, err := uuid.Parse(*req.AreaID); err == nil {
			areaID = &parsed
		}
	}
	var franchiseID *uuid.UUID
	if req.FranchiseID != nil && *req.FranchiseID != "" {
		if parsed, err := uuid.Parse(*req.FranchiseID); err == nil {
			franchiseID = &parsed
		}
	}
	var parentDealerID *uuid.UUID
	if req.ParentDealerID != nil && *req.ParentDealerID != "" {
		if parsed, err := uuid.Parse(*req.ParentDealerID); err == nil {
			parentDealerID = &parsed
		}
	}

	// Validate role
	validRoles := map[string]bool{
		"recovery_officer": true,
		"dealer":           true,
		"staff":            true,
	}
	if !validRoles[req.Role] {
		utils.ErrorResponse(c, 400, "Invalid role", "Role must be recovery_officer, dealer, or staff")
		return
	}

	// Hash password if provided
	var hashedPassword []byte
	if req.Password != "" {
		var err error
		hashedPassword, err = bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			utils.ErrorResponse(c, 500, "Error hashing password", err.Error())
			return
		}
	}

	// Start transaction
	tx := config.DB.Begin()

	// Verify user belongs to company
	var userCompany models.UserCompany
	if err := tx.Where("user_id = ? AND company_id = ?", id, companyID).First(&userCompany).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 404, "User not found in this company", err.Error())
		return
	}

	// Update user
	user := models.User{
		Name:  req.Name,
		Email: req.Email,
		Role:  req.Role,
	}

	if req.Password != "" {
		user.Password = string(hashedPassword)
	}

	if err := tx.Model(&models.User{}).Where("id = ?", id).Updates(&user).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to update user", err.Error())
		return
	}

	// Update role-specific records
	switch req.Role {
	case "recovery_officer":
		// Update recovery officer record
		updates := map[string]interface{}{
			"name":            req.Name,
			"email":           req.Email,
			"phone":           req.Phone,
			"secondary_phone": req.SecondaryPhone,
		}
		if areaID != nil {
			updates["area_id"] = areaID
		}
		if req.Password != "" {
			updates["password"] = string(hashedPassword)
		}
		if err := tx.Model(&models.RecoveryOfficer{}).Where("id = ? AND company_id = ?", id, companyID).Updates(updates).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to update recovery officer", err.Error())
			return
		}

	case "dealer":
		updates := map[string]interface{}{
			"name":             req.Name,
			"phone":            req.Phone,
			"commission_rate":  req.CommissionRate,
			"franchise_id":     franchiseID,
			"parent_dealer_id": parentDealerID,
		}
		if err := tx.Model(&models.Dealer{}).Where("id = ? AND company_id = ?", id, companyID).Updates(updates).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to update dealer", err.Error())
			return
		}

	case "staff":
		updates := map[string]interface{}{
			"name":            req.Name,
			"email":           req.Email,
			"phone":           req.Phone,
			"secondary_phone": req.SecondaryPhone,
			"designation":     req.Designation,
			"department":      req.Department,
			"salary":          req.Salary,
			"area_id":         areaID,
			"gender":          req.Gender,
			"marital_status":  req.MaritalStatus,
			"father_name":     req.FatherName,
			"nic":             req.NIC,
			"address":         req.Address,
			"basic_pay":       req.BasicPay,
			"leave_allow":     req.LeaveAllow,
			"payment_mode":    req.PaymentMode,
			"bank_name":       req.BankName,
			"account_title":   req.AccountTitle,
			"account_no":      req.AccountNo,
			"appointed_date":  req.AppointedDate,
			"technical":       req.Technical,
			"status":          req.Status,
			"leave_date":      req.LeaveDate,
			"cnic_front":      req.CNICFront,
			"cnic_back":       req.CNICBack,
			"employee_image":  req.EmployeeImage,
			"cv":              req.CV,
		}
		if req.PlainPassword != "" {
			updates["plain_password"] = req.PlainPassword
		}
		if req.Status == "" {
			updates["status"] = "working"
		}
		if err := tx.Model(&models.Staff{}).Where("id = ? AND company_id = ?", id, companyID).Updates(updates).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to update staff", err.Error())
			return
		}

		// Replace nested staff records (qualifications, experiences, work times)
		if req.Qualifications != nil || req.Experiences != nil || req.WorkTimes != nil {
			if err := tx.Where("staff_id = ?", id).Delete(&models.StaffQualification{}).Error; err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 500, "Failed to clear staff qualifications", err.Error())
				return
			}
			if err := tx.Where("staff_id = ?", id).Delete(&models.StaffExperience{}).Error; err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 500, "Failed to clear staff experiences", err.Error())
				return
			}
			if err := tx.Where("staff_id = ?", id).Delete(&models.StaffWorkTime{}).Error; err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 500, "Failed to clear staff work times", err.Error())
				return
			}
			for _, q := range req.Qualifications {
				q.StaffID = uuid.MustParse(id)
				q.CompanyID = companyID.(uuid.UUID)
				if err := tx.Create(&q).Error; err != nil {
					tx.Rollback()
					utils.ErrorResponse(c, 500, "Failed to update staff qualification", err.Error())
					return
				}
			}
			for _, e := range req.Experiences {
				e.StaffID = uuid.MustParse(id)
				e.CompanyID = companyID.(uuid.UUID)
				if err := tx.Create(&e).Error; err != nil {
					tx.Rollback()
					utils.ErrorResponse(c, 500, "Failed to update staff experience", err.Error())
					return
				}
			}
			for _, w := range req.WorkTimes {
				w.StaffID = uuid.MustParse(id)
				w.CompanyID = companyID.(uuid.UUID)
				if err := tx.Create(&w).Error; err != nil {
					tx.Rollback()
					utils.ErrorResponse(c, 500, "Failed to update staff work time", err.Error())
					return
				}
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit transaction", err.Error())
		return
	}

	utils.SuccessResponse(c, "User updated successfully", nil)
}

// DeleteSubUser deletes a sub-user (Recovery Officer, Dealer, Staff)
func DeleteSubUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.ErrorResponse(c, 400, "User ID is required", nil)
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	// Start transaction
	tx := config.DB.Begin()

	// Verify user belongs to company
	fmt.Printf("DEBUG: Verifying user-company relationship for UserID: %s, CompanyID: %s (IN DELETE)\n", id, companyID)
	var userCompany models.UserCompany
	if err := tx.Where("user_id = ? AND company_id = ?", id, companyID).First(&userCompany).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 404, "User not found in this company", err.Error())
		return
	}

	// Get user to determine role
	var user models.User
	if err := tx.Where("id = ?", id).First(&user).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 404, "User not found", err.Error())
		return
	}

	// Delete role-specific records
	switch user.Role {
	case "recovery_officer":
		if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.RecoveryOfficer{}).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to delete recovery officer", err.Error())
			return
		}

	case "dealer":
		if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.Dealer{}).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to delete dealer", err.Error())
			return
		}

	case "staff":
		if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.Staff{}).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to delete staff", err.Error())
			return
		}
	}

	// Delete user record
	if err := tx.Where("id = ?", id).Delete(&models.User{}).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to delete user", err.Error())
		return
	}

	// Delete user-company relationship
	if err := tx.Where("user_id = ? AND company_id = ?", id, companyID).Delete(&models.UserCompany{}).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to delete user-company relationship", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit transaction", err.Error())
		return
	}

	utils.SuccessResponse(c, "User deleted successfully", nil)
}
func CreateSubUser(c *gin.Context) {
	var req CreateSubUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Validation failed", err.Error())
		return
	}

	// Get current user and company from context
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "User not authenticated", nil)
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	// Validate role
	validRoles := map[string]bool{
		"manager":          true,
		"recovery_officer": true,
		"dealer":           true,
		"staff":            true,
	}
	if !validRoles[req.Role] {
		utils.ErrorResponse(c, 400, "Invalid role", "Role must be manager, recovery_officer, dealer, or staff")
		return
	}

	// Parse optional UUID fields from strings
	var areaID *uuid.UUID
	if req.AreaID != nil && *req.AreaID != "" {
		if parsed, err := uuid.Parse(*req.AreaID); err == nil {
			areaID = &parsed
		}
	}
	var franchiseID *uuid.UUID
	if req.FranchiseID != nil && *req.FranchiseID != "" {
		if parsed, err := uuid.Parse(*req.FranchiseID); err == nil {
			franchiseID = &parsed
		}
	}
	var parentDealerID *uuid.UUID
	if req.ParentDealerID != nil && *req.ParentDealerID != "" {
		if parsed, err := uuid.Parse(*req.ParentDealerID); err == nil {
			parentDealerID = &parsed
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.ErrorResponse(c, 500, "Error hashing password", err.Error())
		return
	}

	// Start transaction
	tx := config.DB.Begin()

	// Create user
	user := models.User{
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hashedPassword),
		Role:      req.Role, // Set role in users table
		Status:    "active",
		CreatedBy: func() *uuid.UUID { id := userID.(uuid.UUID); return &id }(),
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			utils.ErrorResponse(c, 409, "This email is already registered. Please use a different email address.", nil)
			return
		}
		utils.ErrorResponse(c, 500, "Failed to create user", err.Error())
		return
	}

	// Create user-company relationship
	userCompany := models.UserCompany{
		UserID:    user.ID,
		CompanyID: companyID.(uuid.UUID),
		UserRole:  req.Role,
	}

	if err := tx.Create(&userCompany).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create user-company relationship", err.Error())
		return
	}

	// Create role-specific records
	switch req.Role {
	case "manager":
		// Manager doesn't need additional records, just the user account
		fmt.Printf("DEBUG: Created manager user with ID: %s, Name: %s, Email: %s\n", user.ID, user.Name, user.Email)

	case "recovery_officer":
		// Create recovery officer record with same ID as user
		recoveryOfficer := models.RecoveryOfficer{
			TenantModel: models.TenantModel{
				CompanyID: companyID.(uuid.UUID),
			},
			Name:           req.Name,
			Email:          req.Email,
			Password:       string(hashedPassword),
			Phone:          req.Phone, // Use phone from request
			SecondaryPhone: req.SecondaryPhone,
			AreaID:         areaID,
			Status:         "active",
		}
		recoveryOfficer.ID = user.ID // Set ID after struct creation
		if err := tx.Create(&recoveryOfficer).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create recovery officer record", err.Error())
			return
		}

	case "dealer":
		// Create dealer record
		dealer := models.Dealer{
			TenantModel: models.TenantModel{
				CompanyID: companyID.(uuid.UUID),
			},
			Name:           req.Name,
			Phone:          "", // Will be updated separately
			Cnic:           "", // Will be updated separately
			CommissionRate: req.CommissionRate,
			WalletBalance:  0,
			FranchiseID:    franchiseID,
			ParentDealerID: parentDealerID,
		}
		if err := tx.Create(&dealer).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create dealer record", err.Error())
			return
		}

	case "staff":
		// Create staff record with same ID as user
		staff := models.Staff{
			TenantModel: models.TenantModel{
				CompanyID: companyID.(uuid.UUID),
			},
			Name:           req.Name,
			Email:          req.Email,
			Phone:          req.Phone,
			SecondaryPhone: req.SecondaryPhone,
			Designation:    req.Designation,
			Department:     req.Department,
			Salary:         req.Salary,
			AreaID:         areaID,
			Gender:         req.Gender,
			MaritalStatus:  req.MaritalStatus,
			FatherName:     req.FatherName,
			NIC:            req.NIC,
			Address:        req.Address,
			BasicPay:       req.BasicPay,
			LeaveAllow:     req.LeaveAllow,
			PaymentMode:    req.PaymentMode,
			BankName:       req.BankName,
			AccountTitle:   req.AccountTitle,
			AccountNo:      req.AccountNo,
			AppointedDate:  req.AppointedDate,
			Technical:      req.Technical,
			Status:         req.Status,
			LeaveDate:      req.LeaveDate,
			PlainPassword:  req.PlainPassword,
			CNICFront:      req.CNICFront,
			CNICBack:       req.CNICBack,
			EmployeeImage:  req.EmployeeImage,
			CV:             req.CV,
		}
		if staff.Status == "" {
			staff.Status = "working"
		}
		staff.ID = user.ID // Set ID after struct creation
		fmt.Printf("DEBUG: Creating staff with ID: %s, Name: %s, Email: %s\n", staff.ID, staff.Name, staff.Email)
		if err := tx.Create(&staff).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create staff record", err.Error())
			return
		}

		// Create nested staff records (qualifications, experiences, work times)
		for _, q := range req.Qualifications {
			q.StaffID = staff.ID
			q.CompanyID = companyID.(uuid.UUID)
			if err := tx.Create(&q).Error; err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 500, "Failed to create staff qualification", err.Error())
				return
			}
		}
		for _, e := range req.Experiences {
			e.StaffID = staff.ID
			e.CompanyID = companyID.(uuid.UUID)
			if err := tx.Create(&e).Error; err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 500, "Failed to create staff experience", err.Error())
				return
			}
		}
		for _, w := range req.WorkTimes {
			w.StaffID = staff.ID
			w.CompanyID = companyID.(uuid.UUID)
			if err := tx.Create(&w).Error; err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 500, "Failed to create staff work time", err.Error())
				return
			}
		}
		fmt.Printf("DEBUG: Staff created successfully with ID: %s\n", staff.ID)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Transaction commit failed", err.Error())
		return
	}

	// Log action
	middleware.LogActionWithContext(c, "add", "users",
		"Created sub-user "+req.Name+" with role "+req.Role)

	utils.SuccessResponse(c, "Sub-user created successfully", gin.H{
		"userId":    user.ID,
		"name":      user.Name,
		"email":     user.Email,
		"role":      req.Role,
		"companyId": companyID,
	})
}

// GetAllUsers returns all users for the company except admin users
func GetAllUsers(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	fmt.Printf("DEBUG: GetAllUsers called with companyID: %v\n", companyID)

	var users []models.User
	includeAdmin := c.Query("includeAdmin") == "true"
	query := config.DB.Joins("JOIN user_companies ON users.id = user_companies.user_id").
		Where("user_companies.company_id = ?", companyID)
	if !includeAdmin {
		query = query.Where("users.role != ?", "admin")
	}
	if err := query.Find(&users).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch users", err.Error())
		return
	}

	fmt.Printf("DEBUG: Found %d users (excluding admin)\n", len(users))
	for i, user := range users {
		fmt.Printf("DEBUG: User[%d] - ID: %s, Name: %s, Email: %s, Role: %s\n", i, user.ID, user.Name, user.Email, user.Role)
	}

	utils.SuccessResponse(c, "Users retrieved successfully", users)
}

// GetStaff returns all staff members for the current company
func GetStaff(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	fmt.Printf("DEBUG: GetStaff called with companyID: %v (type: %T)\n", companyID, companyID)

	var staff []models.Staff
	if err := config.DB.
		Where("company_id = ?", companyID).
		Preload("Qualifications").
		Preload("Experiences").
		Preload("WorkTimes").
		Find(&staff).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch staff", err.Error())
		return
	}

	fmt.Printf("DEBUG: Found %d staff records\n", len(staff))
	for i, s := range staff {
		fmt.Printf("DEBUG: Staff[%d] - ID: %s, Name: %s, Email: %s, CompanyID: %s\n", i, s.ID, s.Name, s.Email, s.CompanyID)
	}

	// First, let's try to return all staff records without user matching to test
	if len(staff) == 0 {
		fmt.Printf("DEBUG: No staff records found, returning empty array\n")
		utils.SuccessResponse(c, "Staff retrieved successfully", []gin.H{})
		return
	}

	// Try to find users for each staff member
	var staffWithUsers []gin.H
	var usersFound int = 0
	var usersNotFound int = 0

	for _, s := range staff {
		var user models.User
		fmt.Printf("DEBUG: Looking for user with ID: %s and companyID: %v\n", s.ID, companyID)

		if err := config.DB.Where("id = ?", s.ID).First(&user).Error; err != nil {
			fmt.Printf("DEBUG: User not found for staff ID %s: %v\n", s.ID, err)
			usersNotFound++

			// For now, include staff without user data to see what we have
			staffWithUser := gin.H{
				"id":             s.ID,
				"name":           s.Name,
				"email":          s.Email,
				"phone":          s.Phone,
				"secondaryPhone": s.SecondaryPhone,
				"designation":    s.Designation,
				"department":     s.Department,
				"salary":         s.Salary,
				"areaId":         s.AreaID,
				"companyId":      s.CompanyID,
				"gender":         s.Gender,
				"maritalStatus":  s.MaritalStatus,
				"fatherName":     s.FatherName,
				"nic":            s.NIC,
				"address":        s.Address,
				"basicPay":       s.BasicPay,
				"leaveAllow":     s.LeaveAllow,
				"paymentMode":    s.PaymentMode,
				"bankName":       s.BankName,
				"accountTitle":   s.AccountTitle,
				"accountNo":      s.AccountNo,
				"appointedDate":  s.AppointedDate,
				"technical":      s.Technical,
				"status":         s.Status,
				"leaveDate":      s.LeaveDate,
				"plainPassword":  s.PlainPassword,
				"cnicFront":      s.CNICFront,
				"cnicBack":       s.CNICBack,
				"employeeImage":  s.EmployeeImage,
				"cv":             s.CV,
				"qualifications": s.Qualifications,
				"experiences":    s.Experiences,
				"workTimes":      s.WorkTimes,
				"userEmail":      nil,
				"userStatus":     nil,
				"createdAt":      s.CreatedAt,
				"updatedAt":      s.UpdatedAt,
				"debug":          "User not found",
			}
			staffWithUsers = append(staffWithUsers, staffWithUser)
			continue
		}

		fmt.Printf("DEBUG: Found user for staff ID %s: %s\n", s.ID, user.Email)
		usersFound++

		staffWithUser := gin.H{
			"id":             s.ID,
			"name":           s.Name,
			"email":          s.Email,
			"phone":          s.Phone,
			"secondaryPhone": s.SecondaryPhone,
			"designation":    s.Designation,
			"department":     s.Department,
			"salary":         s.Salary,
			"areaId":         s.AreaID,
			"companyId":      s.CompanyID,
			"gender":         s.Gender,
			"maritalStatus":  s.MaritalStatus,
			"fatherName":     s.FatherName,
			"nic":            s.NIC,
			"address":        s.Address,
			"basicPay":       s.BasicPay,
			"leaveAllow":     s.LeaveAllow,
			"paymentMode":    s.PaymentMode,
			"bankName":       s.BankName,
			"accountTitle":   s.AccountTitle,
			"accountNo":      s.AccountNo,
			"appointedDate":  s.AppointedDate,
			"technical":      s.Technical,
			"status":         s.Status,
			"leaveDate":      s.LeaveDate,
			"plainPassword":  s.PlainPassword,
			"cnicFront":      s.CNICFront,
			"cnicBack":       s.CNICBack,
			"employeeImage":  s.EmployeeImage,
			"cv":             s.CV,
			"qualifications": s.Qualifications,
			"experiences":    s.Experiences,
			"workTimes":      s.WorkTimes,
			"userEmail":      user.Email,
			"userStatus":     user.Status,
			"createdAt":      s.CreatedAt,
			"updatedAt":      s.UpdatedAt,
			"debug":          "User found",
		}
		staffWithUsers = append(staffWithUsers, staffWithUser)
	}

	fmt.Printf("DEBUG: Returning %d staff records (users found: %d, users not found: %d)\n", len(staffWithUsers), usersFound, usersNotFound)

	// Return empty array instead of null if no staff found
	if len(staffWithUsers) == 0 {
		utils.SuccessResponse(c, "Staff retrieved successfully", []gin.H{})
		return
	}

	utils.SuccessResponse(c, "Staff retrieved successfully", staffWithUsers)
}

// GetCompanyUsers returns all users for the current company
func GetUserDetails(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		utils.ErrorResponse(c, 400, "User ID is required", nil)
		return
	}

	// Parse UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID format", nil)
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	// Verify user belongs to current company
	var userCompany models.UserCompany
	err = config.DB.Where("user_id = ? AND company_id = ?", userUUID, companyID).First(&userCompany).Error
	if err != nil {
		utils.ErrorResponse(c, 404, "User not found in this company", nil)
		return
	}

	// Get user with relationships
	var user models.User
	err = config.DB.Preload("UserCompanies.Company").
		Preload("CreatedUsers").
		Where("id = ?", userUUID).First(&user).Error
	if err != nil {
		utils.ErrorResponse(c, 404, "User not found", nil)
		return
	}

	utils.SuccessResponse(c, "User details retrieved", user)
}

// UpdateUserRole updates a user's role in the company
func UpdateUserRole(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		utils.ErrorResponse(c, 400, "User ID is required", nil)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID format", nil)
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Validation failed", err.Error())
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	// Update user-company relationship
	result := config.DB.Model(&models.UserCompany{}).
		Where("user_id = ? AND company_id = ?", userUUID, companyID).
		Update("role_in_company", req.Role)

	if result.Error != nil {
		utils.ErrorResponse(c, 500, "Failed to update user role", result.Error.Error())
		return
	}

	if result.RowsAffected == 0 {
		utils.ErrorResponse(c, 404, "User not found in this company", nil)
		return
	}

	// Log action
	middleware.LogActionWithContext(c, "edit", "users",
		"Updated user role to "+req.Role)

	utils.SuccessResponse(c, "User role updated successfully", nil)
}

// DeleteUser removes a user from the company
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		utils.ErrorResponse(c, 400, "User ID is required", nil)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID format", nil)
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	// Check if user exists in company
	var userCompany models.UserCompany
	err = config.DB.Where("user_id = ? AND company_id = ?", userUUID, companyID).First(&userCompany).Error
	if err != nil {
		utils.ErrorResponse(c, 404, "User not found in this company", nil)
		return
	}

	// Start transaction
	tx := config.DB.Begin()

	// Delete user-company relationship
	if err := tx.Delete(&userCompany).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to remove user from company", err.Error())
		return
	}

	// Soft delete user (or you could keep them for audit)
	if err := tx.Delete(&models.User{}, userUUID).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to delete user", err.Error())
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Transaction commit failed", err.Error())
		return
	}

	// Log action
	middleware.LogActionWithContext(c, "delete", "users",
		"Deleted user from company")

	utils.SuccessResponse(c, "User deleted successfully", nil)
}
