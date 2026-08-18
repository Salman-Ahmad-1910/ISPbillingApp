package controllers

import (
	"fmt"
	"log"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"` // Note: In a real app we'd track hashed passwords
}

type RegisterRequest struct {
	Name        string `json:"name" binding:"required"`
	CompanyName string `json:"companyName" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
}

type CreateCompanyRequest struct {
	Name            string `json:"name" binding:"required"`
	Email           string `json:"email" binding:"required,email"`
	Contact1        string `json:"contact1" binding:"required"`
	Contact2        string `json:"contact2"`
	Address         string `json:"address" binding:"required"`
	Description     string `json:"description"`
	TaxRules        string `json:"taxRules"`
	InvoiceTemplate string `json:"invoiceTemplate"`
	Role            string `json:"role" binding:"required,oneof=owner manager"`
	Password        string `json:"password" binding:"required_if=Role manager,min=6"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Validation failed", err.Error())
		return
	}

	var user models.User
	// Accept any status — the password check is the real gatekeeper.
	// Use ILIKE for case-insensitive email match.
	if err := config.DB.Preload("UserCompanies.Company").Where("LOWER(email) = LOWER(?)", req.Email).First(&user).Error; err != nil {
		log.Printf("Login failed for email=%s: %v", req.Email, err)
		utils.ErrorResponse(c, 401, "Invalid credentials or inactive user", nil)
		return
	}

	// Compare hashed password with provided password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		// Fallback for legacy plaintext passwords (self-healing migration).
		// Only matches when the stored value is the raw password, then upgrades it.
		if user.Password != req.Password {
			log.Printf("Password mismatch for user %s (id=%s): %v | stored hash prefix=%s", req.Email, user.ID, err, user.Password[:min(len(user.Password), 10)])
			utils.ErrorResponse(c, 401, "Invalid credentials", nil)
			return
		}
		hashedPassword, herr := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if herr == nil {
			if uerr := config.DB.Model(&models.User{}).Where("id = ?", user.ID).Update("password", string(hashedPassword)).Error; uerr != nil {
				log.Printf("Failed to upgrade plaintext password for user %s: %v", req.Email, uerr)
			} else {
				user.Password = string(hashedPassword)
			}
		}
	}

	// Set user status back to active when logging in
	if user.Status != "active" {
		if err := config.DB.Model(&models.User{}).Where("id = ?", user.ID).Update("status", "active").Error; err != nil {
			log.Printf("Failed to update user status to active: %v", err)
			// Continue anyway, but log the error
		}
	}

	// Get first company for user (in real app, this would be selectable)
	if len(user.UserCompanies) == 0 {
		utils.ErrorResponse(c, 401, "User has no company access", nil)
		return
	}

	firstCompany := user.UserCompanies[0]
	token, err := utils.GenerateToken(user.ID, firstCompany.CompanyID, firstCompany.UserRole)
	if err != nil {
		log.Println("Token generation error:", err)
		utils.ErrorResponse(c, 500, "Internal server error", nil)
		return
	}

	utils.SuccessResponse(c, "Login successful", gin.H{
		"token": token,
		"user": gin.H{
			"id":        user.ID,
			"name":      user.Name,
			"email":     user.Email,
			"companyId": firstCompany.CompanyID,
			"role":      firstCompany.UserRole,
		},
	})
}

// GetMe retrieves the currently authenticated user
func GetMe(c *gin.Context) {
	userID, _ := c.Get("userID")

	var user models.User
	if err := config.DB.Preload("UserCompanies.Company").First(&user, "id = ?", userID).Error; err != nil {
		utils.ErrorResponse(c, 404, "User not found", nil)
		return
	}

	// Return user with their company information
	response := gin.H{
		"id":         user.ID,
		"name":       user.Name,
		"email":      user.Email,
		"status":     user.Status,
		"role":       user.Role, // Add user's direct role
		"created_at": user.CreatedAt,
		"updated_at": user.UpdatedAt,
	}

	// Add company information if user has companies
	if len(user.UserCompanies) > 0 {
		firstCompany := user.UserCompanies[0]
		response["company"] = gin.H{
			"id":   firstCompany.Company.ID,
			"name": firstCompany.Company.Name,
		}
		response["role"] = firstCompany.UserRole
		response["company_id"] = firstCompany.CompanyID

		// Include granted page/feature permissions for this user in the company.
		permissions, configured := getUserPermissionIDs(user.ID, firstCompany.CompanyID, user.Email)
		response["permissions"] = permissions
		response["permissionsConfigured"] = configured
	}

	utils.SuccessResponse(c, "User profile retrieved", response)
}

