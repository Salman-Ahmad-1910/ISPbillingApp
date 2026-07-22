package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

// SubscriberImportExport handles subscriber data import/export operations
type SubscriberImportExport struct{}

// cleanString removes hidden characters and extra spaces from Excel data
func cleanString(s string) string {
	s = strings.ReplaceAll(s, "\ufeff", "")
	s = strings.ReplaceAll(s, "\u200b", "")
	s = strings.ReplaceAll(s, "\u200c", "")
	s = strings.ReplaceAll(s, "\u200d", "")
	return strings.TrimSpace(s)
}

// SubscriberImportRow represents a parsed row from the import file (no area/package/splitter)
type SubscriberImportRow struct {
	SerialNo            string  `json:"s_no"`
	RowNum              int     `json:"row_num"`
	SubscriberIdentity  string  `json:"subscriber_identity"`
	Name                string  `json:"name"`
	Cnic                string  `json:"cnic"`
	Phone               string  `json:"phone"`
	InstallationAddress string  `json:"installation_address"`
	BillingCycle        string  `json:"billing_cycle"`
	Status              string  `json:"status"`
	Balance             float64 `json:"balance"`
	ConnectionDate      string  `json:"connection_date"`
}

// SubscriberConfirmRow is sent by the frontend after user assigns area/package/splitter
type SubscriberConfirmRow struct {
	RowNum              int     `json:"row_num"`
	SubscriberIdentity  string  `json:"subscriber_identity"`
	Name                string  `json:"name"`
	Cnic                string  `json:"cnic"`
	Phone               string  `json:"phone"`
	InstallationAddress string  `json:"installation_address"`
	PackageID           string  `json:"packageId"`
	BillingCycle        string  `json:"billing_cycle"`
	Status              string  `json:"status"`
	Balance             float64 `json:"balance"`
	AreaID              string  `json:"areaId"`
	SplitterID          string  `json:"splitterId"`
	SplitterPort        int     `json:"splitterPort"`
	ConnectionDate      string  `json:"connection_date"`
}

// SubscriberConfirmRequest is the full import request with user-assigned resources
type SubscriberConfirmRequest struct {
	Rows []SubscriberConfirmRow `json:"rows" binding:"required"`
}

// SubscriberImportResult represents the result of an import operation
type SubscriberImportResult struct {
	Success      bool                        `json:"success"`
	TotalRows    int                         `json:"totalRows"`
	ImportedRows int                         `json:"importedRows"`
	Errors       []SubscriberValidationError `json:"errors"`
	Message      string                      `json:"message"`
}

// SubscriberValidationError represents a validation error
type SubscriberValidationError struct {
	Row    int    `json:"row"`
	Column string `json:"column"`
	Error  string `json:"error"`
}

// ExportSubscribers exports subscribers to Excel format
func (sie *SubscriberImportExport) ExportSubscribers(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", "User not found in context")
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company not found", "Company ID not found in context")
		return
	}

	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid user", "Unable to fetch user details")
		return
	}

	if currentUser.Role != "admin" && currentUser.Role != "owner" && currentUser.Role != "manager" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins, owners, and managers can export subscribers")
		return
	}

	var subscribers []models.Subscriber
	if err := config.DB.Where("company_id = ?", companyID).Find(&subscribers).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch subscribers", err.Error())
		return
	}

	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			utils.ErrorResponse(c, 500, "Failed to close Excel file", err.Error())
		}
	}()

	sheetName := "Subscribers"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{
		"S.No", "Subscriber Identity", "Name", "CNIC", "Phone", "Installation Address",
		"Package Name", "Billing Cycle", "Status", "Balance", "Area Name", "Splitter Name", "Splitter Port", "Connection Date",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	for i, subscriber := range subscribers {
		row := i + 2
		data := []interface{}{
			i + 1,
			subscriber.SubscriberIdentity,
			subscriber.Name,
			subscriber.Cnic,
			subscriber.Phone,
			subscriber.InstallationAddress,
			subscriber.PackageName,
			subscriber.BillingCycle,
			subscriber.Status,
			subscriber.Balance,
			subscriber.AreaName,
			"",
			0,
			subscriber.ConnectionDate,
		}

		for j, value := range data {
			cell := fmt.Sprintf("%s%d", string(rune('A'+j)), row)
			f.SetCellValue(sheetName, cell, value)
		}
	}

	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#E6E6FA"},
			Pattern: 1,
		},
	})
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to create header style", err.Error())
		return
	}

	f.SetRowStyle(sheetName, 1, 1, headerStyle)

	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 20)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=subscribers_export.xlsx")
	c.Header("Content-Transfer-Encoding", "binary")

	if err := f.Write(c.Writer); err != nil {
		utils.ErrorResponse(c, 500, "Failed to write Excel file", err.Error())
		return
	}
}

