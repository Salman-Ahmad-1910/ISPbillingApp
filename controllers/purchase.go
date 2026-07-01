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

	tx := db.Begin()

	// Save items to create manually after purchase is created
	items := purchase.Items
	purchase.Items = nil

	if err := tx.Create(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase", "details": err.Error()})
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

// GetPurchasedProducts returns products that appear in purchase items (LEFT
// JOIN so purchase-only products still appear even when the product record
// is missing or soft-deleted). Used by the POS page so it only shows products
// actually bought from vendors.
func GetPurchasedProducts(c *gin.Context) {
	db := config.DB
	companyID := c.MustGet("companyID").(uuid.UUID)

	var products []models.PurchasedProduct
	if err := db.Raw(`
		SELECT
			COALESCE(p.id, pi_sub.product_id)              AS id,
			COALESCE(p.name, pi_sub.product_name)           AS name,
			COALESCE(p.category, '')                        AS category,
			COALESCE(p.price, pi_sub.selling_price, 0)      AS price,
			COALESCE(p.stock, 0)                            AS stock,
			COALESCE(p.unit_type, pi_sub.unit_type, 'piece') AS unit_type,
			COALESCE(p.tax_percent, 0)                      AS tax_percent,
			p.image,
			p.barcode,
			COALESCE(p.sale_price, 0)                       AS sale_price,
			COALESCE(p.purchase_price, pi_sub.purchase_price, 0) AS purchase_price,
			COALESCE(p.discount, 0)                         AS discount,
			pi_sub.company_id,
			pi_sub.purchased_qty
		FROM (
			SELECT
				product_id,
				company_id,
				MIN(product_name)     AS product_name,
				MIN(unit_type)        AS unit_type,
				MIN(selling_price)    AS selling_price,
				MIN(purchase_price)   AS purchase_price,
				SUM(quantity)         AS purchased_qty
			FROM purchase_items
			WHERE company_id = ?
			GROUP BY product_id, company_id
		) pi_sub
		LEFT JOIN products p
			ON p.id = pi_sub.product_id
			AND p.company_id = pi_sub.company_id
			AND p.deleted_at IS NULL
		ORDER BY COALESCE(p.name, pi_sub.product_name)
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