// getUserPermissionIDs returns the web-enabled permission IDs granted to a user
// within a company. Permissions may be saved against the user record itself or
// against the linked staff / recovery officer / dealer record (which can carry a
// different primary key), so those are resolved via the user's email.
func getUserPermissionIDs(userID uuid.UUID, companyID uuid.UUID, email string) ([]string, bool) {
	entityIDs := []string{userID.String()}

	var staffIDs []string
	config.DB.Model(&models.Staff{}).Where("email = ? AND company_id = ?", email, companyID).Pluck("id", &staffIDs)
	entityIDs = append(entityIDs, staffIDs...)

	var officerIDs []string
	config.DB.Model(&models.RecoveryOfficer{}).Where("email = ? AND company_id = ?", email, companyID).Pluck("id", &officerIDs)
	entityIDs = append(entityIDs, officerIDs...)

	var dealerIDs []string
	config.DB.Model(&models.Dealer{}).Where("email = ? AND company_id = ?", email, companyID).Pluck("id", &dealerIDs)
	entityIDs = append(entityIDs, dealerIDs...)

	var perms []models.UserPermission
	if err := config.DB.Where("user_id IN ? AND company_id = ?", entityIDs, companyID).Find(&perms).Error; err != nil {
		return nil, false
	}

	ids := make([]string, 0, len(perms))
	for _, p := range perms {
		if p.WebEnabled {
			ids = append(ids, p.PermissionID)
		}
	}

	return ids, len(perms) > 0
}

// Logout handles user logout
func Logout(c *gin.Context) {
	// Clear any session data if needed
	// In a real app with JWT, the token would be invalidated server-side

	utils.SuccessResponse(c, "Logged out successfully", gin.H{
		"message": "You have been successfully logged out",
	})
}

// UpdateUserStatus updates user's online status
func UpdateUserStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "User not authenticated", nil)
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	// Update user status
	if err := config.DB.Model(&models.User{}).Where("id = ?", userID).Update("status", req.Status).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update user status", err.Error())
		return
	}

	utils.SuccessResponse(c, "User status updated", gin.H{
		"status": req.Status,
	})
}

// GetUserCompanies returns all companies the user belongs to
func GetUserCompanies(c *gin.Context) {
	userID, _ := c.Get("userID")

	var userCompanies []models.UserCompany
	if err := config.DB.Preload("Company").Where("user_id = ?", userID).Find(&userCompanies).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch companies", err.Error())
		return
	}

	var companies []gin.H
	for _, uc := range userCompanies {
		companies = append(companies, gin.H{
			"id":                 uc.Company.ID,
			"name":               uc.Company.Name,
			"logo":               uc.Company.Logo,
			"stamp":              uc.Company.Stamp,
			"contact1":           uc.Company.Contact1,
			"contact2":           uc.Company.Contact2,
			"email":              uc.Company.Email,
			"address":            uc.Company.Address,
			"description":        uc.Company.Description,
			"taxRules":           uc.Company.TaxRules,
			"invoiceTemplate":    uc.Company.InvoiceTemplate,
			"subscriptionPlan":   uc.Company.SubscriptionPlan,
			"subscriptionExpiry": uc.Company.SubscriptionExp,
			"role":               uc.UserRole,
			"user_company_id":    uc.ID,
		})
	}

	utils.SuccessResponse(c, "Companies retrieved", companies)
}