// PreviewImportSubscribers parses Excel and returns rows for UI assignment
func (sie *SubscriberImportExport) PreviewImportSubscribers(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", "User not found in context")
		return
	}

	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid user", "Unable to fetch user details")
		return
	}

	if currentUser.Role != "admin" && currentUser.Role != "owner" && currentUser.Role != "manager" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins, owners, and managers can import subscribers")
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to parse file", err.Error())
		return
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to open Excel file", err.Error())
		return
	}
	defer f.Close()

	sheetList := f.GetSheetList()
	if len(sheetList) == 0 {
		utils.ErrorResponse(c, 400, "Invalid Excel file", "No sheets found in Excel file")
		return
	}

	var rows [][]string
	for _, sheet := range sheetList {
		sheetRows, err := f.GetRows(sheet)
		if err != nil {
			continue
		}
		if len(sheetRows) >= 2 {
			rows = sheetRows
			break
		}
	}

	if rows == nil {
		utils.ErrorResponse(c, 400, "Empty file", "No data found in any Excel sheet")
		return
	}

	isOldFormat := len(rows[0]) >= 14

	var importRows []SubscriberImportRow
	var errors []SubscriberValidationError

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if isOldFormat {
			if len(row) < 14 {
				paddedRow := make([]string, 14)
				copy(paddedRow, row)
				row = paddedRow
			}
		} else {
			if len(row) < 10 {
				paddedRow := make([]string, 10)
				copy(paddedRow, row)
				row = paddedRow
			}
		}

		var importRow SubscriberImportRow
		var rowErrors []SubscriberValidationError

		if isOldFormat {
			importRow, rowErrors = sie.parseOldFormatRow(row, i+1)
		} else {
			importRow, rowErrors = sie.parseNewFormatRow(row, i+1)
		}

		if len(rowErrors) > 0 {
			errors = append(errors, rowErrors...)
			continue
		}
		importRows = append(importRows, importRow)
	}

	if len(errors) > 0 {
		c.JSON(400, SubscriberImportResult{
			Success:      false,
			TotalRows:    len(rows) - 1,
			ImportedRows: 0,
			Errors:       errors,
			Message:      "Validation failed",
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"rows":    importRows,
		"total":   len(importRows),
	})
}

// ConfirmImportSubscribers receives the final import with user-assigned area/package/splitter
func (sie *SubscriberImportExport) ConfirmImportSubscribers(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", "User not found in context")
		return
	}

	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company not found", "Company ID not found in context")
		return
	}

	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid user", "Unable to fetch user details")
		return
	}

	if currentUser.Role != "admin" && currentUser.Role != "owner" && currentUser.Role != "manager" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins, owners, and managers can import subscribers")
		return
	}

	var req SubscriberConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid request", err.Error())
		return
	}

	if len(req.Rows) == 0 {
		utils.ErrorResponse(c, 400, "No rows", "No subscriber rows to import")
		return
	}

	cid := companyID.(uuid.UUID)
	tx := config.DB.Begin()
	importedCount := 0
	var errors []SubscriberValidationError

	for _, row := range req.Rows {
		if err := sie.importSubscriberWithIDs(tx, row, cid); err != nil {
			errors = append(errors, SubscriberValidationError{
				Row:    row.RowNum,
				Column: "General",
				Error:  fmt.Sprintf("Subscriber %s: %s", row.SubscriberIdentity, err.Error()),
			})
			continue
		}
		importedCount++
	}

	if importedCount == 0 && len(errors) > 0 {
		tx.Rollback()
		c.JSON(400, SubscriberImportResult{
			Success:      false,
			TotalRows:    len(req.Rows),
			ImportedRows: 0,
			Errors:       errors,
			Message:      "No subscribers could be imported",
		})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(500, SubscriberImportResult{
			Success:      false,
			TotalRows:    len(req.Rows),
			ImportedRows: importedCount,
			Errors: []SubscriberValidationError{{
				Row:    0,
				Column: "Database",
				Error:  "Failed to commit transaction: " + err.Error(),
			}},
			Message: "Import failed during transaction commit",
		})
		return
	}

	c.JSON(200, SubscriberImportResult{
		Success:      true,
		TotalRows:    len(req.Rows),
		ImportedRows: importedCount,
		Errors:       errors,
		Message:      fmt.Sprintf("Successfully imported %d of %d subscribers", importedCount, len(req.Rows)),
	})
}

