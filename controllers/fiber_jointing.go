package controllers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// fiberJointingTotal is the full service charge before any payment is applied.
// The operator may leave a component at zero, but a charge with nothing to bill
// is rejected upstream.
func fiberJointingTotal(material, labor, jointingCharge float64) float64 {
	return roundPOSMoney(material + labor + jointingCharge)
}

// fiberJointingRemaining is how much is still owed on a charge, never negative.
func fiberJointingRemaining(total, paid float64) float64 {
	remaining := roundPOSMoney(total - paid)
	if remaining < 0 {
		return 0
	}
	return remaining
}

// fiberJointingStatus derives the payment status from the money actually
// received. A charge paid in full is "paid"; any partial payment is "partial";
// nothing yet received is "promise" when the customer promised to pay by a
// date, otherwise "unpaid". The helper returns "" for invalid inputs so the
// caller can treat those separately.
func fiberJointingStatus(total, received float64, promised bool) string {
	total = roundPOSMoney(total)
	received = roundPOSMoney(received)
	if received < 0 || received > total {
		return ""
	}
	if received >= total {
		return models.FiberPaymentStatusPaid
	}
	if received > 0 {
		return models.FiberPaymentStatusPartial
	}
	if promised {
		return models.FiberPaymentStatusPromise
	}
	return models.FiberPaymentStatusUnpaid
}

// fiberJointingRequest mirrors the Fiber Jointing form. The operator picks how
// much is received now; paymentOption is only a UX hint (full / half / promise /
// unpaid) and never overrides the money math.
type fiberJointingRequest struct {
	SubscriberID   uuid.UUID `json:"subscriberId"`
	SubscriberName string    `json:"subscriberName"`
	InternetID     string    `json:"internetId"`
	Phone          string    `json:"phone"`

	Description    string  `json:"description"`
	JointCount     int     `json:"jointCount"`
	MaterialCost   float64 `json:"materialCost"`
	LaborCost      float64 `json:"laborCost"`
	JointingCharge float64 `json:"jointingCharge"`
	TechnicianID   string  `json:"technicianId"`
	TechnicianName string  `json:"technicianName"`
	ServiceDate    string  `json:"serviceDate"`
	Reason         string  `json:"reason"`
	Notes          string  `json:"notes"`

	PaymentOption     string  `json:"paymentOption"`
	AmountReceivedNow float64 `json:"amountReceivedNow"`
	PaymentMethod     string  `json:"paymentMethod"`
	TransactionID     string  `json:"transactionId"`
	PromiseDueDate    string  `json:"promiseDueDate"`
	PromiseNote       string  `json:"promiseNote"`
}

