package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"net/http"
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

	// Set company ID from context
	if companyID, exists := c.Get("companyID"); exists {
		invoice.CompanyID = companyID.(uuid.UUID)
	}

	// Start transaction
	tx := db.Begin()

	// Create the invoice
	if err := tx.Create(&invoice).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice"})
		return
	}

	// Create invoice items
	for i := range invoice.Items {
		item := models.VendorInvoiceItem{
			TenantModel: models.TenantModel{
				CompanyID: invoice.CompanyID,
			},
			InvoiceID:   invoice.ID,
			ProductID:   invoice.Items[i].ProductID,
			ProductName: invoice.Items[i].ProductName,
			Quantity:    invoice.Items[i].Quantity,
			UnitPrice:   invoice.Items[i].UnitPrice,
			UnitType:    invoice.Items[i].UnitType,
			Subtotal:    invoice.Items[i].Subtotal,
		}
		// Let GORM generate the ID automatically
		if err := tx.Create(&item).Error; err != nil {
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
	if err := db.Preload("Items").First(&completeInvoice, invoice.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complete invoice"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Vendor invoice created successfully",
		"data":    completeInvoice,
	})
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

	// Start transaction
	tx := db.Begin()

	// Update invoice fields
	if err := tx.Model(&existingInvoice).Updates(map[string]interface{}{
		"vendor_id":    updateData.VendorID,
		"vendor_name":  updateData.VendorName,
		"invoice_date": updateData.InvoiceDate,
		"total_amount": updateData.TotalAmount,
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
