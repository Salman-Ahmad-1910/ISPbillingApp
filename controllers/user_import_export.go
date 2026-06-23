package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserImportExport handles user data import/export operations
type UserImportExport struct{}

// UserImportRow represents a single row from the import file
type UserImportRow struct {
	SerialNo string `json:"s_no"`
	Name     string `json:"name"`
	UserName string `json:"user_name"`
	PkgID    string `json:"pkg_id"`
	Contact  string `json:"contact"`
	Address  string `json:"address"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// ImportResult represents the result of an import operation
type ImportResult struct {
	Success      bool                    `json:"success"`
	TotalRows    int                     `json:"totalRows"`
	ImportedRows int                     `json:"importedRows"`
	Errors       []ImportValidationError `json:"errors"`
	Message      string                  `json:"message"`
}

// ImportValidationError represents a validation error
type ImportValidationError struct {
	Row    int    `json:"row"`
	Column string `json:"column"`
	Error  string `json:"error"`
}

// ExportUsers exports users to Excel format
func (uie *UserImportExport) ExportUsers(c *gin.Context) {
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

	// Check if user has permission to export users
	if currentUser.Role != "admin" && currentUser.Role != "owner" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins and owners can export users")
		return
	}

	// Fetch all users for the company with their role-specific data
	var users []models.User
	if err := config.DB.Preload("UserCompanies", "company_id = ?", companyID).Find(&users).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch users", err.Error())
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
	sheetName := "Users"
	f.SetSheetName("Sheet1", sheetName)

	// Set headers
	headers := []string{
		"S.No", "Name", "User Name", "Package ID", "Contact", "Address", "Password", "Role",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	// Add data rows
	for i, user := range users {
		row := i + 2
		data := []interface{}{
			i + 1, // Serial number
			user.Name,
			user.Email, // Using email as user_name
			"",         // Package ID - not available in current model
			"",         // Contact - not available in base User model
			"",         // Address - not available in current model
			"",         // Password - left blank on export; hashes cannot be reversed
			user.Role,  // Include role
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
		f.SetColWidth(sheetName, col, col, 15)
	}

	// Generate file
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=users_export.xlsx")
	c.Header("Content-Transfer-Encoding", "binary")

	if err := f.Write(c.Writer); err != nil {
		utils.ErrorResponse(c, 500, "Failed to write Excel file", err.Error())
		return
	}
}

// getRoleSpecificData fetches role-specific data for a user
func (uie *UserImportExport) getRoleSpecificData(userID, companyID uuid.UUID) []interface{} {
	var roleData []interface{}

	// Default empty values
	roleData = append(roleData, "", "", "", "", "", "", "", "", "", "")

	// Get user's role
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return roleData
	}

	switch user.Role {
	case "recovery_officer":
		var officer models.RecoveryOfficer
		if err := config.DB.Where("id = ? AND company_id = ?", userID, companyID).First(&officer).Error; err == nil {
			roleData = []interface{}{
				officer.Phone,
				officer.SecondaryPhone,
				uie.uuidToString(officer.AreaID),
				"", "", "", "", "", "", "", // Empty fields for other roles
			}
		}

	case "dealer":
		var dealer models.Dealer
		if err := config.DB.Where("id = ? AND company_id = ?", userID, companyID).First(&dealer).Error; err == nil {
			roleData = []interface{}{
				"", "", "", // Empty fields for recovery officer
				dealer.Cnic,
				dealer.CommissionRate,
				uie.uuidToString(dealer.FranchiseID),
				uie.uuidToString(dealer.ParentDealerID),
				"", "", "", "", // Empty fields for staff
			}
		}

	case "staff":
		var staff models.Staff
		if err := config.DB.Where("id = ? AND company_id = ?", userID, companyID).First(&staff).Error; err == nil {
			roleData = []interface{}{
				"", "", "", // Empty fields for recovery officer
				"", "", "", "", "", // Empty fields for dealer
				staff.Designation,
				staff.Department,
				staff.Salary,
				uie.uuidToString(staff.AreaID),
			}
		}
	}

	return roleData
}

// uuidToString safely converts UUID to string
func (uie *UserImportExport) uuidToString(u *uuid.UUID) string {
	if u == nil {
		return ""
	}
	return u.String()
}

// ImportUsers imports users from Excel file
func (uie *UserImportExport) ImportUsers(c *gin.Context) {
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

	// Check if user has permission to import users
	if currentUser.Role != "admin" && currentUser.Role != "owner" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins and owners can import users")
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
		"S.No", "Name", "User Name", "Package ID", "Contact", "Address", "Password", "Role",
	}

	if len(rows[0]) < len(expectedHeaders) {
		utils.ErrorResponse(c, 400, "Invalid headers", "Excel file doesn't have required columns. Password column is required.")
		return
	}

	// Ensure the Password column is present (at index 6)
	if strings.TrimSpace(rows[0][6]) != "Password" {
		c.JSON(400, ImportResult{
			Success:      false,
			TotalRows:    len(rows) - 1,
			ImportedRows: 0,
			Errors: []ImportValidationError{{
				Row:    1,
				Column: "Password",
				Error:  "User passwords are required",
			}},
			Message: "User passwords are required",
		})
		return
	}

	// Parse and validate rows
	var importRows []UserImportRow
	var errors []ImportValidationError

	for i := 1; i < len(rows); i++ {
		row := rows[i]

		// Pad row with empty strings if it's shorter than expected headers
		if len(row) < len(expectedHeaders) {
			paddedRow := make([]string, len(expectedHeaders))
			copy(paddedRow, row)
			// Remaining elements stay as empty strings
			row = paddedRow
		}

		importRow, validationErrors := uie.parseAndValidateRow(row, i+1)
		if len(validationErrors) > 0 {
			errors = append(errors, validationErrors...)
			continue
		}

		importRows = append(importRows, importRow)
	}

	// If there are validation errors, return them
	if len(errors) > 0 {
		c.JSON(400, ImportResult{
			Success:      false,
			TotalRows:    len(rows) - 1,
			ImportedRows: 0,
			Errors:       errors,
			Message:      "Validation failed",
		})
		return
	}

	// Import users in a transaction
	tx := config.DB.Begin()
	importedCount := 0

	for _, importRow := range importRows {
		if err := uie.importUser(tx, importRow, currentUser.ID, companyID.(uuid.UUID)); err != nil {
			tx.Rollback()
			errors = append(errors, ImportValidationError{
				Row:    0, // We don't track row numbers during actual import
				Column: "General",
				Error:  fmt.Sprintf("Failed to import user %s: %s", importRow.UserName, err.Error()),
			})
			break
		}
		importedCount++
	}

	if len(errors) > 0 {
		tx.Rollback()
		c.JSON(500, ImportResult{
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
		c.JSON(500, ImportResult{
			Success:      false,
			TotalRows:    len(rows) - 1,
			ImportedRows: importedCount,
			Errors: []ImportValidationError{{
				Row:    0,
				Column: "Database",
				Error:  "Failed to commit transaction: " + err.Error(),
			}},
			Message: "Import failed during transaction commit",
		})
		return
	}

	c.JSON(200, ImportResult{
		Success:      true,
		TotalRows:    len(rows) - 1,
		ImportedRows: importedCount,
		Errors:       []ImportValidationError{},
		Message:      fmt.Sprintf("Successfully imported %d users", importedCount),
	})
}

// parseAndValidateRow parses and validates a single row
func (uie *UserImportExport) parseAndValidateRow(row []string, rowNum int) (UserImportRow, []ImportValidationError) {
	var errors []ImportValidationError
	var importRow UserImportRow

	fmt.Printf("DEBUG: Processing row %d with %d columns: %v\n", rowNum, len(row), row)

	// Parse basic fields
	importRow.SerialNo = strings.TrimSpace(row[0])
	importRow.Name = strings.TrimSpace(row[1])
	importRow.UserName = strings.TrimSpace(row[2])
	importRow.PkgID = strings.TrimSpace(row[3])
	importRow.Contact = strings.TrimSpace(row[4])
	importRow.Address = strings.TrimSpace(row[5])
	importRow.Password = strings.TrimSpace(row[6])
	importRow.Role = strings.TrimSpace(row[7])

	fmt.Printf("DEBUG: Parsed - SerialNo: '%s', Name: '%s', UserName: '%s', PkgID: '%s', Contact: '%s', Address: '%s', Password: '%s', Role: '%s'\n",
		importRow.SerialNo, importRow.Name, importRow.UserName, importRow.PkgID, importRow.Contact, importRow.Address, importRow.Password, importRow.Role)

	// Validate required fields
	if importRow.Name == "" {
		errors = append(errors, ImportValidationError{Row: rowNum, Column: "Name", Error: "Name is required"})
	}
	if importRow.UserName == "" {
		errors = append(errors, ImportValidationError{Row: rowNum, Column: "User Name", Error: "User Name is required"})
	}
	// Password is required for every imported user (matches signup min length of 6)
	if importRow.Password == "" {
		errors = append(errors, ImportValidationError{Row: rowNum, Column: "Password", Error: "User passwords are required"})
	} else if len(importRow.Password) < 6 {
		errors = append(errors, ImportValidationError{Row: rowNum, Column: "Password", Error: "Password must be at least 6 characters"})
	}
	if importRow.Role == "" {
		errors = append(errors, ImportValidationError{Row: rowNum, Column: "Role", Error: "Role is required"})
	}

	// Validate role
	validRoles := map[string]bool{"admin": true, "recovery_officer": true, "dealer": true, "staff": true, "sub_dealer": true, "manager": true}
	if importRow.Role != "" && !validRoles[importRow.Role] {
		errors = append(errors, ImportValidationError{Row: rowNum, Column: "Role", Error: "Invalid role. Must be one of: admin, recovery_officer, dealer, staff, sub_dealer, manager"})
	}

	return importRow, errors
}

// importUser imports a single user into the database
func (uie *UserImportExport) importUser(tx *gorm.DB, row UserImportRow, createdBy, companyID uuid.UUID) error {
	// Check if user_name (email) already exists
	var existingUser models.User
	if err := tx.Where("email = ?", row.UserName).First(&existingUser).Error; err == nil {
		return fmt.Errorf("user with email %s already exists", row.UserName)
	}

	// Hash the password provided in the import row
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(row.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Create base user
	user := models.User{
		Name:      row.Name,
		Email:     row.UserName, // Using user_name as email
		Password:  string(hashedPassword),
		Status:    "active", // Default status
		Role:      row.Role, // Use role from import
		CreatedBy: &createdBy,
	}

	if err := tx.Create(&user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// Create user-company relationship
	userCompany := models.UserCompany{
		UserID:    user.ID,
		CompanyID: companyID,
		UserRole:  row.Role, // Use role from import
	}

	if err := tx.Create(&userCompany).Error; err != nil {
		return fmt.Errorf("failed to create user-company relationship: %w", err)
	}

	return nil
}

// isValidEmail validates email format
func (uie *UserImportExport) isValidEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

// DownloadTemplate downloads the Excel template for import
func (uie *UserImportExport) DownloadTemplate(c *gin.Context) {
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
	if currentUser.Role != "admin" && currentUser.Role != "owner" {
		utils.ErrorResponse(c, 403, "Access denied", "Only admins and owners can download template")
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
	sheetName := "User Import Template"
	f.SetSheetName("Sheet1", sheetName)

	// Set headers
	headers := []string{
		"S.No", "Name", "User Name", "Package ID", "Contact", "Address", "Password", "Role",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	// Add sample data
	sampleData := [][]interface{}{
		{1, "John Doe", "john@example.com", "PKG001", "+1234567890", "123 Main St", "password123", "admin"},
		{2, "Jane Smith", "jane@example.com", "PKG002", "+0987654321", "456 Oak Ave", "password123", "dealer"},
		{3, "Mike Wilson", "mike@example.com", "PKG003", "+1122334455", "789 Pine Rd", "password123", "staff"},
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
	c.Header("Content-Disposition", "attachment; filename=user_import_template.xlsx")
	c.Header("Content-Transfer-Encoding", "binary")

	if err := f.Write(c.Writer); err != nil {
		utils.ErrorResponse(c, 500, "Failed to write Excel file", err.Error())
		return
	}
}
