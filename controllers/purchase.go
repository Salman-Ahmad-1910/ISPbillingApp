package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func validateSerialNumbersWithinPurchase(items []models.PurchaseItem) string {
	seen := make(map[string]bool)
	for _, item := range items {
		sn := strings.TrimSpace(item.SerialNumber)
		if sn == "" {
			continue
		}
		if seen[sn] {
			return sn
		}
		seen[sn] = true
	}
	return ""
}

// consumeSNsFromVendorInvoices removes the given serial numbers from the vendor
// invoice items they belong to (same company + product). This is the second link
// of the SN chain: product -> vendor invoice -> purchase -> sale.
// It returns an error if an SN is not available on any vendor invoice item or is
// already consumed by another purchase item.
func consumeSNsFromVendorInvoices(tx *gorm.DB, companyID, productID uuid.UUID, sns []string) error {
	if len(sns) == 0 {
		return nil
	}

	// SNs already used by other purchase items cannot be consumed again.
	var existingPurchases []models.PurchaseItem
	if err := tx.Where("company_id = ? AND product_id = ? AND deleted_at IS NULL", companyID, productID).
		Find(&existingPurchases).Error; err != nil {
		return err
	}
	usedInPurchase := make(map[string]bool)
	for _, pi := range existingPurchases {
		for _, sn := range parseVendorInvoiceSNs(pi.SerialNumber) {
			usedInPurchase[sn] = true
		}
	}

	// Load all vendor invoice items for this product.
	var invoiceItems []models.VendorInvoiceItem
	if err := tx.Where("company_id = ? AND product_id = ? AND deleted_at IS NULL", companyID, productID).
		Order("created_at asc").
		Find(&invoiceItems).Error; err != nil {
		return err
	}

	// Map each available SN to its invoice item.
	snOwner := map[string]*models.VendorInvoiceItem{}
	for i := range invoiceItems {
		item := &invoiceItems[i]
		for _, sn := range parseVendorInvoiceSNs(item.SerialNumber) {
			if _, taken := snOwner[sn]; !taken {
				snOwner[sn] = item
			}
		}
	}

	consumedByItem := map[uuid.UUID][]string{}
	for _, sn := range sns {
		if usedInPurchase[sn] {
			return fmt.Errorf("serial number %s is already used in another purchase", sn)
		}
		owner, ok := snOwner[sn]
		if !ok {
			return fmt.Errorf("serial number %s is not available on any vendor invoice for this product", sn)
		}
		consumedByItem[owner.ID] = append(consumedByItem[owner.ID], sn)
	}

	// Remove consumed SNs from their invoice items and sync quantity/subtotal.
	for itemID, consumed := range consumedByItem {
		var item models.VendorInvoiceItem
		if err := tx.Where("id = ?", itemID).First(&item).Error; err != nil {
			return err
		}
		consumedSet := make(map[string]bool, len(consumed))
		for _, sn := range consumed {
			consumedSet[sn] = true
		}
		var remaining []string
		for _, sn := range parseVendorInvoiceSNs(item.SerialNumber) {
			if !consumedSet[sn] {
				remaining = append(remaining, sn)
			}
		}
		newQty := len(remaining)
		if err := tx.Model(&models.VendorInvoiceItem{}).
			Where("id = ?", item.ID).
			Updates(map[string]interface{}{
				"serial_number": strings.Join(remaining, ", "),
				"quantity":      newQty,
				"subtotal":      item.UnitPrice * float64(newQty),
			}).Error; err != nil {
			return err
		}
	}
	return nil
}

// returnSNsToVendorInvoices gives serial numbers back to the vendor invoice
// items of a product (used when a purchase is updated or deleted). SNs are
// appended to the oldest invoice item of that product that does not already
// hold them. Best effort: if no invoice item exists anymore, nothing happens.
func returnSNsToVendorInvoices(tx *gorm.DB, companyID, productID uuid.UUID, sns []string) error {
	if len(sns) == 0 {
		return nil
	}

	var items []models.VendorInvoiceItem
	if err := tx.Where("company_id = ? AND product_id = ? AND deleted_at IS NULL", companyID, productID).
		Order("created_at asc").
		Find(&items).Error; err != nil {
		return err
	}
	if len(items) == 0 {
		return nil
	}

	target := &items[0]
	existing := parseVendorInvoiceSNs(target.SerialNumber)
	have := make(map[string]bool, len(existing))
	for _, sn := range existing {
		have[sn] = true
	}
	var toAdd []string
	for _, sn := range sns {
		if !have[sn] {
			toAdd = append(toAdd, sn)
		}
	}
	if len(toAdd) == 0 {
		return nil
	}

	combined := append(existing, toAdd...)
	newQty := len(combined)
	return tx.Model(&models.VendorInvoiceItem{}).
		Where("id = ?", target.ID).
		Updates(map[string]interface{}{
			"serial_number": strings.Join(combined, ", "),
			"quantity":      newQty,
			"subtotal":      target.UnitPrice * float64(newQty),
		}).Error
}