// CreateFiberJointing records a one-time fiber jointing / cable repair charge,
// writes the linked sale (without touching stock), and takes the money received
// now through the normal Payment + Ledger path. The outstanding remainder stays
// on the fiber jointing record and is never folded into the subscriber's monthly
// connections.remaining_amount, so the one-time service debt cannot be counted
// twice with the recurring bill.
func CreateFiberJointing(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	userID, _ := c.Get("userID")

	var req fiberJointingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}
	if req.SubscriberID == uuid.Nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "A subscriber is required", "subscriberId is required")
		return
	}

	total := fiberJointingTotal(req.MaterialCost, req.LaborCost, req.JointingCharge)
	if total <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Total amount must be greater than zero", "no charge amount")
		return
	}

	received := roundPOSMoney(req.AmountReceivedNow)
	if received < 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Amount received cannot be negative", "amountReceivedNow must be zero or more")
		return
	}
	if received > total {
		utils.ErrorResponse(c, http.StatusBadRequest, "Amount received cannot be more than the total", "amountReceivedNow exceeds total")
		return
	}

	promised := strings.TrimSpace(req.PromiseDueDate) != ""
	if received > 0 && strings.TrimSpace(req.PaymentMethod) == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Payment method is required", "paymentMethod is required")
		return
	}
	if received < total && strings.EqualFold(strings.TrimSpace(req.PaymentOption), "promise") && !promised {
		utils.ErrorResponse(c, http.StatusBadRequest, "Promise due date is required", "promiseDueDate is required")
		return
	}

	status := fiberJointingStatus(total, received, promised)
	if status == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid payment amounts", "status derivation failed")
		return
	}

	var created models.FiberJointing
	var createdSale models.Sale

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		name, internetID, phone := fiberSubscriberSnapshot(tx, companyID, req.SubscriberID)
		if name == "" {
			name = strings.TrimSpace(req.SubscriberName)
		}
		if internetID == "" {
			internetID = strings.TrimSpace(req.InternetID)
		}
		if phone == "" {
			phone = strings.TrimSpace(req.Phone)
		}

		serviceDate := strings.TrimSpace(req.ServiceDate)
		if serviceDate == "" {
			serviceDate = time.Now().Format("2006-01-02")
		}

		creatorID, _ := toUUIDPtr(userID)
		technicianID, _ := toUUIDPtr(req.TechnicianID)

		description := strings.TrimSpace(req.Description)
		itemName := "Fiber Jointing"
		if description != "" {
			itemName = "Fiber Jointing - " + description
		}

		sale := models.Sale{
			SubscriberID:   req.SubscriberID,
			SubscriberName: name,
			TotalAmount:    total,
			TaxAmount:      0,
			PaymentMethod:  req.PaymentMethod,
			Date:           serviceDate,
			Status:         "completed",
			SaleType:       models.SaleTypeFiberJointing,
			PaidAmount:     received,
			PaymentStatus:  status,
			Items: []models.SaleItem{
				{
					ProductID:     uuid.Nil,
					ProductName:   itemName,
					Quantity:      1,
					Price:         total,
					OriginalPrice: total,
					TaxPercent:    0,
					SaleTax:       0,
					WthTax:        0,
				},
			},
		}
		sale.CompanyID = companyID
		if err := tx.Create(&sale).Error; err != nil {
			return fmt.Errorf("saving the fiber jointing sale: %w", err)
		}

		fiber := models.FiberJointing{
			SaleID:          sale.ID,
			SubscriberID:    req.SubscriberID,
			SubscriberName:  name,
			InternetID:      internetID,
			Phone:           phone,
			Description:     description,
			JointCount:      req.JointCount,
			MaterialCost:    roundPOSMoney(req.MaterialCost),
			LaborCost:       roundPOSMoney(req.LaborCost),
			JointingCharge:  roundPOSMoney(req.JointingCharge),
			TotalAmount:     total,
			PaidAmount:      received,
			RemainingAmount: fiberJointingRemaining(total, received),
			PaymentStatus:   status,
			PaymentMethod:   req.PaymentMethod,
			TechnicianID:    technicianID,
			TechnicianName:  strings.TrimSpace(req.TechnicianName),
			ServiceDate:     serviceDate,
			PromiseDueDate:  strings.TrimSpace(req.PromiseDueDate),
			PromiseNote:     strings.TrimSpace(req.PromiseNote),
			Reason:          strings.TrimSpace(req.Reason),
			Notes:           strings.TrimSpace(req.Notes),
			CreatedByID:     creatorID,
			CreatedByName:   c.GetString("name"),
		}
		fiber.CompanyID = companyID
		if err := tx.Create(&fiber).Error; err != nil {
			return fmt.Errorf("saving the fiber jointing charge: %w", err)
		}

		// The service charge itself is a ledger line (sale != money received),
		// so the ledger shows the full charge, what was actually received and
		// what is still outstanding.
		chargeLedger := models.LedgerEntry{
			TenantModel:  models.TenantModel{CompanyID: companyID},
			Date:         time.Now().Format(time.RFC3339),
			Description:  "Fiber jointing service charge - " + itemName + " for " + name,
			Debit:        total,
			Balance:      fiberJointingRemaining(total, received),
			SubscriberID: &req.SubscriberID,
			AccountType:  "customer",
		}
		if err := tx.Create(&chargeLedger).Error; err != nil {
			return fmt.Errorf("saving the fiber jointing ledger charge: %w", err)
		}

		if received > 0 {
			if err := recordFiberJointingReceipt(tx, companyID, fiber.ID, received, req.PaymentMethod, req.TransactionID, time.Now().Format(time.RFC3339), "Received when the service charge was created", c.GetString("name"), creatorID, &fiber); err != nil {
				return err
			}
		}

		created = fiber
		createdSale = sale
		return nil
	})

	if err != nil {
		var pe *posPromiseError
		if errors.As(err, &pe) {
			utils.ErrorResponse(c, http.StatusBadRequest, pe.msg, nil)
			return
		}
		log.Printf("CreateFiberJointing failed: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to record fiber jointing charge", err.Error())
		return
	}

	utils.CreatedResponse(c, "Fiber jointing charge recorded", gin.H{
		"fiberJointing": created,
		"sale":          createdSale,
	})
}

