package middleware

import (
	"net/http"
	"strings"

	"awesomeProject/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CompanyMiddleware validates that the user has access to the requested company
func CompanyMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from JWT (should be set by auth middleware)
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		// Get company ID from header first, then query parameter
		companyIDHeader := c.GetHeader("x-company-id")
		companyIDQuery := c.Query("companyId")

		companyIDStr := companyIDHeader
		if companyIDStr == "" {
			companyIDStr = companyIDQuery
		}

		if companyIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Company ID is required (header: x-company-id or query: companyId)",
			})
			c.Abort()
			return
		}

		// Parse company ID
		companyID, err := uuid.Parse(companyIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid company ID format",
			})
			c.Abort()
			return
		}

		// Validate user-company relationship
		var userCompany models.UserCompany
		result := db.Where("user_id = ? AND company_id = ?", userID, companyID).First(&userCompany)
		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": "Access denied: User does not belong to this company",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Database error",
					"error":   result.Error.Error(),
				})
			}
			c.Abort()
			return
		}

		// Set company context
		c.Set("companyID", companyID)
		c.Set("userRoleInCompany", userCompany.UserRole)

		c.Next()
	}
}

// CompanyContextMiddleware adds company context to all database queries
func CompanyContextMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		companyID, exists := c.Get("companyID")
		if !exists {
			c.Next()
			return
		}

		// Add company scope to database queries
		c.Set("dbScope", func(db *gorm.DB) *gorm.DB {
			return db.Where("company_id = ?", companyID)
		})

		c.Next()
	}
}

// RequireCompanyHeader ensures x-company-id header is present
func RequireCompanyHeader() gin.HandlerFunc {
	return func(c *gin.Context) {
		companyID := c.GetHeader("x-company-id")
		if companyID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "x-company-id header is required",
			})
			c.Abort()
			return
		}

		// Validate UUID format
		if _, err := uuid.Parse(companyID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid company ID format",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SkipCompanyValidation routes that don't need company validation (like login, register)
func SkipCompanyValidation(paths ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, path := range paths {
			if strings.HasPrefix(c.Request.URL.Path, path) {
				c.Next()
				return
			}
		}

		// If no path matched, apply company validation
		companyID := c.GetHeader("x-company-id")
		if companyID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "x-company-id header is required",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
