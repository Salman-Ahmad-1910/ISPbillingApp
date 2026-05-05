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
	// Remove BOM and other invisible characters
	s = strings.ReplaceAll(s, "\ufeff", "") // BOM
	s = strings.ReplaceAll(s, "\u200b", "") // Zero-width space
	s = strings.ReplaceAll(s, "\u200c", "") // Zero-width non-joiner
	s = strings.ReplaceAll(s, "\u200d", "") // Zero-width joiner

	return strings.TrimSpace(s)
}

// SubscriberImportRow represents a single row from the import file
type SubscriberImportRow struct {
	SerialNo            string  `json:"s_no"`
	SubscriberIdentity  string  `json:"subscriber_identity"`
	Name                string  `json:"name"`
	Cnic                string  `json:"cnic"`
	Phone               string  `json:"phone"`
	InstallationAddress string  `json:"installation_address"`
	PackageName         string  `json:"package_name"`
	BillingCycle        string  `json:"billing_cycle"`
	Status              string  `json:"status"`
	Balance             float64 `json:"balance"`
	AreaName            string  `json:"area_name"`
	SplitterName        string  `json:"splitter_name"`
	SplitterPort        int     `json:"splitter_port"`
	ConnectionDate      string  `json:"connection_date"`
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
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", "User not found in context")
		return
	}

	// Get company ID from context
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company not found", "Company ID not found in context")
		return
	}

	// Fetch user details
	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid user", "Unable to fetch user details")
		return
	}

	// Check if user has permission to export subscribers
	if currentUser.Role != "admin" && currentUser.Role != "owner" && currentUser.Role != "manager" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins, owners, and managers can export subscribers")
		return
	}

	// Fetch all subscribers for the company
	var subscribers []models.Subscriber
	if err := config.DB.Where("company_id = ?", companyID).Find(&subscribers).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch subscribers", err.Error())
		return
	}

	// Create Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			utils.ErrorResponse(c, 500, "Failed to close Excel file", err.Error())
		}
	}()

	// Set sheet name
	sheetName := "Subscribers"
	f.SetSheetName("Sheet1", sheetName)

	// Set headers
	headers := []string{
		"S.No", "Subscriber Identity", "Name", "CNIC", "Phone", "Installation Address",
		"Package Name", "Billing Cycle", "Status", "Balance", "Area Name", "Splitter Name", "Splitter Port", "Connection Date",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	// Add data rows
	for i, subscriber := range subscribers {
		row := i + 2
		data := []interface{}{
			i + 1, // Serial number
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
			"", // Splitter Name - not available in current model
			0,  // Splitter Port - not available in current model
			subscriber.ConnectionDate,
		}

		for j, value := range data {
			cell := fmt.Sprintf("%s%d", string(rune('A'+j)), row)
			f.SetCellValue(sheetName, cell, value)
		}
	}

	// Set headers style
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

	// Auto-fit columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 20)
	}

	// Generate file
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=subscribers_export.xlsx")
	c.Header("Content-Transfer-Encoding", "binary")

	if err := f.Write(c.Writer); err != nil {
		utils.ErrorResponse(c, 500, "Failed to write Excel file", err.Error())
		return
	}
}

