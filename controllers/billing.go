package controllers

import (
	"time"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PaymentRequest struct {
	InvoiceID   uuid.UUID  `json:"invoiceId" binding:"required"`
	Amount      float64    `json:"amount" binding:"required"`
	Method      string     `json:"method" binding:"required"`
	CollectorID *uuid.UUID `json:"collectorId"`
}

// ProcessPayment handles the transactional logic of Invoice -> Ledger -> Subscriber Balance
func ProcessPayment(c *gin.Context) {
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID := c.MustGet("companyID").(uuid.UUID)

	// Fetch Invoice
	var invoice models.Invoice
	if err := config.DB.Scopes(models.TenantScope(companyID)).First(&invoice, "id = ?", req.InvoiceID).Error; err != nil {
		utils.ErrorResponse(c, 404, "Invoice not found", nil)
		return
	}

	// TX block
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Create Payment Record
	payment := models.Payment{
		TenantModel:    models.TenantModel{CompanyID: companyID},
		InvoiceID:      invoice.ID,
		SubscriberID:   invoice.SubscriberID,
		SubscriberName: invoice.SubscriberName,
		Amount:         req.Amount,
		PaymentDate:    time.Now().Format(time.RFC3339),
		Method:         req.Method,
		CollectorID:    req.CollectorID,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to record payment", err.Error())
		return
	}

	// 2. Update Invoice Status
	invoice.Status = "paid" // Should handle partial payments here in future
	if err := tx.Save(&invoice).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to update invoice", err.Error())
		return
	}

	// 3. Create Ledger Entry (Credit)
	ledger := models.LedgerEntry{
		TenantModel:  models.TenantModel{CompanyID: companyID},
		Date:         time.Now().Format(time.RFC3339),
		Description:  "Payment for Invoice: " + invoice.BillingPeriod,
		Credit:       req.Amount,
		AccountType:  "customer",
		SubscriberID: &invoice.SubscriberID,
	}

	if err := tx.Create(&ledger).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create ledger entry", err.Error())
		return
	}

	// 4. Update Subscriber Balance
	if err := tx.Model(&models.Subscriber{}).Where("id = ?", invoice.SubscriberID).UpdateColumn("balance", gorm.Expr("balance - ?", req.Amount)).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to update subscriber balance", err.Error())
		return
	}

	tx.Commit()

	utils.CreatedResponse(c, "Payment processed successfully", payment)
}

// GetPayments lists all payments with relations
func GetPayments(c *gin.Context) {
	companyID, _ := c.Get("companyID")

	var payments []models.Payment
	if err := config.DB.Scopes(models.TenantScope(companyID.(uuid.UUID))).Preload("Invoice").Preload("Subscriber").Find(&payments).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch payments", err.Error())
		return
	}

	// Populate subscriber names
	for i := range payments {
		if payments[i].Subscriber.ID != uuid.Nil && payments[i].Subscriber.ID.String() != "00000000-0000-0000-0000-000000000000" {
			payments[i].SubscriberName = payments[i].Subscriber.Name
		} else {
			// Try to fetch subscriber directly if preload failed
			var subscriber models.Subscriber
			if err := config.DB.Where("id = ?", payments[i].SubscriberID).First(&subscriber).Error; err == nil {
				payments[i].SubscriberName = subscriber.Name
				payments[i].Subscriber = subscriber
			} else {
				payments[i].SubscriberName = "Unknown Subscriber"
			}
		}
	}

	utils.SuccessResponse(c, "Payments retrieved", payments)
}

// CreatePayment handles creating a new payment
func CreatePayment(c *gin.Context) {
	var payment models.Payment
	if err := c.ShouldBindJSON(&payment); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID, _ := c.Get("companyID")
	payment.CompanyID = companyID.(uuid.UUID)

	// Get subscriber name
	var subscriber models.Subscriber
	if err := config.DB.Where("id = ?", payment.SubscriberID).First(&subscriber).Error; err == nil {
		payment.SubscriberName = subscriber.Name
	}

	if err := config.DB.Create(&payment).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create payment", err.Error())
		return
	}

	utils.CreatedResponse(c, "Payment created successfully", payment)
}

// UpdatePayment handles updating a payment
func UpdatePayment(c *gin.Context) {
	id := c.Param("id")

	var payment models.Payment
	if err := config.DB.Where("id = ?", id).First(&payment).Error; err != nil {
		utils.ErrorResponse(c, 404, "Payment not found", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&payment); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	payment.ID = uuid.MustParse(id)

	// Get subscriber name if subscriber ID changed
	var subscriber models.Subscriber
	if err := config.DB.Where("id = ?", payment.SubscriberID).First(&subscriber).Error; err == nil {
		payment.SubscriberName = subscriber.Name
	}

	if err := config.DB.Save(&payment).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update payment", err.Error())
		return
	}

	utils.SuccessResponse(c, "Payment updated successfully", payment)
}

// GetInvoices lists all invoices with relations
func GetInvoices(c *gin.Context) {
	companyID, _ := c.Get("companyID")

	var invoices []models.Invoice
	if err := config.DB.Scopes(models.TenantScope(companyID.(uuid.UUID))).Preload("Subscriber").Find(&invoices).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch invoices", err.Error())
		return
	}

	utils.SuccessResponse(c, "Invoices retrieved", invoices)
}

// CreateInvoice handles creating a new invoice
func CreateInvoice(c *gin.Context) {
	var invoice models.Invoice
	if err := c.ShouldBindJSON(&invoice); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID, _ := c.Get("companyID")
	invoice.CompanyID = companyID.(uuid.UUID)

	if err := config.DB.Create(&invoice).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create invoice", err.Error())
		return
	}

	utils.CreatedResponse(c, "Invoice created successfully", invoice)
}
