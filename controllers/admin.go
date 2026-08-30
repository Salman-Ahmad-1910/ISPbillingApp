package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"awesomeProject/config"
	"awesomeProject/middleware"
	"awesomeProject/models"
	"awesomeProject/seed"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateCompany handles creating a new company
func CreateCompany(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "User not authenticated", nil)
		return
	}

	var company models.Company
	if err := c.ShouldBindJSON(&company); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	// Create company in a transaction
	tx := config.DB.Begin()

	if err := tx.Create(&company).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create company", err.Error())
		return
	}

	// Create user-company relationship with owner role
	userCompany := models.UserCompany{
		UserID:    userID.(uuid.UUID),
		CompanyID: company.ID,
		UserRole:  "owner",
	}

	if err := tx.Create(&userCompany).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create user-company relationship", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit transaction", err.Error())
		return
	}

	utils.CreatedResponse(c, "Company created successfully", company)
}

// UpdateCompany handles updating company information
func UpdateCompany(c *gin.Context) {
	id := c.Param("id")

	var company models.Company
	if err := config.DB.First(&company, "id = ?", id).Error; err != nil {
		utils.ErrorResponse(c, 404, "Company not found", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&company); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	if err := config.DB.Save(&company).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update company", err.Error())
		return
	}

	utils.SuccessResponse(c, "Company updated successfully", company)
}

// DeleteCompany handles deleting a company
func DeleteCompany(c *gin.Context) {
	id := c.Param("id")

	if err := config.DB.Delete(&models.Company{}, "id = ?", id).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete company", err.Error())
		return
	}

	utils.SuccessResponse(c, "Company deleted successfully", nil)
}