func CreatePurchase(c *gin.Context) {
	db := config.DB

	var purchase models.Purchase
	if err := c.ShouldBindJSON(&purchase); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if companyID, exists := c.Get("companyID"); exists {
		purchase.CompanyID = companyID.(uuid.UUID)
	}

	items := purchase.Items
	purchase.Items = nil

	var createErr error
	for attempt := 0; attempt < 3; attempt++ {
		purchase.ID = uuid.New()
		purchase.PurchaseNumber = ""

		// Validate serial numbers are unique within this purchase
		if dupSN := validateSerialNumbersWithinPurchase(items); dupSN != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Duplicate serial number found within purchase", "serialNumber": dupSN})
			return
		}

		tx := db.Begin()

		if createErr = tx.Create(&purchase).Error; createErr != nil {
			tx.Rollback()
			if strings.Contains(createErr.Error(), "duplicate key") {
				time.Sleep(50 * time.Millisecond)
				continue
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase", "details": createErr.Error()})
			return
		}

		for _, item := range items {
			itemSNs := parseVendorInvoiceSNs(item.SerialNumber)

			// Consume the SNs from the vendor invoice items they belong to.
			// Done before inserting this purchase's own item rows so the
			// "already used by another purchase" check stays accurate.
			if len(itemSNs) > 0 {
				if err := consumeSNsFromVendorInvoices(tx, purchase.CompanyID, item.ProductID, itemSNs); err != nil {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
			}

			newItem := models.PurchaseItem{
				TenantModel: models.TenantModel{
					CompanyID: purchase.CompanyID,
				},
				PurchaseID:    purchase.ID,
				ProductID:     item.ProductID,
				ProductName:   item.ProductName,
				Quantity:      item.Quantity,
				PurchasePrice: item.PurchasePrice,
				SellingPrice:  item.SellingPrice,
				UnitPrice:     item.PurchasePrice,
				UnitType:      item.UnitType,
				FocNormal:     item.FocNormal,
				Subtotal:      item.Subtotal,
				SaleTax:       item.SaleTax,
				WthTax:        item.WthTax,
				Disc:          item.Disc,
				ExpiryDate:    item.ExpiryDate,
				SerialNumber:  item.SerialNumber,
			}
			if err := tx.Create(&newItem).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase item", "details": err.Error()})
				return
			}

		// Stock for both SN-bearing and no-SN products is owned by the vendor
		// invoice (it adds SNs / quantity when goods are received from a vendor),
		// so recording a purchase only syncs prices and never mutates stock.
		// This keeps quantity-only (no-SN) products from being double-counted.
		updates := map[string]interface{}{}
		if item.PurchasePrice > 0 {
				updates["purchase_price"] = item.PurchasePrice
			}
			if item.SellingPrice > 0 {
				updates["sale_price"] = item.SellingPrice
			}
			if len(updates) > 0 {
				if err := tx.Model(&models.Product{}).
					Where("id = ? AND company_id = ?", item.ProductID, purchase.CompanyID).
					Updates(updates).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product stock"})
					return
				}
			}
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		var completePurchase models.Purchase
		if err := db.Preload("Items").First(&completePurchase, purchase.ID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complete purchase"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Purchase created successfully",
			"data":    completePurchase,
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase after retries", "details": createErr.Error()})
}

func GetPurchases(c *gin.Context) {
	db := config.DB

	var purchases []models.Purchase
	query := db.Preload("Items")

	if companyID, exists := c.Get("companyID"); exists {
		query = query.Where("company_id = ?", companyID.(uuid.UUID))
	}

	if vendorID := c.Query("vendorId"); vendorID != "" {
		query = query.Where("vendor_id = ?", vendorID)
	}

	if err := query.Find(&purchases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchases"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Records retrieved",
		"data":    purchases,
	})
}

func GetPurchaseByID(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	purchaseUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase ID"})
		return
	}

	var purchase models.Purchase
	if err := db.Preload("Items").Where("id = ?", purchaseUUID).First(&purchase).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Purchase retrieved",
		"data":    purchase,
	})
}

