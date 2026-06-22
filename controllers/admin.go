package controllers

import (
	"strconv"

	"awesomeProject/config"
	"awesomeProject/middleware"
	"awesomeProject/models"
	"awesomeProject/seed"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
			al.action,
			al.module,
			al.description,
			al.ip_address,
			al.user_agent,
			al.status,
			al.page
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
	if search != "" {
		query += " AND (LOWER(u.name) LIKE LOWER(?) OR LOWER(al.action) LIKE LOWER(?) OR LOWER(al.description) LIKE LOWER(?))"
		args = append(args, "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	query += " ORDER BY al.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	type LogEntry struct {
		ID          string `json:"id"`
		Timestamp   string `json:"timestamp"`
		UserID      string `json:"userId"`
		UserName    string `json:"userName"`
		Action      string `json:"action"`
		Module      string `json:"module"`
		Description string `json:"description"`
		IPAddress   string `json:"ipAddress"`
		UserAgent   string `json:"userAgent"`
		Status      string `json:"status"`
		Page        string `json:"page"`
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

	var users []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	var actions []string
	var modules []string

	config.DB.Raw(usersQuery, companyID).Scan(&users)
	config.DB.Raw(actionsQuery, companyID).Pluck("action", &actions)
	config.DB.Raw(modulesQuery, companyID).Pluck("module", &modules)

	response := gin.H{
		"data":       logs,
		"summary":    summary,
		"users":      users,
		"actions":    actions,
		"modules":    modules,
		"topUsers":   topUsers,
		"topModules": topModules,
	}

	utils.SuccessResponse(c, "System logs retrieved", response)
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