// GetSystemLogs retrieves audit logs for the current company with enhanced filtering
func GetSystemLogs(c *gin.Context) {
	companyID, _ := c.Get("companyID")

	// Parse query parameters
	fromDate := c.Query("fromDate")
	toDate := c.Query("toDate")
	userID := c.Query("userId")
	action := c.Query("action")
	module := c.Query("module")
	status := c.Query("status")
	search := c.Query("search")
	actorType := c.Query("actorType")
	serial := c.Query("serial")
	connectionType := c.Query("connectionType")
	page := c.Query("page")
	format := c.Query("format")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Build enhanced query
	query := `
		SELECT 
			al.id,
			al.created_at as timestamp,
			al.user_id,
			u.name as user_name,
			u.role as user_role,
			al.action,
			al.module,
			al.description,
			al.details,
			al.user_agent,
			al.status,
			al.page,
			al.serial_numbers,
			al.user_role as logged_role
		FROM audit_logs al
		LEFT JOIN users u ON u.id = al.user_id AND u.deleted_at IS NULL
		WHERE al.company_id = ? AND al.deleted_at IS NULL
	`

	var args []interface{}
	args = append(args, companyID)

	if fromDate != "" {
		query += " AND DATE(al.created_at) >= ?"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND DATE(al.created_at) <= ?"
		args = append(args, toDate)
	}
	if userID != "" {
		query += " AND al.user_id = ?"
		args = append(args, userID)
	}
	if action != "" {
		query += " AND LOWER(al.action) LIKE LOWER(?)"
		args = append(args, "%"+action+"%")
	}
	if module != "" {
		query += " AND LOWER(al.module) LIKE LOWER(?)"
		args = append(args, "%"+module+"%")
	}
	if status != "" {
		query += " AND al.status = ?"
		args = append(args, status)
	}
	if page != "" {
		query += " AND LOWER(al.page) LIKE LOWER(?)"
		args = append(args, "%"+page+"%")
	}
	if actorType != "" {
		query += " AND LOWER(COALESCE(al.user_role,'')) = LOWER(?)"
		args = append(args, actorType)
	}
	if serial != "" {
		query += " AND (al.serial_numbers ILIKE ? OR al.details::text ILIKE ?)"
		args = append(args, "%"+serial+"%", "%"+serial+"%")
	}
	if connectionType != "" {
		query += " AND al.details::jsonb->>'connectionType' = ?"
		args = append(args, connectionType)
	}
	if search != "" {
		query += " AND (LOWER(u.name) LIKE LOWER(?) OR LOWER(al.action) LIKE LOWER(?) OR LOWER(al.description) LIKE LOWER(?) OR al.serial_numbers ILIKE ?)"
		args = append(args, "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	query += " ORDER BY al.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	type LogEntry struct {
		ID            string          `json:"id"`
		Timestamp     string          `json:"timestamp"`
		UserID        string          `json:"userId"`
		UserName      string          `json:"userName"`
		UserRole      string          `json:"userRole"`
		Action        string          `json:"action"`
		Module        string          `json:"module"`
		Description   string          `json:"description"`
		Details       json.RawMessage `json:"details"`
		UserAgent     string          `json:"userAgent"`
		Status        string          `json:"status"`
		Page          string          `json:"page"`
		SerialNumbers string          `json:"serialNumbers"`
	}

	var logs []LogEntry
	if err := config.DB.Raw(query, args...).Scan(&logs).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch system logs", err.Error())
		return
	}

	// Handle export request
	if format == "excel" {
		c.Header("Content-Disposition", "attachment; filename=system-logs.xlsx")
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		// TODO: Implement Excel export using a library like excelize
		utils.SuccessResponse(c, "Export ready", gin.H{"message": "Excel export to be implemented"})
		return
	}

	// Get summary data
	summaryQuery := `
		SELECT 
			COUNT(*) as total_logs,
			COUNT(CASE WHEN al.status = 'success' THEN 1 END) as success_count,
			COUNT(CASE WHEN al.status = 'error' THEN 1 END) as error_count,
			COUNT(CASE WHEN al.status = 'warning' THEN 1 END) as warning_count
		FROM audit_logs al
		WHERE al.company_id = ? AND al.deleted_at IS NULL
	`

	if fromDate != "" {
		summaryQuery += " AND DATE(al.created_at) >= ?"
	}
	if toDate != "" {
		summaryQuery += " AND DATE(al.created_at) <= ?"
	}

	type LogSummary struct {
		TotalLogs    int `json:"totalLogs"`
		SuccessCount int `json:"successCount"`
		ErrorCount   int `json:"errorCount"`
		WarningCount int `json:"warningCount"`
	}

	var summary LogSummary

	// Build summary query arguments separately
	var summaryArgs []interface{}
	summaryArgs = append(summaryArgs, companyID)
	if fromDate != "" {
		summaryArgs = append(summaryArgs, fromDate)
	}
	if toDate != "" {
		summaryArgs = append(summaryArgs, toDate)
	}

	if err := config.DB.Raw(summaryQuery, summaryArgs...).Scan(&summary).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch log summary", err.Error())
		return
	}

	// Get top users and modules
	topUsersQuery := `
		SELECT u.name, COUNT(*) as count
		FROM audit_logs al
		LEFT JOIN users u ON u.id = al.user_id AND u.deleted_at IS NULL
		WHERE al.company_id = ? AND al.deleted_at IS NULL
	`

	topModulesQuery := `
		SELECT module, COUNT(*) as count
		FROM audit_logs al
		WHERE al.company_id = ? AND al.deleted_at IS NULL
	`

	if fromDate != "" {
		topUsersQuery += " AND DATE(al.created_at) >= ?"
		topModulesQuery += " AND DATE(al.created_at) >= ?"
	}
	if toDate != "" {
		topUsersQuery += " AND DATE(al.created_at) <= ?"
		topModulesQuery += " AND DATE(al.created_at) <= ?"
	}

	topUsersQuery += " GROUP BY u.name ORDER BY count DESC LIMIT 5"
	topModulesQuery += " GROUP BY module ORDER BY count DESC LIMIT 5"

	type TopResult struct {
		Name  string `json:"name"`
		Count int    `json:"count"`
	}

	var topUsers []TopResult
	var topModules []TopResult

	config.DB.Raw(topUsersQuery, args[:len(args)-2]...).Scan(&topUsers)
	config.DB.Raw(topModulesQuery, args[:len(args)-2]...).Scan(&topModules)

	// Get unique values for filters
	usersQuery := "SELECT DISTINCT u.id, u.name FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.company_id = ? AND u.deleted_at IS NULL"
	actionsQuery := "SELECT DISTINCT action FROM audit_logs WHERE company_id = ? AND deleted_at IS NULL"
	modulesQuery := "SELECT DISTINCT module FROM audit_logs WHERE company_id = ? AND deleted_at IS NULL"
	rolesQuery := "SELECT DISTINCT role FROM (SELECT al.user_role AS role FROM audit_logs al WHERE al.company_id = ? AND al.deleted_at IS NULL AND al.user_role <> '' UNION SELECT u.role AS role FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.company_id = ? AND u.deleted_at IS NULL AND u.role <> '') t WHERE role IS NOT NULL ORDER BY role"

	var users []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	var actions []string
	var modules []string
	var roles []string

	config.DB.Raw(usersQuery, companyID).Scan(&users)
	config.DB.Raw(actionsQuery, companyID).Pluck("action", &actions)
	config.DB.Raw(modulesQuery, companyID).Pluck("module", &modules)
	config.DB.Raw(rolesQuery, companyID, companyID).Pluck("role", &roles)

	response := gin.H{
		"data":       logs,
		"summary":    summary,
		"users":      users,
		"actions":    actions,
		"modules":    modules,
		"roles":      roles,
		"topUsers":   topUsers,
		"topModules": topModules,
	}

	utils.SuccessResponse(c, "System logs retrieved", response)
}