// parseOldFormatRow handles the legacy 14-column template
func (sie *SubscriberImportExport) parseOldFormatRow(row []string, rowNum int) (SubscriberImportRow, []SubscriberValidationError) {
	var errors []SubscriberValidationError
	var importRow SubscriberImportRow
	importRow.RowNum = rowNum

	importRow.SerialNo = cleanString(row[0])
	importRow.SubscriberIdentity = cleanString(row[1])
	importRow.Name = cleanString(row[2])
	importRow.Cnic = cleanString(row[3])
	importRow.Phone = cleanString(row[4])
	importRow.InstallationAddress = cleanString(row[5])
	importRow.BillingCycle = cleanString(row[7])
	importRow.Status = cleanString(row[8])
	importRow.ConnectionDate = cleanString(row[13])

	if len(row) > 9 && row[9] != "" {
		if balance, err := strconv.ParseFloat(cleanString(row[9]), 64); err == nil {
			importRow.Balance = balance
		}
	}

	if importRow.SubscriberIdentity == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Subscriber Identity", Error: "Required"})
	}
	if importRow.Name == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Name", Error: "Required"})
	}
	if importRow.Cnic == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "CNIC", Error: "Required"})
	}
	if importRow.Phone == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Phone", Error: "Required"})
	}
	if importRow.InstallationAddress == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Address", Error: "Required"})
	}

	return importRow, errors
}

// parseNewFormatRow handles the simplified 10-column template
func (sie *SubscriberImportExport) parseNewFormatRow(row []string, rowNum int) (SubscriberImportRow, []SubscriberValidationError) {
	var errors []SubscriberValidationError
	var importRow SubscriberImportRow
	importRow.RowNum = rowNum

	importRow.SerialNo = cleanString(row[0])
	importRow.SubscriberIdentity = cleanString(row[1])
	importRow.Name = cleanString(row[2])
	importRow.Cnic = cleanString(row[3])
	importRow.Phone = cleanString(row[4])
	importRow.InstallationAddress = cleanString(row[5])
	importRow.BillingCycle = cleanString(row[6])
	importRow.Status = cleanString(row[7])
	importRow.ConnectionDate = cleanString(row[9])

	if len(row) > 8 && cleanString(row[8]) != "" {
		if balance, err := strconv.ParseFloat(cleanString(row[8]), 64); err == nil {
			importRow.Balance = balance
		}
	}

	if importRow.SubscriberIdentity == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Subscriber Identity", Error: "Required"})
	}
	if importRow.Name == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Name", Error: "Required"})
	}
	if importRow.Cnic == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "CNIC", Error: "Required"})
	}
	if importRow.Phone == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Phone", Error: "Required"})
	}
	if importRow.InstallationAddress == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Address", Error: "Required"})
	}

	if importRow.Status != "" && importRow.Status != "active" && importRow.Status != "inactive" && importRow.Status != "deactivated" && importRow.Status != "suspended" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Status", Error: "Invalid status"})
	}
	if importRow.BillingCycle != "" && importRow.BillingCycle != "monthly" && importRow.BillingCycle != "quarterly" && importRow.BillingCycle != "yearly" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Billing Cycle", Error: "Invalid billing cycle"})
	}

	return importRow, errors
}