// ImportSubscribers imports subscribers from Excel file
func (sie *SubscriberImportExport) ImportSubscribers(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", "User not found in context")
		return
	}

	// Get company ID from context
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Company not found", "Company ID not found in context")
		return
	}

	// Fetch user details
	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid user", "Unable to fetch user details")
		return
	}

	// Check if user has permission to import subscribers
	if currentUser.Role != "admin" && currentUser.Role != "owner" && currentUser.Role != "manager" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins, owners, and managers can import subscribers")
		return
	}

	// Parse uploaded file
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to parse file", err.Error())
		return
	}
	defer file.Close()

	// Open Excel file
	f, err := excelize.OpenReader(file)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to open Excel file", err.Error())
		return
	}
	defer func() {
		if err := f.Close(); err != nil {
			utils.ErrorResponse(c, 500, "Failed to close Excel file", err.Error())
		}
	}()

	// Get all rows - try to find the first sheet with data
	sheetList := f.GetSheetList()
	fmt.Printf("DEBUG: Found sheets: %v\n", sheetList)

	if len(sheetList) == 0 {
		utils.ErrorResponse(c, 400, "Invalid Excel file", "No sheets found in Excel file")
		return
	}

	// Try to find a sheet with data, starting with the first one
	var rows [][]string
	var sheetName string
	for _, sheet := range sheetList {
		fmt.Printf("DEBUG: Trying sheet: %s\n", sheet)
		sheetRows, err := f.GetRows(sheet)
		if err != nil {
			fmt.Printf("DEBUG: Error reading sheet %s: %v\n", sheet, err)
			continue // Try next sheet
		}
		fmt.Printf("DEBUG: Sheet %s has %d rows\n", sheet, len(sheetRows))
		if len(sheetRows) >= 2 { // At least header + 1 data row
			rows = sheetRows
			sheetName = sheet
			fmt.Printf("DEBUG: Using sheet: %s with %d rows\n", sheetName, len(rows))
			break
		}
	}

	if rows == nil {
		utils.ErrorResponse(c, 400, "Empty file", "No data found in any Excel sheet")
		return
	}

	// Validate headers
	expectedHeaders := []string{
		"S.No", "Subscriber Identity", "Name", "CNIC", "Phone", "Installation Address",
		"Package Name", "Billing Cycle", "Status", "Balance", "Area Name", "Splitter Name", "Splitter Port", "Connection Date",
	}

	if len(rows[0]) < len(expectedHeaders) {
		utils.ErrorResponse(c, 400, "Invalid headers", "Excel file doesn't have required columns")
		return
	}

	// Parse and validate rows
	var importRows []SubscriberImportRow
	var errors []SubscriberValidationError

	for i := 1; i < len(rows); i++ {
		row := rows[i]

		// Pad row with empty strings if it's shorter than expected headers
		if len(row) < len(expectedHeaders) {
			paddedRow := make([]string, len(expectedHeaders))
			copy(paddedRow, row)
			// Remaining elements stay as empty strings
			row = paddedRow
		}

		importRow, validationErrors := sie.parseAndValidateRow(row, i+1)
		if len(validationErrors) > 0 {
			errors = append(errors, validationErrors...)
			continue
		}

		importRows = append(importRows, importRow)
	}

	// If there are validation errors, return them
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

	// Import subscribers in a transaction
	tx := config.DB.Begin()
	importedCount := 0

	for _, importRow := range importRows {
		if err := sie.importSubscriber(tx, importRow, companyID.(uuid.UUID)); err != nil {
			tx.Rollback()
			errors = append(errors, SubscriberValidationError{
				Row:    0, // We don't track row numbers during actual import
				Column: "General",
				Error:  fmt.Sprintf("Failed to import subscriber %s: %s", importRow.SubscriberIdentity, err.Error()),
			})
			break
		}
		importedCount++
	}

	if len(errors) > 0 {
		tx.Rollback()
		c.JSON(500, SubscriberImportResult{
			Success:      false,
			TotalRows:    len(rows) - 1,
			ImportedRows: importedCount,
			Errors:       errors,
			Message:      "Import failed during database operation",
		})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(500, SubscriberImportResult{
			Success:      false,
			TotalRows:    len(rows) - 1,
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
		TotalRows:    len(rows) - 1,
		ImportedRows: importedCount,
		Errors:       []SubscriberValidationError{},
		Message:      fmt.Sprintf("Successfully imported %d subscribers", importedCount),
	})
}

