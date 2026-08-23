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

// applyVendorInvoiceInventory reconciles a product's stock after a vendor-invoice
// change. Serial-number-tracked products keep stock == number of SNs; quantity-only
// (no-SN) products keep an independent integer stock that is adjusted by qtyDelta.
// addSNs/removeSNs alter the SN list (either may be nil). qtyDelta is positive when
// inventory is received and negative when it is reverted/removed.
func applyVendorInvoiceInventory(tx *gorm.DB, companyID, productID uuid.UUID, addSNs, removeSNs []string, qtyDelta int) error {
	var prod models.Product
	if err := tx.Where("id = ? AND company_id = ?", productID, companyID).First(&prod).Error; err != nil {
		return err
	}

	allSNs := prod.ParseSerialNumbers()
	merged := append([]string{}, allSNs...)
	removeSet := make(map[string]bool, len(removeSNs))
	for _, sn := range removeSNs {
		removeSet[sn] = true
	}
	if len(removeSet) > 0 {
		filtered := merged[:0]
		for _, sn := range merged {
			if !removeSet[sn] {
				filtered = append(filtered, sn)
			}
		}
		merged = filtered
	}
	addSet := make(map[string]bool, len(merged))
	for _, sn := range merged {
		addSet[sn] = true
	}
	for _, sn := range addSNs {
		if !addSet[sn] {
			addSet[sn] = true
			merged = append(merged, sn)
		}
	}

	if len(merged) > 0 {
		// SN-tracked product: stock follows the serial numbers.
		return tx.Model(&models.Product{}).
			Where("id = ? AND company_id = ?", productID, companyID).
			Updates(map[string]interface{}{
				"serial_number": strings.Join(merged, ", "),
				"stock":         len(merged),
			}).Error
	}

	// Quantity-only product: adjust the integer stock.
	return tx.Model(&models.Product{}).
		Where("id = ? AND company_id = ?", productID, companyID).
		Update("stock", gorm.Expr("GREATEST(stock + ?, 0)", qtyDelta)).Error
}

