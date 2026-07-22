package controllers

import (
	"fmt"
	"net/http"

	"awesomeProject/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TestAccounts is a simple test endpoint
func TestAccounts(c *gin.Context) {
	fmt.Printf("DEBUG: TestAccounts endpoint called!\n")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Accounts controller is working!",
	})
}

// GetLedgerEntries handles GET /api/v1/accounts/ledger with filtering
func GetLedgerEntries(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	companyID := c.Query("companyId")
	accountType := c.Query("accountType")
	subscriberID := c.Query("subscriber_id")

	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Company ID is required",
		})
		return
	}

	var ledgerEntries []models.LedgerEntry
	companyUUID, err := uuid.Parse(companyID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid company ID format",
		})
		return
	}

	fmt.Printf("DEBUG: Company UUID: %v, AccountType: '%s'\n", companyUUID, accountType)

	// Start with basic query
	query := db.Where("company_id = ?", companyUUID)

	// Apply filters if provided
	if accountType != "" {
		fmt.Printf("DEBUG: Adding accountType filter: %s\n", accountType)
		query = query.Where("account_type = ?", accountType)
	}

	if subscriberID != "" {
		subUUID, err := uuid.Parse(subscriberID)
		if err == nil {
			query = query.Where("subscriber_id = ?", subUUID)
		}
	}

	// Order by date descending (newest first)
	fmt.Printf("DEBUG: Executing query...\n")
	result := query.Order("date DESC, created_at DESC").Find(&ledgerEntries)
	if result.Error != nil {
		fmt.Printf("DEBUG: Query failed with error: %v\n", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch ledger entries",
			"error":   result.Error.Error(),
		})
		return
	}

	fmt.Printf("DEBUG: Query executed successfully. Found %d ledger entries. Rows affected: %d\n", len(ledgerEntries), result.RowsAffected)

	// Always return success, even if no entries found
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ledgerEntries,
		"count":   len(ledgerEntries),
		"message": "Ledger entries retrieved successfully",
	})
}

// CreateLedgerEntry handles POST /api/v1/accounts/ledger
func CreateLedgerEntry(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	companyID := c.Query("companyId")

	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Company ID is required",
		})
		return
	}

	var ledgerEntry models.LedgerEntry
	if err := c.ShouldBindJSON(&ledgerEntry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
		return
	}

	// Set company ID
	ledgerEntry.CompanyID = uuid.MustParse(companyID)

	// Validate that either debit or credit is provided, but not both
	if ledgerEntry.Debit > 0 && ledgerEntry.Credit > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Cannot have both debit and credit in a single entry",
		})
		return
	}

	if ledgerEntry.Debit <= 0 && ledgerEntry.Credit <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Either debit or credit amount must be provided",
		})
		return
	}

	if err := db.Create(&ledgerEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create ledger entry",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    ledgerEntry,
	})
}

// UpdateLedgerEntry handles PUT /api/v1/accounts/ledger/:id
func UpdateLedgerEntry(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	companyID := c.Query("companyId")
	id := c.Param("id")

	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Company ID is required",
		})
		return
	}

	var ledgerEntry models.LedgerEntry
	if err := db.Where("id = ? AND company_id = ?", id, companyID).First(&ledgerEntry).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Ledger entry not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch ledger entry",
			"error":   err.Error(),
		})
		return
	}

	var updateData models.LedgerEntry
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
		return
	}

	// Validate that either debit or credit is provided, but not both
	if updateData.Debit > 0 && updateData.Credit > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Cannot have both debit and credit in a single entry",
		})
		return
	}

	if updateData.Debit <= 0 && updateData.Credit <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Either debit or credit amount must be provided",
		})
		return
	}

	// Update fields
	ledgerEntry.Date = updateData.Date
	ledgerEntry.Description = updateData.Description
	ledgerEntry.Debit = updateData.Debit
	ledgerEntry.Credit = updateData.Credit
	ledgerEntry.AccountType = updateData.AccountType
	ledgerEntry.SubscriberID = updateData.SubscriberID

	if err := db.Save(&ledgerEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update ledger entry",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ledgerEntry,
	})
}

// DeleteLedgerEntry handles DELETE /api/v1/accounts/ledger/:id
func DeleteLedgerEntry(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	companyID := c.Query("companyId")
	id := c.Param("id")

	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Company ID is required",
		})
		return
	}

	var ledgerEntry models.LedgerEntry
	if err := db.Where("id = ? AND company_id = ?", id, companyID).First(&ledgerEntry).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Ledger entry not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch ledger entry",
			"error":   err.Error(),
		})
		return
	}

	if err := db.Delete(&ledgerEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete ledger entry",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Ledger entry deleted successfully",
	})
}
