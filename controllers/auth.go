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
	// Load user companies and relationships - accept both active and offline users
	if err := config.DB.Preload("UserCompanies.Company").Where("email = ? AND status IN ('active', 'offline')", req.Email).First(&user).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid credentials or inactive user", nil)
		c.JSON(401, gin.H{
			"error": err,
		})
		return
	}

	// Compare hashed password with provided password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		utils.ErrorResponse(c, 401, "Invalid credentials", nil)
		return
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
	}

	utils.SuccessResponse(c, "User profile retrieved", response)
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
		Name:        "Admin",
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
	permissions := []string{
		"users_read", "users_add", "users_edit", "users_delete",
		"subscribers_read", "subscribers_add", "subscribers_edit", "subscribers_delete",
		"billing_read", "billing_add", "billing_edit", "billing_delete",
		"network_read", "network_add", "network_edit", "network_delete",
		"dealers_read", "dealers_add", "dealers_edit", "dealers_delete",
		"companies_read", "companies_add", "companies_edit", "companies_delete",
		"reports_read", "logs_read",
		"hr_read", "hr_add", "hr_edit", "hr_delete",
		"crm_read", "crm_add", "crm_edit", "crm_delete",
		"support_read", "support_add", "support_edit", "support_delete",
		"inventory_read", "inventory_add", "inventory_edit", "inventory_delete",
		"sales_read", "sales_add", "sales_edit", "sales_delete",
	}

	for _, permName := range permissions {
		permission := models.Permission{
			Module: "system", // All permissions are system-level for admin
			Action: permName,
			Name:   fmt.Sprintf("Admin %s", permName),
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