// CreateVendorInvoice handles creating vendor invoices with items.
// The frontend sends one item per SN/MAC (each with quantity=1 and serialNumber set).
// The backend registers each SN on the product, adding it to the product's available
// inventory (buying from a vendor increases stock). Products may be created without
// serial numbers, so an SN entered here is added if it is not already present.
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

	// Validate SNs and collect the serial numbers received on this invoice.
	// A product may be created without serial numbers; entering an SN here
	// adds it to the product's available inventory (buying from a vendor
	// increases stock). Duplicate SNs within the same invoice are rejected.
	type validatedItem struct {
		item models.VendorInvoiceItem
		sns  []string
	}
	var validItems []validatedItem
	type productSNSet struct {
		existing map[string]bool
		allSNs   []string
		seen     map[string]bool
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
			existSet := make(map[string]bool, len(allSNs))
			for _, sn := range allSNs {
				existSet[sn] = true
			}
			ps = &productSNSet{existing: existSet, allSNs: allSNs, seen: map[string]bool{}}
			productSNSets[key] = ps
		}

		// Parse comma/space/dash separated SNs from the item's serialNumber field.
		sns := parseVendorInvoiceSNs(item.SerialNumber)

		// Reject duplicate SNs within the same invoice.
		var validSNs []string
		for _, sn := range sns {
			if ps.seen[sn] {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Duplicate serial number %s in invoice for %s", sn, item.ProductName)})
				return
			}
			ps.seen[sn] = true
			validSNs = append(validSNs, sn)
		}

		// Quantity is the number of SNs for SN-tracked items; otherwise the
		// explicit quantity sent for a quantity-only (no-SN) product.
		qty := len(validSNs)
		if qty == 0 {
			qty = item.Quantity
		}

		validItems = append(validItems, validatedItem{
			item: models.VendorInvoiceItem{
				TenantModel:  models.TenantModel{CompanyID: invoice.CompanyID},
				ProductID:    item.ProductID,
				ProductName:  item.ProductName,
				Quantity:     qty,
				UnitPrice:    item.UnitPrice,
				UnitType:     item.UnitType,
				Subtotal:     item.UnitPrice * float64(qty),
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

		// Reconcile each product's inventory. SNs are added to SN-tracked
		// products; quantity-only (no-SN) products have their integer stock
		// incremented by the bought quantity.
		type productDelta struct {
			addSNs   []string
			qtyDelta int
		}
		deltas := map[string]*productDelta{}
		for _, vi := range validItems {
			key := vi.item.ProductID.String()
			pd, ok := deltas[key]
			if !ok {
				pd = &productDelta{}
				deltas[key] = pd
			}
			if len(vi.sns) > 0 {
				pd.addSNs = append(pd.addSNs, vi.sns...)
			} else {
				pd.qtyDelta += vi.item.Quantity
			}
		}

		for key, pd := range deltas {
			productID, _ := uuid.Parse(key)
			if err := applyVendorInvoiceInventory(tx, invoice.CompanyID, productID, pd.addSNs, nil, pd.qtyDelta); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product inventory", "details": err.Error()})
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

	// 1. Revert the previous invoice's effect on products: remove its SNs and
	// subtract its quantity-only stock so the new items can be applied cleanly.
	type revertDelta struct {
		removeSNs []string
		qtyDelta  int
	}
	reverts := map[string]*revertDelta{}
	for _, item := range existingInvoice.Items {
		key := item.ProductID.String()
		rd, ok := reverts[key]
		if !ok {
			rd = &revertDelta{}
			reverts[key] = rd
		}
		sns := parseVendorInvoiceSNs(item.SerialNumber)
		if len(sns) > 0 {
			rd.removeSNs = append(rd.removeSNs, sns...)
		} else {
			rd.qtyDelta -= item.Quantity
		}
	}

	for key, rd := range reverts {
		productID, _ := uuid.Parse(key)
		if err := applyVendorInvoiceInventory(tx, existingInvoice.CompanyID, productID, nil, rd.removeSNs, rd.qtyDelta); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revert product inventory", "details": err.Error()})
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

	// 4. Validate and collect SNs from new items (same ADD logic as CreateVendorInvoice)
	type validatedItem struct {
		item models.VendorInvoiceItem
		sns  []string
	}
	var validItems []validatedItem
	type productSNSet struct {
		existing map[string]bool
		allSNs   []string
		seen     map[string]bool
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
			existSet := make(map[string]bool, len(allSNs))
			for _, sn := range allSNs {
				existSet[sn] = true
			}
			ps = &productSNSet{existing: existSet, allSNs: allSNs, seen: map[string]bool{}}
			productSNSets[key] = ps
		}

		sns := parseVendorInvoiceSNs(item.SerialNumber)

		var validSNs []string
		for _, sn := range sns {
			if ps.seen[sn] {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Duplicate serial number %s in invoice for %s", sn, item.ProductName)})
				return
			}
			ps.seen[sn] = true
			validSNs = append(validSNs, sn)
		}

		qty := len(validSNs)
		if qty == 0 {
			qty = item.Quantity
		}

		validItems = append(validItems, validatedItem{
			item: models.VendorInvoiceItem{
				TenantModel:  models.TenantModel{CompanyID: existingInvoice.CompanyID},
				InvoiceID:    existingInvoice.ID,
				ProductID:    item.ProductID,
				ProductName:  item.ProductName,
				Quantity:     qty,
				UnitPrice:    item.UnitPrice,
				UnitType:     item.UnitType,
				Subtotal:     item.UnitPrice * float64(qty),
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

	// 6. Apply the new items to products (buying from a vendor increases stock).
	type productDelta struct {
		addSNs   []string
		qtyDelta int
	}
	deltas := map[string]*productDelta{}
	for _, vi := range validItems {
		key := vi.item.ProductID.String()
		pd, ok := deltas[key]
		if !ok {
			pd = &productDelta{}
			deltas[key] = pd
		}
		if len(vi.sns) > 0 {
			pd.addSNs = append(pd.addSNs, vi.sns...)
		} else {
			pd.qtyDelta += vi.item.Quantity
		}
	}

	for key, pd := range deltas {
		productID, _ := uuid.Parse(key)
		if err := applyVendorInvoiceInventory(tx, existingInvoice.CompanyID, productID, pd.addSNs, nil, pd.qtyDelta); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product inventory", "details": err.Error()})
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

	// Revert the invoice's effect on products: remove its SNs and subtract its
	// quantity-only stock.
	type revertDelta struct {
		removeSNs []string
		qtyDelta  int
	}
	reverts := map[string]*revertDelta{}
	for _, item := range existingInvoice.Items {
		key := item.ProductID.String()
		rd, ok := reverts[key]
		if !ok {
			rd = &revertDelta{}
			reverts[key] = rd
		}
		sns := parseVendorInvoiceSNs(item.SerialNumber)
		if len(sns) > 0 {
			rd.removeSNs = append(rd.removeSNs, sns...)
		} else {
			rd.qtyDelta -= item.Quantity
		}
	}

	for key, rd := range reverts {
		productID, _ := uuid.Parse(key)
		if err := applyVendorInvoiceInventory(tx, existingInvoice.CompanyID, productID, nil, rd.removeSNs, rd.qtyDelta); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revert product inventory", "details": err.Error()})
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
