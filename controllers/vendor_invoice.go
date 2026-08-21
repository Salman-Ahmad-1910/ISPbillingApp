package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// parseVendorInvoiceSNs splits a comma/space-delimited serial number string into individual SNs.
func parseVendorInvoiceSNs(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	re := regexp.MustCompile(`[,\s\-]+`)
	parts := re.Split(raw, -1)
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

// CreateVendorInvoice handles creating vendor invoices with items.
// The frontend sends one item per SN/MAC (each with quantity=1 and serialNumber set).
// The backend validates each SN exists on the product and creates one line item per SN.
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

	// Validate SNs: each item must have serialNumber set and qty=1.
	type validatedItem struct {
		item     models.VendorInvoiceItem
		sns      []string
	}
	var validItems []validatedItem
	type productSNSet struct {
		available map[string]bool
		allSNs    []string
	}
	productSNSets := map[string]*productSNSet{}

	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}

		key := item.ProductID.String()
		ps, exists := productSNSets[key]
		if !exists {
			var prod models.Product
			if err := db.Where("id = ? AND company_id = ?", item.ProductID, invoice.CompanyID).First(&prod).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Product not found: %s", item.ProductName)})
				return
			}
			allSNs := prod.ParseSerialNumbers()
			avail := make(map[string]bool, len(allSNs))
			for _, sn := range allSNs {
				avail[sn] = true
			}
			ps = &productSNSet{available: avail, allSNs: allSNs}
			productSNSets[key] = ps
		}

		// Parse comma-separated SNs from the item's serialNumber field
		sns := parseVendorInvoiceSNs(item.SerialNumber)
		if len(sns) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Missing serial number for %s", item.ProductName)})
			return
		}

		// Validate each SN exists and mark as consumed
		var validSNs []string
		for _, sn := range sns {
			if !ps.available[sn] {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Serial number %s is not available for %s", sn, item.ProductName)})
				return
			}
			ps.available[sn] = false
			validSNs = append(validSNs, sn)
		}

		validItems = append(validItems, validatedItem{
			item: models.VendorInvoiceItem{
				TenantModel:  models.TenantModel{CompanyID: invoice.CompanyID},
				ProductID:    item.ProductID,
				ProductName:  item.ProductName,
				Quantity:     len(validSNs),
				UnitPrice:    item.UnitPrice,
				UnitType:     item.UnitType,
				Subtotal:     item.UnitPrice * float64(len(validSNs)),
				SerialNumber: strings.Join(validSNs, ", "),
			},
			sns: validSNs,
		})
	}

	if len(validItems) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid items to invoice"})
		return
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

		for i, vi := range validItems {
			vi.item.InvoiceID = invoice.ID
			if err := tx.Create(&vi.item).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice item", "details": err.Error(), "item_index": i})
				return
			}
		}

		// Remove consumed SNs from products and update stock.
		consumedByProduct := map[string][]string{}
		for _, vi := range validItems {
			key := vi.item.ProductID.String()
			consumedByProduct[key] = append(consumedByProduct[key], vi.sns...)
		}

		for key, consumedSNs := range consumedByProduct {
			var prod models.Product
			if err := tx.Where("id = ? AND company_id = ?", key, invoice.CompanyID).First(&prod).Error; err != nil {
				continue
			}
			allSNs := prod.ParseSerialNumbers()
			consumedSet := make(map[string]bool, len(consumedSNs))
			for _, sn := range consumedSNs {
				consumedSet[sn] = true
			}
			var remaining []string
			for _, sn := range allSNs {
				if !consumedSet[sn] {
					remaining = append(remaining, sn)
				}
			}
			remainingStr := strings.Join(remaining, ", ")
			newStock := len(remaining)
			productID, _ := uuid.Parse(key)
			if err := tx.Model(&models.Product{}).
				Where("id = ? AND company_id = ?", productID, invoice.CompanyID).
				Updates(map[string]interface{}{
					"serial_number": remainingStr,
					"stock":         newStock,
				}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product serial numbers"})
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

// UpdateVendorInvoice handles updating vendor invoices, reconciling SNs and stock on products.
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

	// 1. Return SNs from old items back to products
	type snReturn struct {
		ProductID uuid.UUID
		SNs       []string
	}
	oldSNReturns := map[string]*snReturn{}
	for _, item := range existingInvoice.Items {
		sn := strings.TrimSpace(item.SerialNumber)
		if sn == "" {
			continue
		}
		key := item.ProductID.String()
		sr, exists := oldSNReturns[key]
		if !exists {
			sr = &snReturn{ProductID: item.ProductID}
			oldSNReturns[key] = sr
		}
		sr.SNs = append(sr.SNs, parseVendorInvoiceSNs(sn)...)
	}

	for _, sr := range oldSNReturns {
		var prod models.Product
		if err := tx.Where("id = ? AND company_id = ?", sr.ProductID, existingInvoice.CompanyID).First(&prod).Error; err != nil {
			continue
		}
		existingSNs := prod.ParseSerialNumbers()
		restoredSNs := append(existingSNs, sr.SNs...)
		restoredStr := strings.Join(restoredSNs, ", ")
		if err := tx.Model(&models.Product{}).
			Where("id = ? AND company_id = ?", sr.ProductID, existingInvoice.CompanyID).
			Updates(map[string]interface{}{
				"serial_number": restoredStr,
				"stock":         len(restoredSNs),
			}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore product serial numbers"})
			return
		}
	}

	// 2. Update invoice fields
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

	// 3. Delete existing items
	if err := tx.Where("invoice_id = ?", id).Delete(&models.VendorInvoiceItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing items"})
		return
	}

	// 4. Validate and consume SNs from new items (same logic as CreateVendorInvoice)
	type validatedItem struct {
		item models.VendorInvoiceItem
		sns  []string
	}
	var validItems []validatedItem
	type productSNSet struct {
		available map[string]bool
		allSNs    []string
	}
	productSNSets := map[string]*productSNSet{}

	for _, item := range updateData.Items {
		if item.Quantity <= 0 {
			continue
		}

		key := item.ProductID.String()
		ps, exists := productSNSets[key]
		if !exists {
			var prod models.Product
			if err := tx.Where("id = ? AND company_id = ?", item.ProductID, existingInvoice.CompanyID).First(&prod).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Product not found: %s", item.ProductName)})
				return
			}
			allSNs := prod.ParseSerialNumbers()
			avail := make(map[string]bool, len(allSNs))
			for _, sn := range allSNs {
				avail[sn] = true
			}
			ps = &productSNSet{available: avail, allSNs: allSNs}
			productSNSets[key] = ps
		}

		sns := parseVendorInvoiceSNs(item.SerialNumber)
		if len(sns) == 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Missing serial number for %s", item.ProductName)})
			return
		}

		var validSNs []string
		for _, sn := range sns {
			if !ps.available[sn] {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Serial number %s is not available for %s", sn, item.ProductName)})
				return
			}
			ps.available[sn] = false
			validSNs = append(validSNs, sn)
		}

		validItems = append(validItems, validatedItem{
			item: models.VendorInvoiceItem{
				TenantModel:  models.TenantModel{CompanyID: existingInvoice.CompanyID},
				InvoiceID:    existingInvoice.ID,
				ProductID:    item.ProductID,
				ProductName:  item.ProductName,
				Quantity:     len(validSNs),
				UnitPrice:    item.UnitPrice,
				UnitType:     item.UnitType,
				Subtotal:     item.UnitPrice * float64(len(validSNs)),
				SerialNumber: strings.Join(validSNs, ", "),
			},
			sns: validSNs,
		})
	}

	// 5. Create new items
	for i, vi := range validItems {
		if err := tx.Create(&vi.item).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice item", "details": err.Error(), "item_index": i})
			return
		}
	}

	// 6. Remove consumed SNs from products
	consumedByProduct := map[string][]string{}
	for _, vi := range validItems {
		key := vi.item.ProductID.String()
		consumedByProduct[key] = append(consumedByProduct[key], vi.sns...)
	}

	for key, consumedSNs := range consumedByProduct {
		var prod models.Product
		if err := tx.Where("id = ? AND company_id = ?", key, existingInvoice.CompanyID).First(&prod).Error; err != nil {
			continue
		}
		allSNs := prod.ParseSerialNumbers()
		consumedSet := make(map[string]bool, len(consumedSNs))
		for _, sn := range consumedSNs {
			consumedSet[sn] = true
		}
		var remaining []string
		for _, sn := range allSNs {
			if !consumedSet[sn] {
				remaining = append(remaining, sn)
			}
		}
		remainingStr := strings.Join(remaining, ", ")
		productID, _ := uuid.Parse(key)
		if err := tx.Model(&models.Product{}).
			Where("id = ? AND company_id = ?", productID, existingInvoice.CompanyID).
			Updates(map[string]interface{}{
				"serial_number": remainingStr,
				"stock":         len(remaining),
			}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product serial numbers"})
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

// DeleteVendorInvoice handles deleting vendor invoices and returning SNs to products
func DeleteVendorInvoice(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	invoiceUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice number"})
		return
	}

	// Fetch the existing invoice with items to return SNs
	var existingInvoice models.VendorInvoice
	if err := db.Preload("Items").Where("id = ?", invoiceUUID).First(&existingInvoice).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoice"})
		return
	}

	// Start transaction
	tx := db.Begin()

	// Return SNs to products. Each item has one SN in its serialNumber field.
	type snReturn struct {
		ProductID uuid.UUID
		SNs       []string
	}
	snReturns := map[string]*snReturn{}
	for _, item := range existingInvoice.Items {
		sn := strings.TrimSpace(item.SerialNumber)
		if sn == "" {
			continue
		}
		key := item.ProductID.String()
		sr, exists := snReturns[key]
		if !exists {
			sr = &snReturn{ProductID: item.ProductID}
			snReturns[key] = sr
		}
		sr.SNs = append(sr.SNs, parseVendorInvoiceSNs(sn)...)
	}

	for _, sr := range snReturns {
		var prod models.Product
		if err := tx.Where("id = ? AND company_id = ?", sr.ProductID, existingInvoice.CompanyID).First(&prod).Error; err != nil {
			continue
		}
		existingSNs := prod.ParseSerialNumbers()
		allSNs := append(existingSNs, sr.SNs...)
		allSNsStr := strings.Join(allSNs, ", ")
		if err := tx.Model(&models.Product{}).
			Where("id = ? AND company_id = ?", sr.ProductID, existingInvoice.CompanyID).
			Updates(map[string]interface{}{
				"serial_number": allSNsStr,
				"stock":         len(allSNs),
			}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore product serial numbers"})
			return
		}
	}

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
