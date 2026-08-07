package middleware

import (
	"net/http"

	"awesomeProject/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// grantedPermissionModules maps permission IDs stored in the `user_permissions`
// table (granted via the web Roles & Permissions page) to the backend modules
// they unlock. When a user has been granted any of these permissions, the RBAC
// middleware treats them as authorized for the mapped module(s).
var grantedPermissionModules = map[string][]string{
	// Transactions -> billing
	"13304": {"billing"}, // Users Collections
	"14079": {"billing"}, // New Collection
	"13305": {"billing"}, // Allocated Collection
	"13321": {"billing"}, // Dealers Collections
	"13357": {"billing"}, // Baddebt Collection
	"13324": {"billing"}, // Transaction Type
	"13308": {"billing"}, // Reprint Slip
	"13320": {"billing"}, // Bills Creator

	// Area -> network
	"13309": {"network"},
	"13310": {"network"},
	"13311": {"network"},
	"13312": {"network"},

	// Users Profile -> billing / crm / network
	"13313": {"billing", "crm"}, // Package (billing/packages)
	"13314": {"network"},        // Box/Media (network/boxes)
	"13315": {"crm", "subscribers"},
	"13316": {"subscribers"},
	"13351": {"crm"},

	// Dealers Profile -> dealers
	"13318": {"dealers"},

	// Recovery Officer -> hr / network (officers page loads network/areas)
	"13317": {"hr", "network"},
	"13319": {"hr"},

	// Complaints -> support
	"15323": {"support"},
	"15325": {"support"},
	"15326": {"support"},
	"13342": {"support"},
	"13343": {"support"},

	// Logs -> logs
	"13334": {"logs"},
	"15328": {"logs"},
	"13335": {"logs"},

	// User Reports. Several report pages read from billing/network APIs, so they
	// also unlock those modules.
	"13307": {"reports"},   // Allocated Defaulters (subscribers)
	"13325": {"reports"},   // Users Defaulter (subscribers)
	"13326": {"reports", "billing"}, // New Users List -> billing/payments
	"13328": {"reports", "billing"}, // Package Wise List -> billing/packages
	"13329": {"reports", "billing"}, // Promise Date Report -> billing/promises
	"13330": {"reports", "billing"}, // Allocated Collections -> billing/payments
	"13355": {"reports", "billing"}, // Month Wise Collection -> billing/payments
	"13349": {"reports", "network"}, // Expiry Wise Defaulter -> network/areas
	"13356": {"reports", "billing", "network"}, // Collection Not Generated -> billing/bills, network/areas
	"13354": {"reports", "billing"}, // Monthly Collection Month Wise -> billing/payments
	"13358": {"reports", "billing", "network"}, // Unpaid Collection -> billing/invoices, network/areas
	"13306": {"reports", "billing"}, // User Collections -> billing/payments
	"13353": {"reports", "billing", "network"}, // Month Wise Defaulter -> billing/invoices, network/areas
	"13327": {"reports"},   // Deactivate User List (admin/connections)
	"15327": {"reports"},   // Subscribers Creator Summary (admin/users + admin/connections)
	"15329": {"reports", "network"}, // New Subscribers List (admin/connections + network/areas)
	"15330": {"reports", "network"}, // Subscribers Defaulters (admin/connections + network/areas)
	"15331": {"reports", "network"}, // Allocated Collections (billing/payments + admin/connections + network/areas + admin/users)
	"15332": {"reports", "network"}, // Month Wise Collection Monthly (billing/payments + admin/connections)

	// Dealers Reports -> reports + the APIs their pages load
	"13331": {"reports", "network"}, // Dealers Collection -> network/areas
	"13333": {"reports", "network"}, // New Dealers List -> network/areas
	"13350": {"reports", "billing"}, // Dealer Invoice List -> billing/subscribers, billing/invoices
	"13332": {"reports", "network"}, // Dealers Defaulter -> network/areas

	// Settings -> roles / system
	"13338": {"roles"},  // User Rights
	"13337": {"system"}, // Configurations

	// Inventory -> inventory
	"15313": {"inventory"},
	"15312": {"inventory"},
	"15309": {"inventory"},
	"15311": {"inventory"},
	"15310": {"inventory"},
	"15321": {"inventory"},
	"15314": {"inventory"},

	// Point Of Sale / Sales -> pos, sales, billing (sales page records via billing/payments)
	"15315": {"pos", "sales", "billing"},
}

// checkUserGrantedPermission verifies whether the user has been granted, via the
// web Roles & Permissions page, a permission that unlocks the given module.
func checkUserGrantedPermission(db *gorm.DB, userID, companyID uuid.UUID, module string) (bool, error) {
	// Resolve the entity IDs permissions may be saved against: the user record
	// itself plus any staff / recovery officer / dealer record sharing the email.
	entityIDs := []string{userID.String()}

	var user models.User
	if err := db.Select("email").Where("id = ?", userID).First(&user).Error; err == nil && user.Email != "" {
		var staffIDs []string
		if err := db.Model(&models.Staff{}).Where("email = ? AND company_id = ?", user.Email, companyID).Pluck("id", &staffIDs).Error; err == nil {
			entityIDs = append(entityIDs, staffIDs...)
		}

		var officerIDs []string
		if err := db.Model(&models.RecoveryOfficer{}).Where("email = ? AND company_id = ?", user.Email, companyID).Pluck("id", &officerIDs).Error; err == nil {
			entityIDs = append(entityIDs, officerIDs...)
		}

		var dealerIDs []string
		if err := db.Model(&models.Dealer{}).Where("email = ? AND company_id = ?", user.Email, companyID).Pluck("id", &dealerIDs).Error; err == nil {
			entityIDs = append(entityIDs, dealerIDs...)
		}
	}

	var perms []models.UserPermission
	if err := db.Where("user_id IN ? AND company_id = ? AND web_enabled = ?", entityIDs, companyID, true).Find(&perms).Error; err != nil {
		return false, err
	}

	for _, p := range perms {
		if modules, ok := grantedPermissionModules[p.PermissionID]; ok {
			for _, m := range modules {
				if m == module {
					return true, nil
				}
			}
		}
	}

	return false, nil
}

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
		Where("roles.name = ? AND permissions.module = ? AND permissions.action = ?",
			userCompany.UserRole, module, action).
		Where("role_permissions.company_id = ? OR role_permissions.company_id = ?",
			companyID, uuid.UUID{}).
		First(&rolePermission).Error

	if err != nil {
		if err != gorm.ErrRecordNotFound {
			return false, err
		}
		// No role-based permission found. Fall back to permissions granted
		// directly to the user via the web Roles & Permissions page.
		hasGranted, grantErr := checkUserGrantedPermission(db, userID, companyID, module)
		if grantErr != nil {
			return false, grantErr
		}
		return hasGranted, nil
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
