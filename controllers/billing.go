package controllers

import (
	"math"
	"sort"
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
		InvoiceID:      &invoice.ID,
		SubscriberID:   &invoice.SubscriberID,
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
	if err := config.DB.Scopes(models.TenantScope(companyID.(uuid.UUID))).Find(&payments).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch payments", err.Error())
		return
	}

	// Populate subscriber names from connections (payments use connection IDs)
	for i := range payments {
		if payments[i].SubscriberID != nil {
			var conn models.Connection
			if err := config.DB.Where("id = ?", *payments[i].SubscriberID).First(&conn).Error; err == nil {
				payments[i].SubscriberName = conn.Name
				payments[i].Address = conn.Address
				if conn.SublocalityID != "" {
					var area models.Area
					if err := config.DB.Where("id = ?", conn.SublocalityID).First(&area).Error; err == nil {
						if area.SubLocality != "" {
							payments[i].AreaName = area.SubLocality
						} else {
							payments[i].AreaName = area.Locality
						}
					}
				}
			} else {
				// Fallback: try the subscribers table
				var subscriber models.Subscriber
				if err := config.DB.Where("id = ?", *payments[i].SubscriberID).First(&subscriber).Error; err == nil {
					payments[i].SubscriberName = subscriber.Name
				} else {
					payments[i].SubscriberName = "Unknown Subscriber"
				}
			}
		} else {
			payments[i].SubscriberName = "Unknown Subscriber"
		}

		// Populate the collector name (recovery officer / user)
		if payments[i].CollectorID != nil {
			var user models.User
			if err := config.DB.Where("id = ?", *payments[i].CollectorID).First(&user).Error; err == nil {
				payments[i].CollectedByName = user.Name
			} else {
				var officer models.RecoveryOfficer
				if err := config.DB.Where("id = ?", *payments[i].CollectorID).First(&officer).Error; err == nil {
					payments[i].CollectedByName = officer.Name
				}
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

	// Get subscriber name from connections (payments use connection IDs)
	if payment.SubscriberID != nil {
		var conn models.Connection
		if err := config.DB.Where("id = ?", *payment.SubscriberID).First(&conn).Error; err == nil {
			payment.SubscriberName = conn.Name
		} else {
			var subscriber models.Subscriber
			if err := config.DB.Where("id = ?", *payment.SubscriberID).First(&subscriber).Error; err == nil {
				payment.SubscriberName = subscriber.Name
			}
		}
	}

	if err := config.DB.Create(&payment).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create payment", err.Error())
		return
	}

	// Update Connection's lastPaymentDate and reduce remainingAmount
	if payment.SubscriberID != nil {
		paymentDate := payment.PaymentDate
		if paymentDate == "" {
			paymentDate = time.Now().Format("2006-01-02")
		}
		var conn models.Connection
		if err := config.DB.Where("id = ?", *payment.SubscriberID).First(&conn).Error; err == nil {
			months := 0
			if conn.LastPaymentDate != nil && *conn.LastPaymentDate != "" {
				lastDate, err := time.Parse("2006-01-02", *conn.LastPaymentDate)
				if err == nil {
					now := time.Now()
					months = int(now.Year() - lastDate.Year())*12 + int(now.Month() - lastDate.Month())
				}
			} else if conn.RechargeDate != "" {
				lastDate, err := time.Parse("2006-01-02", conn.RechargeDate)
				if err == nil {
					now := time.Now()
					months = int(now.Year() - lastDate.Year())*12 + int(now.Month() - lastDate.Month())
				}
			} else {
				now := time.Now()
				months = int(now.Year()-conn.CreatedAt.Year())*12 + int(now.Month()-conn.CreatedAt.Month())
			}
			if months < 0 {
				months = 0
			}
			monthlyFee := conn.Amount
			switch conn.ConnectionType {
			case "internet":
				monthlyFee = conn.SameAmount
			case "both", "tv_cable":
				monthlyFee = conn.Amount + conn.SameAmount
			}
			actualOwed := max(0, conn.RemainingAmount) + monthlyFee*float64(months)
			newRemaining := max(0, actualOwed-payment.Amount)
			config.DB.Model(&models.Connection{}).
				Where("id = ?", *payment.SubscriberID).
				UpdateColumns(map[string]interface{}{
					"last_payment_date": paymentDate,
					"remaining_amount":  newRemaining,
				})
		}
	}

	// Allocate the payment against the connection's unpaid invoices
	// (oldest billing period first) so the Unpaid Collections report stays in sync.
	if payment.SubscriberID != nil {
		var unpaidInvoices []models.Invoice
		config.DB.Where("subscriber_id = ? AND status <> ? AND remaining_amount > 0", *payment.SubscriberID, "paid").
			Find(&unpaidInvoices)

		sort.SliceStable(unpaidInvoices, func(i, j int) bool {
			return invoicePeriodKey(unpaidInvoices[i]) < invoicePeriodKey(unpaidInvoices[j])
		})

		remainingToAllocate := payment.Amount
		for i := range unpaidInvoices {
			if remainingToAllocate <= 0 {
				break
			}
			inv := &unpaidInvoices[i]
			if inv.RemainingAmount <= 0 {
				continue
			}
			pay := math.Min(inv.RemainingAmount, remainingToAllocate)
			inv.PaidAmount += pay
			inv.RemainingAmount -= pay
			remainingToAllocate -= pay
			if inv.RemainingAmount <= 0 {
				inv.RemainingAmount = 0
				inv.Status = "paid"
			}
			config.DB.Model(&models.Invoice{}).
				Where("id = ?", inv.ID).
				UpdateColumns(map[string]interface{}{
					"paid_amount":      inv.PaidAmount,
					"remaining_amount": inv.RemainingAmount,
					"status":           inv.Status,
				})
		}
	}

	utils.CreatedResponse(c, "Payment created successfully", payment)
}

// invoicePeriodKey returns a sortable key for an invoice's billing period
// (e.g. "2025-04") so invoices are allocated oldest-first.
func invoicePeriodKey(inv models.Invoice) string {
	if t, err := time.Parse("January 2006", inv.BillingPeriod); err == nil {
		return t.Format("2006-01")
	}
	return inv.DueDate
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
	if payment.SubscriberID != nil {
		var subscriber models.Subscriber
		if err := config.DB.Where("id = ?", *payment.SubscriberID).First(&subscriber).Error; err == nil {
			payment.SubscriberName = subscriber.Name
		}
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
	if err := config.DB.Scopes(models.TenantScope(companyID.(uuid.UUID))).Find(&invoices).Error; err != nil {
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

// DeletePayment handles deleting a payment
func DeletePayment(c *gin.Context) {
	id := c.Param("id")
	companyID, _ := c.Get("companyID")

	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.Payment{}).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete payment", err.Error())
		return
	}

	utils.SuccessResponse(c, "Payment deleted successfully", nil)
}