// importSubscriberWithIDs imports a subscriber using pre-resolved UUIDs from the UI
func (sie *SubscriberImportExport) importSubscriberWithIDs(tx *gorm.DB, row SubscriberConfirmRow, companyID uuid.UUID) error {
	// Check global unique constraint (subscriber_identity has a global unique index)
	var existingGlobal models.Subscriber
	if err := tx.Unscoped().Where("subscriber_identity = ?", row.SubscriberIdentity).First(&existingGlobal).Error; err == nil {
		return fmt.Errorf("subscriber with identity %s already exists", row.SubscriberIdentity)
	}

	packageID, err := uuid.Parse(row.PackageID)
	if err != nil {
		return fmt.Errorf("invalid package ID")
	}
	areaID, err := uuid.Parse(row.AreaID)
	if err != nil {
		return fmt.Errorf("invalid area ID")
	}
	splitterID, err := uuid.Parse(row.SplitterID)
	if err != nil {
		return fmt.Errorf("invalid splitter ID")
	}

	if row.SplitterPort > 0 {
		var portCount int64
		tx.Model(&models.Subscriber{}).Where("splitter_id = ? AND splitter_port = ? AND company_id = ? AND status != 'deactivated'",
			splitterID, row.SplitterPort, companyID).Count(&portCount)
		if portCount > 0 {
			return fmt.Errorf("splitter port %d is already in use", row.SplitterPort)
		}

		var splitter models.Splitter
		if err := tx.First(&splitter, splitterID).Error; err != nil {
			return fmt.Errorf("splitter not found")
		}
		if row.SplitterPort > splitter.TotalPorts {
			return fmt.Errorf("splitter port %d exceeds splitter's total ports (%d)", row.SplitterPort, splitter.TotalPorts)
		}
	}

	var pkg models.Package
	if err := tx.First(&pkg, packageID).Error; err != nil {
		return fmt.Errorf("package not found")
	}

	var area models.Area
	if err := tx.First(&area, areaID).Error; err != nil {
		return fmt.Errorf("area not found")
	}

	status := "active"
	if row.Status != "" {
		status = row.Status
	}
	billingCycle := "monthly"
	if row.BillingCycle != "" {
		billingCycle = row.BillingCycle
	}

	subscriber := models.Subscriber{
		TenantModel:         models.TenantModel{CompanyID: companyID},
		SubscriberIdentity:  row.SubscriberIdentity,
		Name:                row.Name,
		Cnic:                row.Cnic,
		Phone:               row.Phone,
		InstallationAddress: row.InstallationAddress,
		PackageID:           packageID,
		PackageName:         pkg.Name,
		BillingCycle:        billingCycle,
		Status:              status,
		Balance:             row.Balance,
		AreaID:              areaID,
		AreaName:            area.City,
		SplitterID:          splitterID,
		SplitterPort:        row.SplitterPort,
		ConnectionDate:      row.ConnectionDate,
	}

	if err := tx.Create(&subscriber).Error; err != nil {
		return fmt.Errorf("failed to create subscriber: %w", err)
	}

	// Decrement available ports on the splitter
	if row.SplitterPort > 0 {
		tx.Model(&models.Splitter{}).Where("id = ? AND available_ports > 0", splitterID).
			Update("available_ports", gorm.Expr("available_ports - 1"))
	}

	return nil
}

// DownloadTemplate downloads the simplified Excel template for import
func (sie *SubscriberImportExport) DownloadTemplate(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", "User not found in context")
		return
	}

	_, exists = c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company not found", "Company ID not found in context")
		return
	}

	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid user", "Unable to fetch user details")
		return
	}

	if currentUser.Role != "admin" && currentUser.Role != "owner" && currentUser.Role != "manager" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins, owners, and managers can download template")
		return
	}

	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			utils.ErrorResponse(c, 500, "Failed to close Excel file", err.Error())
		}
	}()

	sheetName := "Subscriber Import Template"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{
		"S.No", "Subscriber Identity", "Name", "CNIC", "Phone", "Installation Address",
		"Billing Cycle", "Status", "Balance", "Connection Date",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	sampleData := [][]interface{}{
		{1, "SUB001", "John Doe", "1234567890123", "+1234567890", "123 Main St", "monthly", "active", 0.00, "2024-01-01"},
		{2, "SUB002", "Jane Smith", "9876543210987", "+0987654321", "456 Oak Ave", "quarterly", "active", 0.00, "2024-01-01"},
		{3, "SUB003", "Mike Wilson", "4567890123456", "+1122334455", "789 Pine Rd", "monthly", "active", 0.00, "2024-01-01"},
	}

	for i, rowData := range sampleData {
		row := i + 2
		for j, value := range rowData {
			cell := fmt.Sprintf("%s%d", string(rune('A'+j)), row)
			f.SetCellValue(sheetName, cell, value)
		}
	}

	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#E6E6FA"},
			Pattern: 1,
		},
	})
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to create header style", err.Error())
		return
	}

	f.SetRowStyle(sheetName, 1, 1, headerStyle)

	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 20)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=subscriber_import_template.xlsx")
	c.Header("Content-Transfer-Encoding", "binary")

	if err := f.Write(c.Writer); err != nil {
		utils.ErrorResponse(c, 500, "Failed to write Excel file", err.Error())
		return
	}
}
