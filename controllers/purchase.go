package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"fmt"
	"net/http"
	"sort"
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

	// Purchase and vendor-invoice records are static documents: recording a
	// purchase never mutates vendor invoices, and serial numbers may be
	// recorded across purchases (the same product is re-bought regularly).
	// Only duplicates within a single submitted batch are rejected above.

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
		newItem := models.PurchaseItem{
				TenantModel: models.TenantModel{
					CompanyID: purchase.CompanyID,
				},
				PurchaseID:    purchase.ID,
				ProductID:     item.ProductID,
				ProductName:   item.ProductName,
				Quantity:      item.Quantity,
				QuantityEntered: item.Quantity,
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
				Model:         strings.TrimSpace(item.Model),
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
		if err := db.Preload("Items.History").First(&completePurchase, purchase.ID).Error; err != nil {
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
	query := db.Preload("Items.History")

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
	if err := db.Preload("Items.History").Where("id = ?", purchaseUUID).First(&purchase).Error; err != nil {
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

	// Clear old items before updating to prevent GORM cascading on Updates
	existingPurchase.Items = nil

	// Purchase records are static documents: only duplicates within a single
	// submitted batch are rejected (below). Serial numbers may be re-recorded
	// across purchases since the same product is re-bought regularly.

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
		newItem := models.PurchaseItem{
			TenantModel: models.TenantModel{
				CompanyID: existingPurchase.CompanyID,
			},
			PurchaseID:    existingPurchase.ID,
			ProductID:     item.ProductID,
			ProductName:   item.ProductName,
			Quantity:      item.Quantity,
			QuantityEntered: item.Quantity,
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
			Model:         strings.TrimSpace(item.Model),
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
	if err := db.Preload("Items.History").Where("id = ?", purchaseUUID).First(&completePurchase).Error; err != nil {
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

// AddPurchaseQuantity adds more quantity (and optionally more serial numbers /
// model numbers) to an existing purchase item line of a purchase. Quantity is
// added to the purchase item holding the product, syncing its
// quantity/quantity_entered/subtotal and the owning purchase's totals. SNs are
// consumed from the vendor invoices that hold them (the same SN chain purchase
// creation enforces), so the added stock reflects in the stock and POS pages
// which read from purchase_items.
func AddPurchaseQuantity(c *gin.Context) {
	db := config.DB
	id := c.Param("id")

	purchaseUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase ID"})
		return
	}

	companyIDStr := c.GetHeader("x-company-id")
	if companyIDStr == "" {
		companyIDStr = c.Query("companyId")
	}
	var companyID uuid.UUID
	if companyIDStr != "" {
		if parsed, err := uuid.Parse(companyIDStr); err == nil {
			companyID = parsed
		}
	}
	if companyID == uuid.Nil {
		if id, exists := c.Get("companyID"); exists {
			companyID = id.(uuid.UUID)
		}
	}
	if companyID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Company ID is required"})
		return
	}

	var body struct {
		ProductID      uuid.UUID `json:"productId"`
		Quantity       int       `json:"quantity"`
		SerialNumber   string    `json:"serialNumber"`
		Model          string    `json:"model"`
		NoSerialNumber bool      `json:"noSerialNumber"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.ProductID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Product is required"})
		return
	}

	var purchase models.Purchase
	if err := db.Preload("Items").
		Where("id = ? AND company_id = ?", purchaseUUID, companyID).
		First(&purchase).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase"})
		return
	}

	var purchaseItem *models.PurchaseItem
	for i := range purchase.Items {
		if purchase.Items[i].ProductID == body.ProductID {
			purchaseItem = &purchase.Items[i]
			break
		}
	}
	if purchaseItem == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Product is not part of this purchase"})
		return
	}

	newSNs := parseVendorInvoiceSNs(body.SerialNumber)
	newModelText := strings.TrimSpace(body.Model)

	// Quantity, serial numbers and model numbers are fully independent: the
	// entered quantity is always the quantity added, and any SNs / models are
	// recorded as-is (free-form). SNs are only rejected when a duplicate is
	// already used by another purchase line, so the same physical unit cannot
	// be sold twice.
	addedQty := body.Quantity
	if addedQty <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quantity must be at least 1"})
		return
	}

	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	// Free-form SN validation: only duplicate serial numbers within this batch
	// are rejected. Serial numbers may appear across purchases and across
	// lines, since purchases are static records and products are re-bought.
	if len(newSNs) > 0 {
		seen := make(map[string]bool)
		for _, sn := range newSNs {
			if seen[sn] {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Serial number %s is duplicated in the batch", sn)})
				return
			}
			seen[sn] = true
		}
	}

	newSerialText := purchaseItem.SerialNumber
	if len(newSNs) > 0 {
		existingSNs := parseVendorInvoiceSNs(purchaseItem.SerialNumber)
		newSerialText = strings.Join(append(existingSNs, newSNs...), ", ")
	}

	// Models are appended whenever provided, whether paired with SNs or on
	// their own (quantity-only / no-SN lines).
	addedModels := newModelText
	newModelText = strings.Trim(strings.Join([]string{purchaseItem.Model, newModelText}, ", "), ", ")

	newQuantity := purchaseItem.Quantity + addedQty
	newSubtotal := purchaseItem.PurchasePrice * float64(newQuantity)
	delta := purchaseItem.PurchasePrice * float64(addedQty)

	if err := tx.Model(&models.PurchaseItem{}).
		Where("id = ? AND deleted_at IS NULL", purchaseItem.ID).
		Updates(map[string]interface{}{
			"quantity":         newQuantity,
			"quantity_entered": purchaseItem.QuantityEntered + addedQty,
			"subtotal":         newSubtotal,
			"serial_number":    newSerialText,
			"model":            newModelText,
		}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase item", "details": err.Error()})
		return
	}

	// Record this operation in the purchase item's history so the purchase page
	// can show every added-quantity entry with its date and time.
	historyEntry := models.PurchaseQuantityHistory{
		TenantModel:        models.TenantModel{CompanyID: companyID},
		PurchaseID:         purchaseUUID,
		PurchaseItemID:     purchaseItem.ID,
		ProductID:          body.ProductID,
		QuantityBefore:     purchaseItem.QuantityEntered,
		QuantityAdded:      addedQty,
		SerialNumbersAdded: strings.Join(newSNs, ", "),
		ModelsAdded:        addedModels,
		UnitPrice:          purchaseItem.PurchasePrice,
	}
	if err := tx.Create(&historyEntry).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record quantity history", "details": err.Error()})
		return
	}

	if err := tx.Model(&models.Purchase{}).
		Where("id = ? AND deleted_at IS NULL", purchaseUUID).
		Updates(map[string]interface{}{
			"total_amount":     gorm.Expr("total_amount + ?", delta),
			"remaining_amount": gorm.Expr("remaining_amount + ?", delta),
		}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase total"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	var completePurchase models.Purchase
	if err := db.Preload("Items.History").Where("id = ?", purchaseUUID).First(&completePurchase).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complete purchase"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Quantity added to purchase",
		"data":    completePurchase,
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

	if err := tx.Where("purchase_id = ?", purchaseUUID).Delete(&models.PurchaseQuantityHistory{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete purchase quantity history"})
		return
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

// splitCommaList splits a comma-separated string into trimmed non-empty parts.
func splitCommaList(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}

// GetPurchasedProducts returns one row per distinct purchased product for the
// POS page and the Stock page. Purchase records are static (quantity, serial
// numbers and models on a purchase never decrease), so the available stock is
// derived as SUM(purchase quantity entered) - SUM(sold quantity). Both pages
// consume this endpoint and therefore always show the same number. Every row
// carries the per-purchase "versions" in Lines for the Stock page and the pool
// of serial numbers/models that have not been sold yet.
func GetPurchasedProducts(c *gin.Context) {
	db := config.DB
	companyID := c.MustGet("companyID").(uuid.UUID)

	type purchaseLine struct {
		PurchaseItemID  uuid.UUID
		ProductID       uuid.UUID
		ProductName     string
		Quantity        int
		QuantityEntered int
		PurchasePrice   float64
		SellingPrice    float64
		TaxPercent      float64
		UnitType        string
		SerialNumber    string
		Model           string
		BillID          string
		PurchaseNumber  string
		VendorName      string
		PurchaseDate    string
		Batch           string
		CreatedAt       time.Time
		Image           string
	}
	var lines []purchaseLine
	if err := db.Raw(`
		SELECT
			pi.id                                        AS purchase_item_id,
			pi.product_id                                AS product_id,
			COALESCE(NULLIF(pi.product_name, ''), pr.name) AS product_name,
			pi.quantity                                  AS quantity,
			COALESCE(pi.quantity_entered, pi.quantity, 0) AS quantity_entered,
			pi.purchase_price                            AS purchase_price,
			pi.selling_price                             AS selling_price,
			COALESCE(pr.tax_percent, 0)                  AS tax_percent,
			pi.unit_type                                 AS unit_type,
			pi.serial_number                             AS serial_number,
			pi.model                                     AS model,
			p.bill_id                                    AS bill_id,
			p.purchase_number                            AS purchase_number,
			p.vendor_name                                AS vendor_name,
			p.purchase_date                              AS purchase_date,
			p.batch                                      AS batch,
			pi.created_at                                AS created_at,
			COALESCE(pr.image, '')                       AS image
		FROM purchase_items pi
		JOIN purchases p ON p.id = pi.purchase_id AND p.deleted_at IS NULL
		LEFT JOIN products pr ON pr.id = pi.product_id
		WHERE pi.company_id = ?
			AND pi.deleted_at IS NULL
			AND pr.id IS NOT NULL
			AND pr.deleted_at IS NULL
		ORDER BY pi.product_name, pi.created_at ASC
	`, companyID).Scan(&lines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchased products", "details": err.Error()})
		return
	}

	type soldRow struct {
		ProductID    uuid.UUID
		Quantity     int
		SerialNumber string
	}
	var soldRows []soldRow
	if err := db.Raw(`
		SELECT
			si.product_id    AS product_id,
			si.quantity      AS quantity,
			si.serial_number AS serial_number
		FROM sale_items si
		JOIN sales s ON s.id = si.sale_id AND s.deleted_at IS NULL
		WHERE s.company_id = ?
			AND si.deleted_at IS NULL
	`, companyID).Scan(&soldRows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sold quantities", "details": err.Error()})
		return
	}

	soldQty := map[uuid.UUID]int{}
	soldSNs := map[uuid.UUID]map[string]bool{}
	for _, s := range soldRows {
		soldQty[s.ProductID] += s.Quantity
		if soldSNs[s.ProductID] == nil {
			soldSNs[s.ProductID] = map[string]bool{}
		}
		for _, sn := range parseVendorInvoiceSNs(s.SerialNumber) {
			soldSNs[s.ProductID][sn] = true
		}
	}

	// Group by product NAME (case-insensitive) so purchasing the same-named
	// product again — even as a different physical product record — shows as a
	// single Stock page entry with expandable purchase lines (its "versions").
	grouped := map[string]*models.PurchasedProduct{}
	groupProducts := map[string]map[uuid.UUID]bool{}
	var order []string
	for _, ln := range lines {
		key := strings.ToLower(strings.TrimSpace(ln.ProductName))
		p := grouped[key]
		if p == nil {
			p = &models.PurchasedProduct{ID: ln.ProductID.String(), Lines: []models.PurchasedProductLine{}}
			grouped[key] = p
			groupProducts[key] = map[uuid.UUID]bool{}
			order = append(order, key)
		}
		groupProducts[key][ln.ProductID] = true
		p.TotalPurchased += ln.QuantityEntered
		p.Name = ln.ProductName
		p.Image = ln.Image
		// Rows are ordered oldest -> newest, so the most recent purchase line
		// drives the display pricing, purchase details and representative
		// product id.
		p.ID = ln.ProductID.String()
		p.PurchaseItemID = ln.PurchaseItemID.String()
		p.Price = ln.SellingPrice
		p.PurchasePrice = ln.PurchasePrice
		p.TaxPercent = ln.TaxPercent
		p.UnitType = ln.UnitType
		p.BillId = ln.BillID
		p.PurchaseNumber = ln.PurchaseNumber
		p.VendorName = ln.VendorName
		p.PurchaseDate = ln.PurchaseDate
		p.Batch = ln.Batch
		p.Lines = append(p.Lines, models.PurchasedProductLine{
			PurchaseItemID: ln.PurchaseItemID.String(),
			ID:             ln.ProductID.String(),
			Name:           ln.ProductName,
			Quantity:       ln.Quantity,
			PurchasePrice:  ln.PurchasePrice,
			SellingPrice:   ln.SellingPrice,
			UnitType:       ln.UnitType,
			SerialNumber:   ln.SerialNumber,
			Model:          ln.Model,
			BillId:         ln.BillID,
			PurchaseNumber: ln.PurchaseNumber,
			VendorName:     ln.VendorName,
			PurchaseDate:   ln.PurchaseDate,
			Batch:          ln.Batch,
			CreatedAt:      ln.CreatedAt.Format(time.RFC3339),
		})
	}

	products := make([]models.PurchasedProduct, 0, len(order))
	for _, key := range order {
		p := grouped[key]
		sold := 0
		soldSet := map[string]bool{}
		// Sold quantities/SNs are recorded per physical product; sum them
		// across every product record that shares this name.
		for pid := range groupProducts[key] {
			sold += soldQty[pid]
			if soldSNs[pid] != nil {
				for sn := range soldSNs[pid] {
					soldSet[sn] = true
				}
			}
		}

		// Serial/model pool: purchased minus sold, keeping purchase order.
		seen := map[string]bool{}
		snModel := map[string]string{}
		modelPool := []string{}
		seenModels := map[string]bool{}
		for _, ln := range p.Lines {
			sns := parseVendorInvoiceSNs(ln.SerialNumber)
			mods := splitCommaList(ln.Model)
			paired := len(mods) == len(sns)
			for i, sn := range sns {
				if seen[sn] || (soldSet != nil && soldSet[sn]) {
					continue
				}
				seen[sn] = true
				if paired {
					snModel[sn] = mods[i]
				}
			}
			if len(sns) == 0 {
				for _, m := range mods {
					if !seenModels[m] {
						seenModels[m] = true
						modelPool = append(modelPool, m)
					}
				}
			}
		}
		var orderedSNs []string
		for _, ln := range p.Lines {
			for _, sn := range parseVendorInvoiceSNs(ln.SerialNumber) {
				if !seen[sn] {
					continue
				}
				seen[sn] = false
				orderedSNs = append(orderedSNs, sn)
			}
		}
		p.SerialNumber = strings.Join(orderedSNs, ", ")
		p.ProductSerialNumber = p.SerialNumber
		p.CurrentSerialIndex = len(orderedSNs)

		var models []string
		used := map[string]bool{}
		for _, sn := range orderedSNs {
			if m := snModel[sn]; m != "" && !used[m] {
				used[m] = true
				models = append(models, m)
			}
		}
		for _, m := range modelPool {
			if !used[m] {
				used[m] = true
				models = append(models, m)
			}
		}
		p.Model = strings.Join(models, ", ")
		p.ProductModel = p.Model
		p.CurrentModelIndex = len(models)

		stock := p.TotalPurchased - sold
		if stock < 0 {
			stock = 0
		}
		p.Stock = stock
		p.TotalSold = sold

		products = append(products, *p)
	}

	sort.SliceStable(products, func(i, j int) bool {
		return strings.ToLower(products[i].Name) < strings.ToLower(products[j].Name)
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Records retrieved",
		"data":    products,
	})
}
