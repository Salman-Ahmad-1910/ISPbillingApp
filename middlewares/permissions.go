package middlewares

import (
	"awesomeProject/models"
	"awesomeProject/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CheckPermission checks if user has the required permission
func CheckPermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User not authenticated")
			c.Abort()
			return
		}

		userRole, exists := c.Get("userRole")
		if !exists {
			utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "User role not found")
			c.Abort()
			return
		}

		// Admin has all permissions
		if userRole == models.RoleAdmin {
			c.Next()
			return
		}

		// Check specific role permissions
		switch userRole {
		case models.RoleDealer:
			if hasDealerPermission(permission) {
				c.Next()
				return
			}
		case models.RoleRecovery:
			if hasRecoveryOfficerPermission(permission) {
				c.Next()
				return
			}
		case models.RoleSubDealer:
			// Sub-dealers have limited permissions (subset of dealer permissions)
			if hasSubDealerPermission(permission) {
				c.Next()
				return
			}
		case models.RoleStaff:
			// Staff have basic permissions
			if hasStaffPermission(permission) {
				c.Next()
				return
			}
		}

		utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "Insufficient permissions")
		c.Abort()
	}
}

// hasDealerPermission checks if dealer role has the permission
func hasDealerPermission(permission string) bool {
	permissions := map[string]bool{
		"dashboard.view":                    true,
		"sales_summary.view":                true,
		"alerts.view":                       true,
		"orders.create":                     true,
		"orders.view":                       true,
		"orders.update":                     true,
		"orders.history.view":               true,
		"inventory.view":                    true,
		"inventory.view_allocated":          true,
		"inventory.view_details":            true,
		"inventory.request_transfer":        true,
		"invoices.view":                     true,
		"invoices.download":                 true,
		"payments.submit":                   true,
		"returns.create":                    true,
		"returns.track":                     true,
		"reports.sales.view":                true,
		"reports.stock_movement.view":       true,
		"reports.outstanding_payments.view": true,
		"profile.manage":                    true,
		"password.change":                   true,
		"notifications.manage":              true,
	}
	return permissions[permission]
}

// hasRecoveryOfficerPermission checks if recovery officer has the permission
func hasRecoveryOfficerPermission(permission string) bool {
	permissions := map[string]bool{
		"dashboard.view":           true,
		"subscribers.view":         true,
		"subscribers.manage":       true,
		"collections.view":         true,
		"collections.manage":       true,
		"reports.collections.view": true,
	}
	return permissions[permission]
}

// hasSubDealerPermission checks if sub-dealer has the permission (limited subset)
func hasSubDealerPermission(permission string) bool {
	permissions := map[string]bool{
		"dashboard.view":         true,
		"orders.view":            true,
		"orders.history.view":    true,
		"inventory.view":         true,
		"inventory.view_details": true,
		"invoices.view":          true,
		"returns.create":         true,
		"returns.track":          true,
		"reports.sales.view":     true,
		"profile.manage":         true,
		"password.change":        true,
	}
	return permissions[permission]
}

// hasStaffPermission checks if staff has the permission (basic access)
func hasStaffPermission(permission string) bool {
	permissions := map[string]bool{
		"dashboard.view":  true,
		"orders.view":     true,
		"inventory.view":  true,
		"profile.manage":  true,
		"password.change": true,
	}
	return permissions[permission]
}

// RequireDealerRole ensures user has dealer role or higher
func RequireDealerRole() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User not authenticated")
			c.Abort()
			return
		}

		if userRole == models.RoleAdmin || userRole == models.RoleDealer {
			c.Next()
			return
		}

		utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "Dealer access required")
		c.Abort()
	}
}

// RequireAdminRole ensures user has admin role
func RequireAdminRole() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User not authenticated")
			c.Abort()
			return
		}

		if userRole == models.RoleAdmin {
			c.Next()
			return
		}

		utils.ErrorResponse(c, http.StatusForbidden, "Forbidden", "Admin access required")
		c.Abort()
	}
}