// fiberSubscriberSnapshot returns the subscriber's display name, internet id and
// phone, best effort, from the connections and subscribers records. A missing
// record yields empty strings rather than an error so the transaction cannot be
// aborted by an unrelated lookup.
func fiberSubscriberSnapshot(tx *gorm.DB, companyID, subscriberID uuid.UUID) (name, internetID, phone string) {
	var conn models.Connection
	if err := tx.Select("name", "internet_id").
		Where("id = ? AND company_id = ?", subscriberID, companyID).
		First(&conn).Error; err == nil {
		name = conn.Name
		internetID = conn.InternetID
	}
	phone = subscriberPhoneForPOS(tx, companyID, subscriberID)
	return name, internetID, phone
}

// recordFiberJointingReceipt writes one receipt against a fiber jointing charge:
// the Payment row and LedgerEntry (money actually received) plus the per-charge
// collection log, all inside the caller's transaction. It never touches the
// subscriber's monthly remaining_amount or balance.
func recordFiberJointingReceipt(tx *gorm.DB, companyID uuid.UUID, fiberJointingID uuid.UUID, amount float64, method, transactionID, date, note, collectorName string, collectorID *uuid.UUID, fiber *models.FiberJointing) error {
	amount = roundPOSMoney(amount)
	if amount <= 0 {
		return &posPromiseError{msg: "Received amount must be greater than zero"}
	}

	subscriberID := fiber.SubscriberID
	payment := models.Payment{
		TenantModel:     models.TenantModel{CompanyID: companyID},
		SubscriberID:    &subscriberID,
		SubscriberName:  fiber.SubscriberName,
		Amount:          amount,
		PaymentDate:     date,
		Method:          method,
		TransactionID:   transactionID,
		TransactionType: "fiber jointing",
		CollectorID:     collectorID,
	}
	if err := tx.Create(&payment).Error; err != nil {
		return fmt.Errorf("saving the fiber jointing payment: %w", err)
	}

	ledger := models.LedgerEntry{
		TenantModel:  models.TenantModel{CompanyID: companyID},
		Date:         date,
		Description:  "Fiber jointing payment received - " + fiber.Description + " for " + fiber.SubscriberName,
		Credit:       amount,
		SubscriberID: &subscriberID,
		AccountType:  "customer",
	}
	if err := tx.Create(&ledger).Error; err != nil {
		return fmt.Errorf("saving the fiber jointing ledger receipt: %w", err)
	}

	collection := models.FiberJointingPayment{
		FiberJointingID: fiberJointingID,
		Amount:          amount,
		PaymentMethod:   method,
		TransactionID:   transactionID,
		PaymentDate:     date,
		Note:            note,
		CollectedByID:   collectorID,
		CollectedByName: collectorName,
	}
	collection.CompanyID = companyID
	if err := tx.Create(&collection).Error; err != nil {
		return fmt.Errorf("saving the fiber jointing receipt log: %w", err)
	}

	fiber.PaidAmount = roundPOSMoney(fiber.PaidAmount + amount)
	fiber.RemainingAmount = fiberJointingRemaining(fiber.TotalAmount, fiber.PaidAmount)
	fiber.PaymentStatus = fiberJointingStatus(fiber.TotalAmount, fiber.PaidAmount, false)
	if fiber.PaymentStatus == "" {
		fiber.PaymentStatus = models.FiberPaymentStatusPartial
	}
	fiber.PaymentMethod = method
	now := time.Now()
	fiber.LastCollectedAt = &now
	fiber.CollectorID = collectorID
	fiber.CollectorName = collectorName
	return nil
}

// GetFiberJointings lists fiber jointing charges for the company, newest first.
// Optional filters: subscriberId, status (paid | partial | promise | unpaid),
// and search (matches subscriber name).
func GetFiberJointings(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	q := config.DB.Where("company_id = ?", companyID)

	if sid := c.Query("subscriberId"); sid != "" {
		parsed, err := uuid.Parse(sid)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid subscriberId", err.Error())
			return
		}
		q = q.Where("subscriber_id = ?", parsed)
	}

	switch status := strings.ToLower(strings.TrimSpace(c.Query("status"))); status {
	case "", "all":
		// no status filter
	case "open":
		q = q.Where("payment_status IN ?", []string{models.FiberPaymentStatusPartial, models.FiberPaymentStatusPromise, models.FiberPaymentStatusUnpaid})
	default:
		q = q.Where("payment_status = ?", status)
	}

	if s := strings.TrimSpace(c.Query("search")); s != "" {
		q = q.Where("LOWER(subscriber_name) LIKE ?", strings.ToLower(s)+"%")
	}

	var fibers []models.FiberJointing
	if err := q.Order("created_at DESC").Find(&fibers).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch fiber jointing charges", err.Error())
		return
	}

	utils.SuccessResponse(c, "Fiber jointing charges fetched", fibers)
}