// parseAndValidateRow parses and validates a single row
func (sie *SubscriberImportExport) parseAndValidateRow(row []string, rowNum int) (SubscriberImportRow, []SubscriberValidationError) {
	var errors []SubscriberValidationError
	var importRow SubscriberImportRow

	fmt.Printf("DEBUG: Processing row %d with %d columns: %v\n", rowNum, len(row), row)

	// Parse basic fields
	importRow.SerialNo = cleanString(row[0])
	importRow.SubscriberIdentity = cleanString(row[1])
	importRow.Name = cleanString(row[2])
	importRow.Cnic = cleanString(row[3])
	importRow.Phone = cleanString(row[4])
	importRow.InstallationAddress = cleanString(row[5])
	importRow.PackageName = cleanString(row[6])
	importRow.BillingCycle = cleanString(row[7])
	importRow.Status = cleanString(row[8])
	importRow.AreaName = cleanString(row[10])
	importRow.SplitterName = cleanString(row[11])
	importRow.SplitterPort = 0
	if len(row) > 12 && cleanString(row[12]) != "" {
		if port, err := strconv.Atoi(cleanString(row[12])); err == nil {
			importRow.SplitterPort = port
		}
	}
	importRow.ConnectionDate = cleanString(row[13])

	// Parse balance (column 9)
	if len(row) > 9 && row[9] != "" {
		if balance, err := strconv.ParseFloat(row[9], 64); err == nil {
			importRow.Balance = balance
		} else {
			errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Balance", Error: "Invalid number format"})
		}
	}

	fmt.Printf("DEBUG: Parsed - SerialNo: '%s', SubscriberIdentity: '%s', Name: '%s', Cnic: '%s', Phone: '%s'\n",
		importRow.SerialNo, importRow.SubscriberIdentity, importRow.Name, importRow.Cnic, importRow.Phone)

	// Validate required fields
	if importRow.SubscriberIdentity == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Subscriber Identity", Error: "Subscriber Identity is required"})
	}
	if importRow.Name == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Name", Error: "Name is required"})
	}
	if importRow.Cnic == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "CNIC", Error: "CNIC is required"})
	}
	if importRow.Phone == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Phone", Error: "Phone is required"})
	}
	if importRow.InstallationAddress == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Installation Address", Error: "Installation Address is required"})
	}
	if importRow.PackageName == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Package Name", Error: "Package Name is required"})
	}
	if importRow.AreaName == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Area Name", Error: "Area Name is required"})
	}
	if importRow.SplitterName == "" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Splitter Name", Error: "Splitter Name is required"})
	}
	if importRow.SplitterPort <= 0 {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Splitter Port", Error: "Splitter Port must be greater than 0"})
	}

	// Validate status
	if importRow.Status != "" && importRow.Status != "active" && importRow.Status != "inactive" && importRow.Status != "deactivated" && importRow.Status != "suspended" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Status", Error: "Status must be 'active', 'inactive', 'deactivated', or 'suspended'"})
	}

	// Validate billing cycle
	if importRow.BillingCycle != "" && importRow.BillingCycle != "monthly" && importRow.BillingCycle != "quarterly" && importRow.BillingCycle != "yearly" {
		errors = append(errors, SubscriberValidationError{Row: rowNum, Column: "Billing Cycle", Error: "Billing Cycle must be 'monthly', 'quarterly', or 'yearly'"})
	}

	return importRow, errors
}

// importSubscriber imports a single subscriber into the database
func (sie *SubscriberImportExport) importSubscriber(tx *gorm.DB, row SubscriberImportRow, companyID uuid.UUID) error {
	// Check if subscriber identity already exists
	var existingSubscriber models.Subscriber
	if err := tx.Where("subscriber_identity = ? AND company_id = ?", row.SubscriberIdentity, companyID).First(&existingSubscriber).Error; err == nil {
		return fmt.Errorf("subscriber with identity %s already exists", row.SubscriberIdentity)
	}

	// Find package by name
	var packageModel models.Package
	if err := tx.Where("name = ? AND company_id = ?", row.PackageName, companyID).First(&packageModel).Error; err != nil {
		return fmt.Errorf("package '%s' not found", row.PackageName)
	}

	// Find area by city, zone, and locality (AreaName can be any of these)
	var area models.Area
	var err error

	// Try to find area by different combinations
	areaParts := strings.Split(row.AreaName, ",")
	if len(areaParts) >= 2 {
		// Try city + zone + locality
		city := cleanString(areaParts[0])
		zone := cleanString(areaParts[1])
		locality := cleanString(areaParts[2])
		if len(areaParts) > 2 {
			err = tx.Where("city = ? AND zone = ? AND locality = ? AND company_id = ?", city, zone, locality, companyID).First(&area).Error
		} else {
			// Try city + zone
			err = tx.Where("city = ? AND zone = ? AND company_id = ?", city, zone, companyID).First(&area).Error
		}
	} else {
		// Try just city
		city := cleanString(row.AreaName)
		err = tx.Where("city = ? AND company_id = ?", city, companyID).First(&area).Error
	}

	if err != nil {
		return fmt.Errorf("area '%s' not found. Try using format: 'City, Zone, Locality' or just 'City'", row.AreaName)
	}

	// Find splitter by name
	var splitter models.Splitter
	if err := tx.Where("name = ? AND company_id = ?", row.SplitterName, companyID).First(&splitter).Error; err != nil {
		return fmt.Errorf("splitter '%s' not found", row.SplitterName)
	}

	// Validate splitter port availability
	if row.SplitterPort > 0 {
		var portCount int64
		tx.Model(&models.Subscriber{}).Where("splitter_id = ? AND splitter_port = ? AND company_id = ? AND status != 'deactivated'",
			splitter.ID, row.SplitterPort, companyID).Count(&portCount)
		if portCount > 0 {
			return fmt.Errorf("splitter port %d is already in use", row.SplitterPort)
		}

		// Validate port is within splitter limits
		if row.SplitterPort > splitter.TotalPorts {
			return fmt.Errorf("splitter port %d exceeds splitter's total ports (%d)", row.SplitterPort, splitter.TotalPorts)
		}
	}

	// Create default values for required fields that aren't in import
	defaultStatus := "active"
	if row.Status != "" {
		defaultStatus = row.Status
	}

	defaultBillingCycle := "monthly"
	if row.BillingCycle != "" {
		defaultBillingCycle = row.BillingCycle
	}

	// Create base subscriber
	subscriber := models.Subscriber{
		TenantModel:         models.TenantModel{CompanyID: companyID},
		SubscriberIdentity:  row.SubscriberIdentity,
		Name:                row.Name,
		Cnic:                row.Cnic,
		Phone:               row.Phone,
		InstallationAddress: row.InstallationAddress,
		PackageID:           packageModel.ID,
		PackageName:         row.PackageName,
		BillingCycle:        defaultBillingCycle,
		Status:              defaultStatus,
		Balance:             row.Balance,
		AreaID:              area.ID,
		AreaName:            row.AreaName,
		SplitterID:          splitter.ID,
		SplitterPort:        row.SplitterPort,
		ConnectionDate:      row.ConnectionDate,
	}

	if err := tx.Create(&subscriber).Error; err != nil {
		return fmt.Errorf("failed to create subscriber: %w", err)
	}

	return nil
}