// CreateUserCompany handles creating a new company for the current user
func CreateUserCompany(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "User not authenticated", nil)
		return
	}

	var req CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	// Create company in a transaction
	tx := config.DB.Begin()

	company := models.Company{
		Name:            req.Name,
		Email:           req.Email,
		Contact1:        req.Contact1,
		Contact2:        req.Contact2,
		Address:         req.Address,
		Description:     req.Description,
		TaxRules:        req.TaxRules,
		InvoiceTemplate: req.InvoiceTemplate,
	}

	if err := tx.Create(&company).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create company", err.Error())
		return
	}

	// Create user-company relationship with specified role
	userCompany := models.UserCompany{
		UserID:    userID.(uuid.UUID),
		CompanyID: company.ID,
		UserRole:  req.Role,
	}

	if err := tx.Create(&userCompany).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create user-company relationship", err.Error())
		return
	}

	// If role is manager, create a separate user account
	if req.Role == "manager" {
		// Hash the password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to hash password", err.Error())
			return
		}

		// Create manager user account
		managerUser := models.User{
			Name:     req.Name,
			Email:    req.Email,
			Password: string(hashedPassword),
			Role:     "manager", // Set role in users table
			Status:   "active",
		}

		if err := tx.Create(&managerUser).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create manager user", err.Error())
			return
		}

		// Create user-company relationship for the manager
		managerUserCompany := models.UserCompany{
			UserID:    managerUser.ID,
			CompanyID: company.ID,
			UserRole:  "manager",
		}

		if err := tx.Create(&managerUserCompany).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create manager user-company relationship", err.Error())
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit transaction", err.Error())
		return
	}

	utils.CreatedResponse(c, "Company created successfully", company)
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Validation failed", err.Error())
		return
	}

	// fmt.Println("RegisterRequest: ", req)
	// Atomic transaction
	tx := config.DB.Begin()

	// 1. Create Company
	company := models.Company{
		Name:  req.CompanyName,
		Email: req.Email, // Default company email to user email
	}
	if err := tx.Create(&company).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create company", err.Error())
		return
	}

	fmt.Println("company: ", company.ID)

	// 2. Create Admin Role for this company
	adminRole := models.Role{
		TenantModel: models.TenantModel{
			CompanyID: company.ID,
		},
		Name:        "admin",
		Description: "Full administrative access",
		Permissions: "all", // Temporary fix for legacy schema
	}
	fmt.Println("adminRole: ", adminRole)

	if err := tx.Create(&adminRole).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create admin role", err.Error())
		return
	}

	// 2.1. Create basic permissions for the admin role
	permissions := []struct{ Module, Action string }{
		{"users", "read"}, {"users", "add"}, {"users", "edit"}, {"users", "delete"},
		{"subscribers", "read"}, {"subscribers", "add"}, {"subscribers", "edit"}, {"subscribers", "delete"},
		{"billing", "read"}, {"billing", "add"}, {"billing", "edit"}, {"billing", "delete"},
		{"network", "read"}, {"network", "add"}, {"network", "edit"}, {"network", "delete"},
		{"dealers", "read"}, {"dealers", "add"}, {"dealers", "edit"}, {"dealers", "delete"},
		{"companies", "read"}, {"companies", "add"}, {"companies", "edit"}, {"companies", "delete"},
		{"reports", "read"}, {"logs", "read"},
		{"hr", "read"}, {"hr", "add"}, {"hr", "edit"}, {"hr", "delete"},
		{"crm", "read"}, {"crm", "add"}, {"crm", "edit"}, {"crm", "delete"},
		{"support", "read"}, {"support", "add"}, {"support", "edit"}, {"support", "delete"},
		{"inventory", "read"}, {"inventory", "add"}, {"inventory", "edit"}, {"inventory", "delete"},
		{"sales", "read"}, {"sales", "add"}, {"sales", "edit"}, {"sales", "delete"},
	}

	for _, perm := range permissions {
		permission := models.Permission{
			Module: perm.Module,
			Action: perm.Action,
			Name:   fmt.Sprintf("Admin %s_%s", perm.Module, perm.Action),
		}
		if err := tx.Create(&permission).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create permission", err.Error())
			return
		}

		// Create role-permission relationship
		rolePermission := models.RolePermission{
			RoleID:       adminRole.ID,
			PermissionID: permission.ID,
			CompanyID:    company.ID,
		}
		if err := tx.Create(&rolePermission).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to create role-permission", err.Error())
			return
		}
	}

	// 3. Create User with hashed password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to hash password", err.Error())
		return
	}

	user := models.User{
		BaseModel: models.BaseModel{},
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hashedPassword), // Store hashed password
		Role:      "admin",                // Set role in users table
		Status:    "active",
	}
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create user", err.Error())
		return
	}

	// 4. Create UserCompany relationship
	userCompany := models.UserCompany{
		UserID:    user.ID,
		CompanyID: company.ID,
		UserRole:  "admin",
	}
	if err := tx.Create(&userCompany).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create user-company relationship", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Transaction commit failed", err.Error())
		return
	}

	// Generate token for auto-login after signup
	token, err := utils.GenerateToken(user.ID, company.ID, "admin")
	if err != nil {
		log.Println("Token generation error after signup:", err)
		// Don't fail the whole registration if token fails, but let them login manually
		utils.SuccessResponse(c, "User registered successfully", gin.H{
			"userId":    user.ID,
			"companyId": company.ID,
		})
		return
	}

	utils.SuccessResponse(c, "User registered successfully", gin.H{
		"token": token,
		"user": gin.H{
			"id":        user.ID,
			"name":      user.Name,
			"email":     user.Email,
			"companyId": company.ID,
			"role":      "admin",
		},
	})
}