// RestoreDeletedLog restores the soft-deleted record referenced by an audit log entry
func RestoreDeletedLog(c *gin.Context) {
	logID := c.Param("id")
	if logID == "" {
		utils.ErrorResponse(c, 400, "Log ID is required", nil)
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company context not found", nil)
		return
	}

	var logEntry models.SystemLog
	if err := config.DB.Where("id = ? AND company_id = ?", logID, companyID).First(&logEntry).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, 404, "Log entry not found", nil)
			return
		}
		utils.ErrorResponse(c, 500, "Failed to load log entry", err.Error())
		return
	}

	// Decode stored details (entityId + path captured at delete time)
	var row struct {
		Details string
	}
	if err := config.DB.Table("audit_logs").Unscoped().Select("details").Where("id = ?", logID).Scan(&row).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to load log details", err.Error())
		return
	}

	details := map[string]interface{}{}
	if row.Details == "" {
		utils.ErrorResponse(c, 400, "This log entry does not contain restore data", nil)
		return
	}
	if err := json.Unmarshal([]byte(row.Details), &details); err != nil {
		utils.ErrorResponse(c, 400, "Invalid restore data", err.Error())
		return
	}

	entityID, _ := details["entityId"].(string)
	path, _ := details["path"].(string)
	if entityID == "" {
		utils.ErrorResponse(c, 400, "This log entry does not contain a restorable record", nil)
		return
	}
	if _, err := uuid.Parse(entityID); err != nil {
		utils.ErrorResponse(c, 400, "Invalid entity ID in log entry", nil)
		return
	}

	table := restoreTargetForPath(path)
	if table == "" {
		utils.ErrorResponse(c, 400, "No restore mapping for this log entry", nil)
		return
	}

	restoredAt, err := restoreRecord(table, entityID, companyID.(uuid.UUID), config.DB)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to restore record", err.Error())
		return
	}

	middleware.LogActionWithContext(c, "restore", "logs", fmt.Sprintf("Restored %s record %s", table, entityID))

	utils.SuccessResponse(c, "Record restored successfully", gin.H{
		"table":      table,
		"entityId":   entityID,
		"restoredAt": restoredAt,
	})
}

// restoreTargetForPath maps a deleted URL path to the table containing the deleted record
func restoreTargetForPath(path string) string {
	switch {
	case strings.Contains(path, "/hr/staff/"):
		return "staffs"
	case strings.Contains(path, "/recovery-officers/"):
		return "recovery_officers"
	case strings.Contains(path, "/dealers/collections/"):
		return "dealer_collections"
	case strings.Contains(path, "/dealers/"):
		return "dealers"
	case strings.Contains(path, "/subscribers/"):
		return "subscribers"
	case strings.Contains(path, "/billing/payments/"):
		return "payments"
	case strings.Contains(path, "/billing/invoices/"):
		return "invoices"
	case strings.Contains(path, "/connections/"):
		return "connections"
	case strings.Contains(path, "/expenses/"):
		return "expenses"
	case strings.Contains(path, "/vendor-invoices/"):
		return "vendor_invoices"
	case strings.Contains(path, "/support-tickets/"):
		return "support_tickets"
	case strings.Contains(path, "/admin/users/"):
		return "users"
	}
	return ""
}