func UpdatePurchase(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	purchaseUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase ID"})
		return
	}

	var existingPurchase models.Purchase
	if err := db.Preload("Items").Where("id = ?", purchaseUUID).First(&existingPurchase).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase"})
		return
	}

	var updateData models.Purchase
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := db.Begin()

	// Save old items before clearing to prevent GORM cascading on Updates
	oldItems := existingPurchase.Items
	existingPurchase.Items = nil

	// Revert old items before updating: SN-bearing items give their SNs back to
	// the vendor invoice items. No-SN items are owned by the vendor invoice (it
	// holds the stock), so a purchase update does not touch product stock.
	for _, oldItem := range oldItems {
		oldSNs := parseVendorInvoiceSNs(oldItem.SerialNumber)
		if len(oldSNs) > 0 {
			if err := returnSNsToVendorInvoices(tx, existingPurchase.CompanyID, oldItem.ProductID, oldSNs); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to return serial numbers to vendor invoice"})
				return
			}
		}
	}

	if err := tx.Model(&existingPurchase).Updates(map[string]interface{}{
		"vendor_id":        updateData.VendorID,
		"vendor_name":      updateData.VendorName,
		"purchase_date":    updateData.PurchaseDate,
		"total_amount":     updateData.TotalAmount,
		"remaining_amount": updateData.RemainingAmount,
		"discount":         updateData.Discount,
		"sales_tax":        updateData.SalesTax,
		"wth_tax":          updateData.WthTax,
		"bill_id":          updateData.BillId,
		"batch":            updateData.Batch,
		"status":           updateData.Status,
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase"})
		return
	}

	if err := tx.Where("purchase_id = ?", id).Delete(&models.PurchaseItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing items"})
		return
	}

	// Validate serial numbers are unique within this purchase
	if dupSN := validateSerialNumbersWithinPurchase(updateData.Items); dupSN != "" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Duplicate serial number found within purchase", "serialNumber": dupSN})
		return
	}

	for _, item := range updateData.Items {
		itemSNs := parseVendorInvoiceSNs(item.SerialNumber)

		// Consume the SNs from the vendor invoice items they belong to.
		if len(itemSNs) > 0 {
			if err := consumeSNsFromVendorInvoices(tx, existingPurchase.CompanyID, item.ProductID, itemSNs); err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		}

		newItem := models.PurchaseItem{
			TenantModel: models.TenantModel{
				CompanyID: existingPurchase.CompanyID,
			},
			PurchaseID:    existingPurchase.ID,
			ProductID:     item.ProductID,
			ProductName:   item.ProductName,
			Quantity:      item.Quantity,
			PurchasePrice: item.PurchasePrice,
			SellingPrice:  item.SellingPrice,
			UnitPrice:     item.PurchasePrice,
			UnitType:      item.UnitType,
			FocNormal:     item.FocNormal,
			Subtotal:      item.Subtotal,
			SaleTax:       item.SaleTax,
			WthTax:        item.WthTax,
			Disc:          item.Disc,
			ExpiryDate:    item.ExpiryDate,
			SerialNumber:  item.SerialNumber,
		}
		newItem.ID = uuid.New()
		newItem.CreatedAt = time.Now()
		newItem.UpdatedAt = time.Now()

		if err := tx.Create(&newItem).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase item", "details": err.Error()})
			return
		}

		updates := map[string]interface{}{}
		if item.PurchasePrice > 0 {
			updates["purchase_price"] = item.PurchasePrice
		}
		if item.SellingPrice > 0 {
			updates["sale_price"] = item.SellingPrice
		}
		if len(updates) > 0 {
			if err := tx.Model(&models.Product{}).
				Where("id = ? AND company_id = ?", item.ProductID, existingPurchase.CompanyID).
				Updates(updates).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product stock"})
				return
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	var completePurchase models.Purchase
	if err := db.Preload("Items").Where("id = ?", purchaseUUID).First(&completePurchase).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complete purchase"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Purchase updated successfully",
		"data":    completePurchase,
	})
}

