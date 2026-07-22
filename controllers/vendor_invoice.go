package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateVendorInvoice handles creating vendor invoices with items
func CreateVendorInvoice(c *gin.Context) {
	db := config.DB

	var invoice models.VendorInvoice
	if err := c.ShouldBindJSON(&invoice); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if companyID, exists := c.Get("companyID"); exists {
		invoice.CompanyID = companyID.(uuid.UUID)
	}

	items := invoice.Items
	invoice.Items = nil

	// Check for duplicate invoice number within the same company
	if invoice.InvoiceNumber != "" {
		var existing models.VendorInvoice
		if err := db.Unscoped().
			Where("company_id = ? AND invoice_number = ? AND id != ?", invoice.CompanyID, invoice.InvoiceNumber, invoice.ID).
			First(&existing).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice number already exists for this company"})
			return
		}
	}

	var createErr error
	for attempt := 0; attempt < 3; attempt++ {
		invoice.ID = uuid.New()
		invoice.InvoiceNumber = ""

		tx := db.Begin()

		if createErr = tx.Create(&invoice).Error; createErr != nil {
			tx.Rollback()
			if strings.Contains(createErr.Error(), "duplicate key") {
				time.Sleep(50 * time.Millisecond)
				continue
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice", "details": createErr.Error()})
			return
		}

		for i, item := range items {
			newItem := models.VendorInvoiceItem{
				TenantModel: models.TenantModel{
					CompanyID: invoice.CompanyID,
				},
				InvoiceID:   invoice.ID,
				ProductID:   item.ProductID,
				ProductName: item.ProductName,
				Quantity:    item.Quantity,
				UnitPrice:   item.UnitPrice,
				UnitType:    item.UnitType,
				Subtotal:    item.Subtotal,
			}
			if err := tx.Create(&newItem).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice item", "details": err.Error(), "item_index": i})
				return
			}
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		var completeInvoice models.VendorInvoice
		if err := db.Preload("Items").First(&completeInvoice, invoice.ID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complete invoice"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Vendor invoice created successfully",
			"data":    completeInvoice,
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice after retries", "details": createErr.Error()})
}

// GetVendorInvoices handles fetching vendor invoices with items
func GetVendorInvoices(c *gin.Context) {
	db := config.DB

	var invoices []models.VendorInvoice
	query := db.Preload("Items")

	// Apply company filter
	if companyID, exists := c.Get("companyID"); exists {
		query = query.Where("company_id = ?", companyID.(uuid.UUID))
	}

	// Apply vendor filter if provided
	if vendorID := c.Query("vendorId"); vendorID != "" {
		query = query.Where("vendor_id = ?", vendorID)
	}

	if err := query.Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoices"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Records retrieved",
		"data":    invoices,
	})
}

// GetVendorInvoiceByID handles fetching a single vendor invoice
func GetVendorInvoiceByID(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	invoiceUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var invoice models.VendorInvoice
	if err := db.Preload("Items").Where("id = ?", invoiceUUID).First(&invoice).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Invoice retrieved",
		"data":    invoice,
	})
}

// UpdateVendorInvoice handles updating vendor invoices
func UpdateVendorInvoice(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	invoiceUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var existingInvoice models.VendorInvoice
	if err := db.Preload("Items").Where("id = ?", invoiceUUID).First(&existingInvoice).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoice"})
		return
	}

	var updateData models.VendorInvoice
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check for duplicate invoice number within the same company
	if updateData.InvoiceNumber != "" && updateData.InvoiceNumber != existingInvoice.InvoiceNumber {
		var existing models.VendorInvoice
		if err := db.Unscoped().
			Where("company_id = ? AND invoice_number = ? AND id != ?", existingInvoice.CompanyID, updateData.InvoiceNumber, existingInvoice.ID).
			First(&existing).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice number already exists for this company"})
			return
		}
	}

	// Start transaction
	tx := db.Begin()

	// Update invoice fields
	if err := tx.Model(&existingInvoice).Updates(map[string]interface{}{
		"vendor_id":      updateData.VendorID,
		"vendor_name":    updateData.VendorName,
		"invoice_date":   updateData.InvoiceDate,
		"total_amount":   updateData.TotalAmount,
		"batch":          updateData.Batch,
		"invoice_number": updateData.InvoiceNumber,
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invoice"})
		return
	}

	// Delete existing items
	if err := tx.Where("invoice_id = ?", id).Delete(&models.VendorInvoiceItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing items"})
		return
	}

	// Create new items
	for i, item := range updateData.Items {
		newItem := models.VendorInvoiceItem{
			TenantModel: models.TenantModel{
				CompanyID: existingInvoice.CompanyID,
			},
			InvoiceID:   existingInvoice.ID,
			ProductID:   item.ProductID,
			ProductName: item.ProductName,
			Quantity:    item.Quantity,
			UnitPrice:   item.UnitPrice,
			UnitType:    item.UnitType,
			Subtotal:    item.Subtotal,
		}
		// Set ID and timestamps (TenantModel fields)
		newItem.ID = uuid.New()
		newItem.CreatedAt = time.Now()
		newItem.UpdatedAt = time.Now()

		if err := tx.Create(&newItem).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice item", "details": err.Error(), "item_index": i})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Fetch the complete invoice with items
	var completeInvoice models.VendorInvoice
	if err := db.Preload("Items").Where("id = ?", invoiceUUID).First(&completeInvoice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complete invoice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Vendor invoice updated successfully",
		"data":    completeInvoice,
	})
}

// DeleteVendorInvoice handles deleting vendor invoices
func DeleteVendorInvoice(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	invoiceUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	// Start transaction
	tx := db.Begin()

	// Delete invoice items first (due to foreign key constraint)
	if err := tx.Where("invoice_id = ?", invoiceUUID).Delete(&models.VendorInvoiceItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete invoice items"})
		return
	}

	// Delete the invoice
	if err := tx.Where("id = ?", invoiceUUID).Delete(&models.VendorInvoice{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete invoice"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Vendor invoice deleted successfully",
	})
}