// restoreRecord un-deletes a soft-deleted record and its linked login account where applicable
func restoreRecord(table, entityID string, companyID uuid.UUID, db *gorm.DB) (string, error) {
	now := time.Now().Format(time.RFC3339)

	if table == "users" {
		// users table has no company_id; restore by id and re-link company membership
		if err := db.Table("users").Unscoped().Where("id = ?", entityID).Update("deleted_at", nil).Error; err != nil {
			return "", err
		}
		if err := db.Table("user_companies").Unscoped().
			Where("user_id = ? AND company_id = ?", entityID, companyID).
			Update("deleted_at", nil).Error; err != nil {
			return "", err
		}
		return now, nil
	}

	if err := db.Table(table).Unscoped().
		Where("id = ? AND company_id = ?", entityID, companyID).
		Update("deleted_at", nil).Error; err != nil {
		return "", err
	}

	switch table {
	case "staffs", "recovery_officers":
		// Role records share the user ID, restore the linked login account too
		if err := db.Table("users").Unscoped().Where("id = ?", entityID).Update("deleted_at", nil).Error; err != nil {
			return "", err
		}
		if err := db.Table("user_companies").Unscoped().
			Where("user_id = ? AND company_id = ?", entityID, companyID).
			Update("deleted_at", nil).Error; err != nil {
			return "", err
		}
	case "dealers":
		// Dealers may have a linked user account matched by email
		var dealer struct {
			Email string `json:"email"`
		}
		if err := db.Table("dealers").Unscoped().Select("email").Where("id = ?", entityID).Scan(&dealer).Error; err != nil {
			return "", err
		}
		if dealer.Email != "" {
			if err := db.Table("users").Unscoped().Where("email = ?", dealer.Email).Update("deleted_at", nil).Error; err != nil {
				return "", err
			}
			if err := db.Table("user_companies").Unscoped().
				Where("company_id = ?", companyID).
				Where("user_id IN (SELECT id FROM users WHERE email = ?)", dealer.Email).
				Update("deleted_at", nil).Error; err != nil {
				return "", err
			}
		}
	}

	return now, nil
}

// GetUserLogs retrieves audit logs for a specific user
func GetUserLogs(c *gin.Context) {
	companyID, _ := c.Get("companyID")
	userIDStr := c.Param("userId")

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID", err.Error())
		return
	}

	// Parse pagination parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Use the existing middleware function
	logs, err := middleware.GetAuditLogsByUser(config.DB, companyID.(uuid.UUID), userID, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch user logs", err.Error())
		return
	}

	utils.SuccessResponse(c, "User logs retrieved", logs)
}

// GetModuleLogs retrieves audit logs for a specific module
func GetModuleLogs(c *gin.Context) {
	companyID, _ := c.Get("companyID")
	module := c.Param("module")

	// Parse pagination parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Use the existing middleware function
	logs, err := middleware.GetAuditLogsByModule(config.DB, companyID.(uuid.UUID), module, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch module logs", err.Error())
		return
	}

	utils.SuccessResponse(c, "Module logs retrieved", logs)
}

// GetDefaultRoles returns the default roles configuration
func GetDefaultRoles(c *gin.Context) {
	defaultRoles := seed.GetDefaultRoles()
	utils.SuccessResponse(c, "Default roles retrieved", defaultRoles)
}

// SeedDefaultRoles seeds the default roles and permissions
func SeedDefaultRoles(c *gin.Context) {
	seed.DefaultRolesAndPermissions()
	utils.SuccessResponse(c, "Default roles seeded successfully", gin.H{
		"message": "Default roles and permissions have been created/updated",
	})
}
