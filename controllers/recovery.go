package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetRecoveryTransactions handles retrieving recovery transactions
func GetRecoveryTransactions(c *gin.Context) {
	fmt.Printf("DEBUG: GetRecoveryTransactions called\n")

	companyIDInterface, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 401, "Company ID not found", nil)
		return
	}

	companyID, ok := companyIDInterface.(uuid.UUID)
	if !ok {
		utils.ErrorResponse(c, 500, "Invalid company ID format", nil)
		return
	}

	var recoveryTransactions []models.RecoveryTransaction

	// Apply Tenant Scope
	query := config.DB.Scopes(models.TenantScope(companyID))

	if err := query.Find(&recoveryTransactions).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch recovery transactions", err.Error())
		return
	}

	fmt.Printf("DEBUG: Found %d recovery transactions\n", len(recoveryTransactions))
	for i, transaction := range recoveryTransactions {
		fmt.Printf("DEBUG: Transaction %d: Amount=%f, Type='%s', Date='%s', Desc='%s', OfficerID=%s\n",
			i, transaction.Amount, transaction.Type, transaction.Date, transaction.Description, transaction.OfficerID.String())
	}

	// Filter out records with completely empty essential fields
	var filteredTransactions []models.RecoveryTransaction
	for _, transaction := range recoveryTransactions {
		// Only exclude transactions that have ALL essential fields empty
		// Allow zero amounts and individual empty fields, but exclude completely empty records
		hasOfficer := transaction.OfficerID != uuid.Nil
		hasDate := transaction.Date != ""
		hasDescription := transaction.Description != ""
		hasType := transaction.Type != ""

		// Include if it has at least some meaningful data
		if hasOfficer || hasDate || hasDescription || hasType {
			filteredTransactions = append(filteredTransactions, transaction)
		}
	}

	fmt.Printf("DEBUG: Filtered to %d transactions\n", len(filteredTransactions))
	utils.SuccessResponse(c, "Recovery transactions retrieved", filteredTransactions)
}

// CreateRecoveryTransaction handles creating a new recovery transaction
func CreateRecoveryTransaction(c *gin.Context) {
	var recoveryTransaction models.RecoveryTransaction
	if err := c.ShouldBindJSON(&recoveryTransaction); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyIDInterface, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 401, "Company ID not found", nil)
		return
	}

	companyID, ok := companyIDInterface.(uuid.UUID)
	if !ok {
		utils.ErrorResponse(c, 500, "Invalid company ID format", nil)
		return
	}

	// Set required fields
	recoveryTransaction.CompanyID = companyID
	recoveryTransaction.OfficerID = uuid.MustParse("a8459756-145e-4de7-9278-481bf3dac4a8") // Default officer

	// Set date to current time if empty
	if recoveryTransaction.Date == "" {
		recoveryTransaction.Date = time.Now().Format("2006-01-02T15:04:05Z07:00")
	}

	// Validate required fields
	if recoveryTransaction.Description == "" {
		recoveryTransaction.Description = "Recovery payment"
	}

	if recoveryTransaction.Type == "" {
		recoveryTransaction.Type = "credit"
	}

	if err := config.DB.Create(&recoveryTransaction).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create recovery transaction", err.Error())
		return
	}

	utils.CreatedResponse(c, "Recovery transaction created successfully", recoveryTransaction)
}
