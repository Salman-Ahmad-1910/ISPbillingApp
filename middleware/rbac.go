package middleware

import (
	"net/http"

	"awesomeProject/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RBACMiddleware checks if user has permission for specific module and action
func RBACMiddleware(db *gorm.DB, module, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		companyID, exists := c.Get("companyID")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Company context not found",
			})
			c.Abort()
			return
		}

		// Check if user has permission
		hasPermission, err := checkUserPermission(db, userID.(uuid.UUID), companyID.(uuid.UUID), module, action)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Error checking permissions",
				"error":   err.Error(),
			})
			c.Abort()
			return
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Access denied: Insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// checkUserPermission verifies if a user has permission for a specific action on a module
func checkUserPermission(db *gorm.DB, userID, companyID uuid.UUID, module, action string) (bool, error) {
	// Get user's role in company
	var userCompany models.UserCompany
	err := db.Where("user_id = ? AND company_id = ?", userID, companyID).First(&userCompany).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil // User not in company
		}
		return false, err
	}

	// Owner and Admin have all permissions
	if userCompany.UserRole == "owner" || userCompany.UserRole == "admin" {
		return true, nil
	}

	// Get user's role permissions
	var rolePermission models.RolePermission
	err = db.Joins("JOIN roles ON roles.id = role_permissions.role_id").
		Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.company_id = ? AND roles.name = ? AND permissions.module = ? AND permissions.action = ?",
			companyID, userCompany.UserRole, module, action).
		First(&rolePermission).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil // No permission found
		}
		return false, err
	}

	return true, nil
}

// RequireRole middleware checks if user has specific role in company
func RequireRole(db *gorm.DB, requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		companyID, exists := c.Get("companyID")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Company context not found",
			})
			c.Abort()
			return
		}

		// Check user's role in company
		var userCompany models.UserCompany
		err := db.Where("user_id = ? AND company_id = ? AND role_in_company = ?",
			userID, companyID, requiredRole).First(&userCompany).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": "Access denied: Required role not found",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Database error",
					"error":   err.Error(),
				})
			}
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireOwnerOrAdmin middleware checks if user is owner or admin
func RequireOwnerOrAdmin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		companyID, exists := c.Get("companyID")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Company context not found",
			})
			c.Abort()
			return
		}

		// Check user's role in company
		var userCompany models.UserCompany
		err := db.Where("user_id = ? AND company_id = ? AND role_in_company IN ?",
			userID, companyID, []string{"owner", "admin"}).First(&userCompany).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": "Access denied: Owner or admin role required",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Database error",
					"error":   err.Error(),
				})
			}
			c.Abort()
			return
		}

		c.Next()
	}
}

// PermissionChecker is a helper function to check permissions in controllers
func PermissionChecker(db *gorm.DB, userID, companyID uuid.UUID, module, action string) (bool, error) {
	return checkUserPermission(db, userID, companyID, module, action)
}

// GetCompanyUsers returns all users belonging to a company (for admin users)
func GetCompanyUsers(db *gorm.DB, companyID uuid.UUID) ([]models.User, error) {
	var users []models.User
	err := db.Joins("JOIN user_companies ON user_companies.user_id = users.id").
		Where("user_companies.company_id = ?", companyID).
		Preload("UserCompanies").
		Find(&users).Error
	return users, err
}

// GetUserCompanies returns all companies a user belongs to
func GetUserCompanies(db *gorm.DB, userID uuid.UUID) ([]models.UserCompany, error) {
	var userCompanies []models.UserCompany
	err := db.Where("user_id = ?", userID).
		Preload("Company").
		Find(&userCompanies).Error
	return userCompanies, err
}