// GetFiberJointing returns one charge with its receipt history.
func GetFiberJointing(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid fiber jointing id", err.Error())
		return
	}

	var fiber models.FiberJointing
	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).First(&fiber).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Fiber jointing charge not found", nil)
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch fiber jointing charge", err.Error())
		return
	}

	var payments []models.FiberJointingPayment
	if err := config.DB.Where("fiber_jointing_id = ? AND company_id = ?", id, companyID).
		Order("created_at ASC").Find(&payments).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch payments", err.Error())
		return
	}

	utils.SuccessResponse(c, "Fiber jointing charge fetched", gin.H{
		"fiberJointing": fiber,
		"payments":      payments,
	})
}

// GetFiberJointingPayments lists the receipts against one charge.
func GetFiberJointingPayments(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid fiber jointing id", err.Error())
		return
	}

	var payments []models.FiberJointingPayment
	if err := config.DB.Where("fiber_jointing_id = ? AND company_id = ?", id, companyID).
		Order("created_at ASC").Find(&payments).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch payments", err.Error())
		return
	}

	utils.SuccessResponse(c, "Payments fetched", payments)
}

// CollectFiberJointing records money received against a charge on the SAME sale:
// it never creates a second sale row, so the sales list shows one Fiber Jointing
// entry whose status moves from promise/unpaid -> partial -> paid.
func CollectFiberJointing(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	userID, _ := c.Get("userID")

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid fiber jointing id", err.Error())
		return
	}

	var req struct {
		Amount        float64 `json:"amount"`
		PaymentMethod string  `json:"paymentMethod"`
		TransactionID string  `json:"transactionId"`
		PaymentDate   string  `json:"paymentDate"`
		Note          string  `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}
	if strings.TrimSpace(req.PaymentMethod) == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Payment method is required", "paymentMethod is required")
		return
	}

	var updated models.FiberJointing

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		var fiber models.FiberJointing
		if err := tx.Where("id = ? AND company_id = ?", id, companyID).First(&fiber).Error; err != nil {
			return err
		}
		if fiber.PaymentStatus == models.FiberPaymentStatusPaid {
			return &posPromiseError{msg: "This charge is already fully paid"}
		}

		amount := roundPOSMoney(req.Amount)
		if amount <= 0 {
			return &posPromiseError{msg: "Collected amount must be greater than zero"}
		}
		if amount > fiber.RemainingAmount {
			return &posPromiseError{msg: "Collected amount is more than the remaining amount"}
		}

		collectorID, _ := toUUIDPtr(userID)
		date := strings.TrimSpace(req.PaymentDate)
		if date == "" {
			date = time.Now().Format(time.RFC3339)
		}
		if err := recordFiberJointingReceipt(tx, companyID, fiber.ID, amount, req.PaymentMethod, req.TransactionID, date, strings.TrimSpace(req.Note), c.GetString("name"), collectorID, &fiber); err != nil {
			return err
		}

		// Keep the linked sale's money fields in step so the sales page can show
		// the same Received / Remaining and status without a join.
		if err := tx.Model(&models.Sale{}).Where("id = ?", fiber.SaleID).
			Updates(map[string]interface{}{
				"paid_amount":    fiber.PaidAmount,
				"payment_status": fiber.PaymentStatus,
			}).Error; err != nil {
			return fmt.Errorf("updating the linked sale: %w", err)
		}

		if err := tx.Save(&fiber).Error; err != nil {
			return fmt.Errorf("updating the fiber jointing charge: %w", err)
		}

		updated = fiber
		return nil
	})

	if err != nil {
		var pe *posPromiseError
		if errors.As(err, &pe) {
			utils.ErrorResponse(c, http.StatusBadRequest, pe.msg, nil)
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Fiber jointing charge not found", nil)
			return
		}
		log.Printf("CollectFiberJointing failed: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to record collection", err.Error())
		return
	}

	utils.SuccessResponse(c, "Collection recorded", gin.H{
		"fiberJointing": updated,
	})
}