func UpdatePurchaseStatus(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	purchaseUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase ID"})
		return
	}

	var body struct {
		Status         string  `json:"status"`
		RemainingAmount *float64 `json:"remainingAmount"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{
		"status": body.Status,
	}
	if body.RemainingAmount != nil {
		updates["remaining_amount"] = *body.RemainingAmount
	}

	if err := db.Model(&models.Purchase{}).Where("id = ?", purchaseUUID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Purchase status updated",
	})
}

func DeletePurchase(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	purchaseUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase ID"})
		return
	}

	tx := db.Begin()

	var purchase models.Purchase
	if err := tx.Preload("Items").Where("id = ?", purchaseUUID).First(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}

	// Revert items: SN-bearing items give their SNs back to the vendor invoice
	// items. No-SN items are owned by the vendor invoice, so deleting a purchase
	// does not change product stock.
	for _, item := range purchase.Items {
		itemSNs := parseVendorInvoiceSNs(item.SerialNumber)
		if len(itemSNs) > 0 {
			if err := returnSNsToVendorInvoices(tx, purchase.CompanyID, item.ProductID, itemSNs); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to return serial numbers to vendor invoice"})
				return
			}
		}
	}

	if err := tx.Where("purchase_id = ?", purchaseUUID).Delete(&models.PurchaseItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete purchase items"})
		return
	}

	if err := tx.Where("id = ?", purchaseUUID).Delete(&models.Purchase{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete purchase"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Purchase deleted successfully",
	})
}

// consumeSNsFromPurchaseItems removes sold serial numbers from the purchase
// items holding them. This is the third link of the SN chain:
// product -> vendor invoice -> purchase -> sale.
// It returns true if at least one SN was found on a purchase item.
func consumeSNsFromPurchaseItems(tx *gorm.DB, companyID, productID uuid.UUID, sns []string) (bool, error) {
	if len(sns) == 0 {
		return false, nil
	}

	var items []models.PurchaseItem
	if err := tx.Where("company_id = ? AND product_id = ? AND deleted_at IS NULL", companyID, productID).
		Order("created_at asc").
		Find(&items).Error; err != nil {
		return false, err
	}

	consumedSet := make(map[string]bool, len(sns))
	for _, sn := range sns {
		consumedSet[sn] = true
	}

	found := false
	for i := range items {
		item := &items[i]
		itemSNs := parseVendorInvoiceSNs(item.SerialNumber)
		if len(itemSNs) == 0 {
			continue
		}
		var remaining []string
		changed := false
		for _, sn := range itemSNs {
			if consumedSet[sn] {
				changed = true
				found = true
				continue
			}
			remaining = append(remaining, sn)
		}
		if !changed {
			continue
		}
		newQty := len(remaining)
		if err := tx.Model(&models.PurchaseItem{}).
			Where("id = ?", item.ID).
			Updates(map[string]interface{}{
				"serial_number": strings.Join(remaining, ", "),
				"quantity":      newQty,
				"subtotal":      item.PurchasePrice * float64(newQty),
			}).Error; err != nil {
			return found, err
		}
	}
	return found, nil
}

// GetPurchasedProducts returns each purchase item as a separate product for POS.
// No GROUP BY on product_id — every purchased line item appears individually.
func GetPurchasedProducts(c *gin.Context) {
	db := config.DB
	companyID := c.MustGet("companyID").(uuid.UUID)

	var products []models.PurchasedProduct
	if err := db.Raw(`
		SELECT
			pi.id                                        AS purchase_item_id,
			pi.product_id                                 AS id,
			pi.product_name                               AS name,
			pi.selling_price                              AS price,
			pi.quantity                                   AS stock,
			pi.unit_type                                  AS unit_type,
			CASE
				WHEN pi.quantity * pi.selling_price > 0
				THEN ROUND(pi.sale_tax / (pi.quantity * pi.selling_price) * 100, 2)
				ELSE 0
			END                                            AS tax_percent,
			pi.purchase_price                             AS purchase_price,
			pi.serial_number                              AS serial_number,
			COALESCE(pr.serial_number, '')                 AS product_serial_number,
			COALESCE(pr.current_serial_index, 0)           AS current_serial_index,
			p.bill_id                                     AS bill_id,
			p.purchase_number                             AS purchase_number,
			p.vendor_name                                 AS vendor_name,
			p.purchase_date                               AS purchase_date,
			p.batch                                       AS batch,
			pr.image                                      AS image
		FROM purchase_items pi
		JOIN purchases p ON p.id = pi.purchase_id AND p.deleted_at IS NULL
		LEFT JOIN products pr ON pr.id = pi.product_id AND pr.deleted_at IS NULL
		WHERE pi.company_id = ?
			AND pi.deleted_at IS NULL
		ORDER BY pi.product_name
	`, companyID).Scan(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchased products", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Records retrieved",
		"data":    products,
	})
}
