package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"time"

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
	IsInstallment  bool          `json:"isInstallment"`
	Status         string        `json:"status"`
	Discount       float64       `json:"discount"`
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
	SerialNumber string   `json:"serialNumber"`
}

type installmentRequest struct {
	InstallmentPlanID uuid.UUID `json:"installmentPlanId"`
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
	saleStatus := req.Status
	if saleStatus == "" {
		saleStatus = "completed"
	}
	sale := models.Sale{
		SubscriberID:   req.SubscriberID,
		SubscriberName: req.SubscriberName,
		TotalAmount:    req.TotalAmount,
		TaxAmount:      req.TaxAmount,
		PaymentMethod:  req.PaymentMethod,
		Date:           req.Date,
		IsInstallment:  req.IsInstallment,
		Status:         saleStatus,
		Discount:       req.Discount,
		Items:          make([]models.SaleItem, 0, len(req.Items)),
	}
	for _, it := range req.Items {
		sale.Items = append(sale.Items, models.SaleItem{
			ProductID:    it.ProductID,
			ProductName:  it.ProductName,
			Quantity:     it.Quantity,
			Price:        it.Price,
			TaxPercent:   it.TaxPercent,
			SaleTax:      it.SaleTax,
			WthTax:       it.WthTax,
			SerialNumber: it.SerialNumber,
		})
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Set company scope on the sale and cascade-create items.
		sale.CompanyID = companyID
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}

		// Decrement stock from purchase_items and product stock for each sold product.
		for _, it := range req.Items {
			qty := it.Quantity
			if qty <= 0 {
				continue
			}
			result := tx.Exec(`
				UPDATE purchase_items
				SET quantity = GREATEST(quantity - ?, 0)
				WHERE id IN (
					SELECT id FROM purchase_items
					WHERE product_id = ? AND company_id = ? AND deleted_at IS NULL
					ORDER BY quantity DESC
					LIMIT 1
				)
			`, qty, it.ProductID, companyID)
			if result.Error != nil {
				return result.Error
			}

			// Also decrement Product.stock so inventory status page stays in sync.
			if err := tx.Model(&models.Product{}).
				Where("id = ? AND company_id = ?", it.ProductID, companyID).
				Update("stock", gorm.Expr("GREATEST(stock - ?, 0)", qty)).Error; err != nil {
				return err
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

// CreateInstallmentSale creates a sale with an installment plan for the subscriber.
// The first installment is paid at the time of creation.
func CreateInstallmentSale(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var req struct {
		SubscriberID      uuid.UUID `json:"subscriberId"`
		SubscriberName    string    `json:"subscriberName"`
		InstallmentPlanID uuid.UUID `json:"installmentPlanId"`
		Subtotal          float64   `json:"subtotal"`
		TaxAmount         float64   `json:"taxAmount"`
		PaymentMethod     string    `json:"paymentMethod"`
		Date              string    `json:"date"`
		Items             []posSaleItem `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.ErrorResponse(c, 400, "Sale must contain at least one item", "no items")
		return
	}

	// Look up the installment plan
	var plan models.InstallmentPlan
	if err := config.DB.Where("id = ? AND company_id = ?", req.InstallmentPlanID, companyID).First(&plan).Error; err != nil {
		utils.ErrorResponse(c, 404, "Installment plan not found", err.Error())
		return
	}

	// Check if subscriber already has an active installment
	var existing models.SubscriberInstallment
	if err := config.DB.Where("subscriber_id = ? AND company_id = ? AND status = ?", req.SubscriberID, companyID, "active").First(&existing).Error; err == nil {
		utils.ErrorResponse(c, 400, "Subscriber already has an active installment plan", "active installment exists")
		return
	}

	// Calculate installment: apply percentage increase once to subtotal, then divide
	totalWithIncrease := req.Subtotal * (1 + plan.PercentageIncrease/100)
	amountPerInstallment := totalWithIncrease / float64(plan.Installments)

	sale := models.Sale{
		SubscriberID:   req.SubscriberID,
		SubscriberName: req.SubscriberName,
		TotalAmount:    totalWithIncrease + req.TaxAmount,
		TaxAmount:      req.TaxAmount,
		PaymentMethod:  req.PaymentMethod,
		Date:           req.Date,
		IsInstallment:  true,
		Status:         "completed",
		Items:          make([]models.SaleItem, 0, len(req.Items)),
	}
	for _, it := range req.Items {
		sale.Items = append(sale.Items, models.SaleItem{
			ProductID:    it.ProductID,
			ProductName:  it.ProductName,
			Quantity:     it.Quantity,
			Price:        it.Price,
			TaxPercent:   it.TaxPercent,
			SaleTax:      it.SaleTax,
			WthTax:       it.WthTax,
			SerialNumber: it.SerialNumber,
		})
	}

	paymentDate := req.Date
	if paymentDate == "" {
		paymentDate = time.Now().Format(time.RFC3339)
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		sale.CompanyID = companyID
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}

		// Create installment record — first installment is already paid
		installment := models.SubscriberInstallment{
			SaleID:             sale.ID,
			SubscriberID:       req.SubscriberID,
			SubscriberName:     req.SubscriberName,
			InstallmentPlanID:  plan.ID,
			PlanName:           plan.Name,
			TotalInstallments:  plan.Installments,
			PaidInstallments:   1,
			InstallmentAmount:  amountPerInstallment,
			TotalAmount:        totalWithIncrease,
			NextInstallment:    2,
			Status:             "active",
		}
		if plan.Installments <= 1 {
			installment.Status = "completed"
			installment.PaidInstallments = plan.Installments
			installment.NextInstallment = 0
		}
		installment.CompanyID = companyID
		if err := tx.Create(&installment).Error; err != nil {
			return err
		}

		// Create Payment record for the first installment
		payment := models.Payment{
			TenantModel:    models.TenantModel{CompanyID: companyID},
			SubscriberID:   &req.SubscriberID,
			SubscriberName: req.SubscriberName,
			Amount:         amountPerInstallment,
			PaymentDate:    paymentDate,
			Method:         req.PaymentMethod,
		}
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		// Decrement stock
		for _, it := range req.Items {
			qty := it.Quantity
			if qty <= 0 {
				continue
			}
			result := tx.Exec(`
				UPDATE purchase_items
				SET quantity = GREATEST(quantity - ?, 0)
				WHERE id IN (
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
		utils.ErrorResponse(c, 500, "Failed to record installment sale", err.Error())
		return
	}

	utils.CreatedResponse(c, "Installment sale recorded", gin.H{
		"sale":         sale,
		"installment":  "first installment paid",
	})
}

// GetSubscriberInstallment returns the installment record for a subscriber,
// optionally filtered by saleId. Includes the original sale items.
func GetSubscriberInstallment(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	subscriberID := c.Param("subscriberId")
	saleID := c.Query("saleId")

	var inst models.SubscriberInstallment
	query := config.DB.Where("subscriber_id = ? AND company_id = ?", subscriberID, companyID)

	if saleID != "" {
		// When saleId is provided, find the exact installment for this sale (any status)
		query = query.Where("sale_id = ?", saleID)
	} else {
		// Default: return active installment first, then completed
		query = query.Where("status IN ?", []string{"active", "completed"})
	}

	if err := query.Order("CASE WHEN status = 'active' THEN 0 ELSE 1 END").First(&inst).Error; err != nil {
		utils.ErrorResponse(c, 404, "No installment found", err.Error())
		return
	}

	// Fetch the original sale with its items
	var sale models.Sale
	var saleItems []models.SaleItem
	config.DB.Where("id = ? AND company_id = ?", inst.SaleID, companyID).First(&sale)
	config.DB.Where("sale_id = ?", inst.SaleID).Find(&saleItems)

	utils.SuccessResponse(c, "Installment found", gin.H{
		"installment": inst,
		"sale":        sale,
		"saleItems":   saleItems,
	})
}

// PayInstallment records a payment against the next installment for a subscriber.
func PayInstallment(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	var req struct {
		Amount float64 `json:"amount"`
		Date   string  `json:"date"`
		Method string  `json:"method"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	var inst models.SubscriberInstallment
	if err := config.DB.
		Where("id = ? AND company_id = ?", id, companyID).
		First(&inst).Error; err != nil {
		utils.ErrorResponse(c, 404, "Installment not found", err.Error())
		return
	}

	if inst.Status != "active" {
		utils.ErrorResponse(c, 400, "Installment is not active", "status: "+inst.Status)
		return
	}

	if inst.PaidInstallments >= inst.TotalInstallments {
		utils.ErrorResponse(c, 400, "All installments already paid", "fully paid")
		return
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		inst.PaidInstallments++
		inst.NextInstallment = inst.PaidInstallments + 1
		if inst.PaidInstallments >= inst.TotalInstallments {
			inst.Status = "completed"
		}
		if err := tx.Save(&inst).Error; err != nil {
			return err
		}

		// Create a Payment record so installment payments appear in dashboard collections
		paymentDate := req.Date
		if paymentDate == "" {
			paymentDate = time.Now().Format("2006-01-02")
		}
		payment := models.Payment{
			TenantModel:    models.TenantModel{CompanyID: companyID},
			SubscriberID:   &inst.SubscriberID,
			SubscriberName: inst.SubscriberName,
			Amount:         req.Amount,
			PaymentDate:    paymentDate,
			Method:         req.Method,
		}
		return tx.Create(&payment).Error
	})
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to record installment payment", err.Error())
		return
	}

	utils.SuccessResponse(c, "Installment payment recorded", inst)
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

// DeletePOSSale deletes a sale and its line items (cascaded).
func DeletePOSSale(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	var sale models.Sale
	if err := config.DB.
		Scopes(models.TenantScope(companyID)).
		Where("id = ?", id).
		First(&sale).Error; err != nil {
		utils.ErrorResponse(c, 404, "Sale not found", err.Error())
		return
	}

	if err := config.DB.Delete(&sale).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete sale", err.Error())
		return
	}

	utils.SuccessResponse(c, "Sale deleted successfully", nil)
}
