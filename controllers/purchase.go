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

func validateSerialNumbers(db *gorm.DB, companyID uuid.UUID, items []models.PurchaseItem, excludePurchaseID uuid.UUID) string {
	for _, item := range items {
		if strings.TrimSpace(item.SerialNumber) == "" {
			continue
		}
		var count int64
		db.Model(&models.PurchaseItem{}).
			Where("company_id = ? AND serial_number = ? AND serial_number != '' AND purchase_id != ?",
				companyID, item.SerialNumber, excludePurchaseID).
			Count(&count)
		if count > 0 {
			return item.SerialNumber
		}
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

		// Validate serial numbers are unique across the company
		if dupSN := validateSerialNumbers(db, purchase.CompanyID, items, uuid.Nil); dupSN != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Duplicate serial number found", "serialNumber": dupSN})
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

			updates := map[string]interface{}{
				"stock": gorm.Expr("stock + ?", item.Quantity),
			}
			if item.PurchasePrice > 0 {
				updates["purchase_price"] = item.PurchasePrice
			}
			if item.SellingPrice > 0 {
				updates["sale_price"] = item.SellingPrice
			}
			if err := tx.Model(&models.Product{}).
				Where("id = ? AND company_id = ?", item.ProductID, purchase.CompanyID).
				Updates(updates).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product stock"})
				return
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

	// Revert old item stock before updating
	for _, oldItem := range oldItems {
		if err := tx.Model(&models.Product{}).
			Where("id = ? AND company_id = ?", oldItem.ProductID, existingPurchase.CompanyID).
			Update("stock", gorm.Expr("GREATEST(stock - ?, 0)", oldItem.Quantity)).
			Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revert product stock"})
			return
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

	// Validate serial numbers are unique across the company
	if dupSN := validateSerialNumbers(db, existingPurchase.CompanyID, updateData.Items, purchaseUUID); dupSN != "" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Duplicate serial number found", "serialNumber": dupSN})
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

		updates := map[string]interface{}{
			"stock": gorm.Expr("stock + ?", item.Quantity),
		}
		if item.PurchasePrice > 0 {
			updates["purchase_price"] = item.PurchasePrice
		}
		if item.SellingPrice > 0 {
			updates["sale_price"] = item.SellingPrice
		}
		if err := tx.Model(&models.Product{}).
			Where("id = ? AND company_id = ?", item.ProductID, existingPurchase.CompanyID).
			Updates(updates).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product stock"})
			return
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

	// Revert stock for each item
	for _, item := range purchase.Items {
		if err := tx.Model(&models.Product{}).
			Where("id = ? AND company_id = ?", item.ProductID, purchase.CompanyID).
			Update("stock", gorm.Expr("GREATEST(stock - ?, 0)", item.Quantity)).
			Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revert product stock"})
			return
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

// GetPurchasedProducts returns each purchase item as a separate product for POS.
// No GROUP BY on product_id — every purchased line item appears individually.
func GetPurchasedProducts(c *gin.Context) {
	db := config.DB
	companyID := c.MustGet("companyID").(uuid.UUID)

	var products []models.PurchasedProduct
	if err := db.Raw(`
		SELECT
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
			pi.purchase_price                             AS purchase_price
		FROM purchase_items pi
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
