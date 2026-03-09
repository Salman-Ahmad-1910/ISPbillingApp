package controllers

import (
	"awesomeProject/config"
	"awesomeProject/middleware"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"
	"strings"

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
	Phone          string     `json:"phone,omitempty"`          // For recovery officers
	AreaID         *uuid.UUID `json:"areaId,omitempty"`         // For recovery officers
	FranchiseID    *uuid.UUID `json:"franchiseId,omitempty"`    // For dealers
	ParentDealerID *uuid.UUID `json:"parentDealerId,omitempty"` // For sub-dealers
	Department     string     `json:"department,omitempty"`     // For staff
	Designation    string     `json:"designation,omitempty"`    // For staff
	Salary         float64    `json:"salary,omitempty"`         // For staff
	CommissionRate float64    `json:"commissionRate,omitempty"` // For dealers

	// Recovery Officer specific fields
	SecondaryPhone string `json:"secondaryPhone,omitempty"` // For recovery officers
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

	var req CreateSubUserRequest
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

	// Update user
	user := models.User{
		Name:  req.Name,
		Email: req.Email,
		Role:  req.Role,
	}

	if req.Password != "" {
		user.Password = string(hashedPassword)
	}

	if err := tx.Model(&user).Where("id = ? AND company_id = ?", id, companyID).Updates(&user).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to update user", err.Error())
		return
	}

	// Update role-specific records
	switch req.Role {
	case "recovery_officer":
		if req.AreaID == nil {
			tx.Rollback()
			utils.ErrorResponse(c, 400, "Area ID is required for recovery officers", nil)
			return
		}
		// Update recovery officer record
		updates := map[string]interface{}{
			"name":            req.Name,
			"email":           req.Email,
			"phone":           req.Phone,
			"secondary_phone": req.SecondaryPhone,
			"area_id":         req.AreaID,
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
			"franchise_id":     req.FranchiseID,
			"parent_dealer_id": req.ParentDealerID,
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
			"area_id":         req.AreaID,
		}
		if err := tx.Model(&models.Staff{}).Where("id = ? AND company_id = ?", id, companyID).Updates(updates).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to update staff", err.Error())
			return
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

	// Get user to determine role
	var user models.User
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).First(&user).Error; err != nil {
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
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.User{}).Error; err != nil {
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
			AreaID:         req.AreaID, // Make AreaID optional
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
			FranchiseID:    req.FranchiseID,
			ParentDealerID: req.ParentDealerID,
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
			AreaID:         req.AreaID,
		}
		staff.ID = user.ID // Set ID after struct creation
		fmt.Printf("DEBUG: Creating staff with ID: %s, Name: %s, Email: %s\n", staff.ID, staff.Name, staff.Email)
		if err := tx.Create(&staff).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create staff record", err.Error())
			return
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
	if err := config.DB.Joins("JOIN user_companies ON users.id = user_companies.user_id").
		Where("user_companies.company_id = ? AND users.role != ?", companyID, "admin").
		Find(&users).Error; err != nil {
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
	if err := config.DB.Where("company_id = ?", companyID).Find(&staff).Error; err != nil {
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

		if err := config.DB.Where("id = ? AND company_id = ?", s.ID, companyID).First(&user).Error; err != nil {
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
