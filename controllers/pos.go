package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// POS sale input mirrors what the POS page sends (sale + nested line items).
type posSaleRequest struct {
	SubscriberID   uuid.UUID     `json:"subscriberId"`
	SubscriberName string        `json:"subscriberName"`
	TotalAmount    float64       `json:"totalAmount"`
	TaxAmount      float64       `json:"taxAmount"`
	PaymentMethod  string        `json:"paymentMethod"`
	Date           string        `json:"date"`
	Items          []posSaleItem `json:"items"`
}

type posSaleItem struct {
	ProductID   uuid.UUID `json:"productId"`
	ProductName string    `json:"productName"`
	Quantity    int       `json:"quantity"`
	Price       float64   `json:"price"`
	TaxPercent  float64   `json:"taxPercent"`
	SaleTax     float64   `json:"saleTax"`
	WthTax      float64   `json:"wthTax"`
}

// CreatePOSSale creates a sale together with its line items in a single
// transaction and decrements the corresponding product stock. The generic
// CRUD Create cannot do this because it does not persist nested slices.
func CreatePOSSale(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var req posSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.ErrorResponse(c, 400, "Sale must contain at least one item", "no items")
		return
	}

	// Build the sale + items models
	sale := models.Sale{
		SubscriberID:   req.SubscriberID,
		SubscriberName: req.SubscriberName,
		TotalAmount:    req.TotalAmount,
		TaxAmount:      req.TaxAmount,
		PaymentMethod:  req.PaymentMethod,
		Date:           req.Date,
		Items:          make([]models.SaleItem, 0, len(req.Items)),
	}
	for _, it := range req.Items {
		sale.Items = append(sale.Items, models.SaleItem{
			ProductID:   it.ProductID,
			ProductName: it.ProductName,
			Quantity:    it.Quantity,
			Price:       it.Price,
			TaxPercent:  it.TaxPercent,
			SaleTax:     it.SaleTax,
			WthTax:      it.WthTax,
		})
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Set company scope on the sale and cascade-create items.
		sale.CompanyID = companyID
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}

		// Decrement stock from purchase_items for each sold product.
		// Finds the purchase_items row with the most stock for this product
		// and reduces its quantity (FIFO-style).
		for _, it := range req.Items {
			qty := it.Quantity
			if qty <= 0 {
				continue
			}
			result := tx.Exec(`
				UPDATE purchase_items
				SET quantity = GREATEST(quantity - ?, 0)
				WHERE id = (
					SELECT id FROM purchase_items
					WHERE product_id = ? AND company_id = ? AND deleted_at IS NULL
					ORDER BY quantity DESC
					LIMIT 1
				)
			`, qty, it.ProductID, companyID)
			if result.Error != nil {
				return result.Error
			}
		}
		return nil
	})
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to record sale", err.Error())
		return
	}

	utils.CreatedResponse(c, "Sale recorded", sale)
}

// GetPOSSales returns all sales for the current company with their line items preloaded.
func GetPOSSales(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var sales []models.Sale
	if err := config.DB.
		Scopes(models.TenantScope(companyID)).
		Preload("Items").
		Order("created_at DESC").
		Find(&sales).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch sales", err.Error())
		return
	}

	utils.SuccessResponse(c, "Records retrieved", sales)
}

// GetPOSSale returns a single sale (with items) by id.
func GetPOSSale(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	var sale models.Sale
	if err := config.DB.
		Scopes(models.TenantScope(companyID)).
		Preload("Items").
		Where("id = ?", id).
		First(&sale).Error; err != nil {
		utils.ErrorResponse(c, 404, "Sale not found", err.Error())
		return
	}

	utils.SuccessResponse(c, "Record found", sale)
}