// DownloadTemplate downloads the Excel template for import
func (sie *SubscriberImportExport) DownloadTemplate(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", "User not found in context")
		return
	}

	// Fetch user details
	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		utils.ErrorResponse(c, 401, "Invalid user", "Unable to fetch user details")
		return
	}

	// Check permissions
	if currentUser.Role != "admin" && currentUser.Role != "owner" && currentUser.Role != "manager" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins, owners, and managers can download template")
		return
	}

	// Create Excel template
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			utils.ErrorResponse(c, 500, "Failed to close Excel file", err.Error())
		}
	}()

	// Set sheet name
	sheetName := "Subscriber Import Template"
	f.SetSheetName("Sheet1", sheetName)

	// Set headers
	headers := []string{
		"S.No", "Subscriber Identity", "Name", "CNIC", "Phone", "Installation Address",
		"Package Name", "Billing Cycle", "Status", "Balance", "Area Name", "Splitter Name", "Splitter Port", "Connection Date",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	// Add sample data
	sampleData := [][]interface{}{
		{1, "SUB001", "John Doe", "1234567890123", "+1234567890", "123 Main St", "Basic Package", "monthly", "active", 0.00, "Qui irure non est d, Laboriosam placeat", "Splitter-A", 1, "2024-01-01"},
		{2, "SUB002", "Jane Smith", "9876543210987", "+0987654321", "456 Oak Ave", "Premium Package", "quarterly", "active", 1500.00, "Qui irure non est d, Laboriosam placeat", "Splitter-B", 2, "2024-01-15"},
		{3, "SUB003", "Mike Wilson", "4567890123456", "+1122334455", "789 Pine Rd", "Standard Package", "monthly", "active", 0.00, "Qui irure non est d, Laboriosam placeat", "Splitter-C", 3, "2024-02-01"},
	}

	for i, rowData := range sampleData {
		row := i + 2
		for j, value := range rowData {
			cell := fmt.Sprintf("%s%d", string(rune('A'+j)), row)
			f.SetCellValue(sheetName, cell, value)
		}
	}

	// Set headers style
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

	// Auto-fit columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 20)
	}

	// Generate file
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=subscriber_import_template.xlsx")
	c.Header("Content-Transfer-Encoding", "binary")

	if err := f.Write(c.Writer); err != nil {
		utils.ErrorResponse(c, 500, "Failed to write Excel file", err.Error())
		return
	}
}
