package middleware

import (
	"bytes"
	"fmt"
	"io"
	"strings"
	"time"

	"awesomeProject/config"
	"awesomeProject/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditMiddleware logs all system actions for audit trail
func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Read request body for logging (but restore it for the actual handler)
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Process the request
		c.Next()

		// Skip logging for health checks and static assets
		if shouldSkipLogging(c.Request.URL.Path) {
			return
		}

		// Only log successful requests or specific errors
		statusCode := c.Writer.Status()
		if statusCode >= 200 && statusCode < 400 {
			// Extract user and company info from context
			userID, userExists := c.Get("userID")
			companyID, companyExists := c.Get("companyID")

			if userExists && companyExists {
				// Determine action and module from request
				action, module := determineActionAndModule(c.Request.Method, c.Request.URL.Path)

				// Skip logging for read actions to reduce log clutter
				if action == "read" {
					return
				}

				// Create audit log entry
				logEntry := models.SystemLog{
					UserID:      userID.(uuid.UUID),
					CompanyID:   companyID.(uuid.UUID),
					Action:      action,
					Module:      module,
					Description: generateDescription(c, action, module),
					IPAddress:   c.ClientIP(),
					UserAgent:   c.GetHeader("User-Agent"),
					Status:      "success",
					Page:        extractPageFromPath(c.Request.URL.Path),
				}

				// Log to database asynchronously
				go func() {
					if err := config.DB.Create(&logEntry).Error; err != nil {
						// Log error but don't fail the request
						gin.DefaultWriter.Write([]byte("Failed to create audit log: " + err.Error() + "\n"))
					}
				}()
			}
		}

		// Log request duration for monitoring
		duration := time.Since(startTime)
		gin.DefaultWriter.Write([]byte(
			fmt.Sprintf("[%s] %s %s %d %v\n",
				time.Now().Format("2006-01-02 15:04:05"),
				c.Request.Method,
				c.Request.URL.Path,
				statusCode,
				duration,
			),
		))
	}
}

// LogAction creates a manual audit log entry (for use in controllers)
func LogAction(userID, companyID uuid.UUID, action, module, description, ipAddress, userAgent string) {
	logEntry := models.SystemLog{
		UserID:      userID,
		CompanyID:   companyID,
		Action:      action,
		Module:      module,
		Description: description,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Status:      "success",
	}

	// Log to database asynchronously
	go func() {
		if err := config.DB.Create(&logEntry).Error; err != nil {
			gin.DefaultWriter.Write([]byte("Failed to create manual audit log: " + err.Error() + "\n"))
		}
	}()
}

// LogActionWithContext creates audit log using gin context
func LogActionWithContext(c *gin.Context, action, module, description string) {
	userID, userExists := c.Get("userID")
	companyID, companyExists := c.Get("companyID")

	if userExists && companyExists {
		LogAction(
			userID.(uuid.UUID),
			companyID.(uuid.UUID),
			action,
			module,
			description,
			c.ClientIP(),
			c.GetHeader("User-Agent"),
		)
	}
}

// extractPageFromPath extracts page name from URL path
func extractPageFromPath(path string) string {
	// Remove API prefix and extract meaningful page name
	pathParts := strings.Split(strings.Trim(path, "/"), "/")

	// Look for meaningful segments
	for i, part := range pathParts {
		if part == "api" && i+1 < len(pathParts) {
			if i+2 < len(pathParts) {
				return pathParts[i+2]
			}
		}
	}

	// Fallback to last meaningful part
	for i := len(pathParts) - 1; i >= 0; i-- {
		if pathParts[i] != "" &&
			pathParts[i] != "api" &&
			pathParts[i] != "v1" &&
			!strings.Contains(pathParts[i], "{") {
			return pathParts[i]
		}
	}

	return "unknown"
}

// shouldSkipLogging determines if a request should be skipped from audit logging
func shouldSkipLogging(path string) bool {
	skipPaths := []string{
		"/health",
		"/favicon.ico",
		"/static/",
		"/assets/",
	}

	for _, skipPath := range skipPaths {
		if strings.HasPrefix(path, skipPath) {
			return true
		}
	}
	return false
}

// determineActionAndModule extracts action and module from HTTP method and path
func determineActionAndModule(method, path string) (string, string) {
	// Default action based on HTTP method
	action := "unknown"
	switch method {
	case "GET":
		action = "read"
	case "POST":
		action = "add"
	case "PUT", "PATCH":
		action = "edit"
	case "DELETE":
		action = "delete"
	}

	// Extract module from path
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) > 0 {
		module := pathParts[0]

		// Map common API paths to modules
		moduleMap := map[string]string{
			"api":         "system",
			"auth":        "authentication",
			"users":       "users",
			"companies":   "companies",
			"subscribers": "subscribers",
			"dealers":     "dealers",
			"network":     "network",
			"billing":     "billing",
			"reports":     "reports",
			"areas":       "areas",
			"olts":        "network",
			"splitters":   "network",
			"pops":        "network",
			"invoices":    "billing",
			"payments":    "billing",
			"packages":    "billing",
			"complaints":  "support",
			"expenses":    "financial",
		}

		if mappedModule, exists := moduleMap[module]; exists {
			module = mappedModule
		}

		return action, module
	}

	return action, "unknown"
}

// generateDescription creates a human-readable description for the audit log
func generateDescription(c *gin.Context, action, module string) string {
	user, _ := c.Get("user")
	if userObj, ok := user.(models.User); ok {
		return fmt.Sprintf("%s performed %s action on %s", userObj.Name, action, module)
	}

	return fmt.Sprintf("User performed %s action on %s", action, module)
}

// GetAuditLogs retrieves audit logs for a company (for admin users)
func GetAuditLogs(db *gorm.DB, companyID uuid.UUID, limit, offset int) ([]models.SystemLog, error) {
	var logs []models.SystemLog
	err := db.Where("company_id = ?", companyID).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}

// GetAuditLogsByModule retrieves audit logs for a specific module
func GetAuditLogsByModule(db *gorm.DB, companyID uuid.UUID, module string, limit, offset int) ([]models.SystemLog, error) {
	var logs []models.SystemLog
	err := db.Where("company_id = ? AND module = ?", companyID, module).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}

// GetAuditLogsByUser retrieves audit logs for a specific user
func GetAuditLogsByUser(db *gorm.DB, companyID, userID uuid.UUID, limit, offset int) ([]models.SystemLog, error) {
	var logs []models.SystemLog
	err := db.Where("company_id = ? AND user_id = ?", companyID, userID).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}
