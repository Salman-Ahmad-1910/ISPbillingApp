package controllers

import (
	"errors"
	"fmt"
	"log"
	"math"
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

// roundPOSMoney keeps money at two decimals, matching the rest of the codebase.
func roundPOSMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

// posPromiseRequest is the same shape as a normal POS sale plus what the customer
// is deferring. Items carry the price the operator typed, which may be below the
// product's list price.
type posPromiseRequest struct {
	posSaleRequest

	PaidNow       float64   `json:"paidNow"`
	PromiseDate   string    `json:"promiseDate"`
	Description   string    `json:"description"`
	SubscriberID  uuid.UUID `json:"subscriberId"`
	InternetID    string    `json:"internetId"`
	Phone         string    `json:"phone"`
	TransactionID string    `json:"transactionId"`
}

// listPriceForProduct returns the price the POS grid shows for a product, which
// is the selling price of its most recent purchase line. Used so a reduced price
// can be checked against the real list price instead of trusting the browser.
func listPriceForProduct(tx *gorm.DB, companyID, productID uuid.UUID) (float64, error) {
	var sellingPrice float64
	err := tx.Raw(`
		SELECT COALESCE(pi.selling_price, 0)
		FROM purchase_items pi
		JOIN purchases p ON p.id = pi.purchase_id AND p.deleted_at IS NULL
		WHERE pi.product_id = ?
			AND pi.company_id = ?
			AND pi.deleted_at IS NULL
		ORDER BY pi.created_at DESC
		LIMIT 1
	`, productID, companyID).Scan(&sellingPrice).Error
	return sellingPrice, err
}

// CreatePOSPromise hands the goods over now and records the unpaid remainder as a
// promise-to-pay. The sale is written in full, so stock and serial numbers leave
// immediately; only the money is deferred, and the subscriber's monthly
// remaining_amount is deliberately left alone so the two debts cannot be counted
// twice.
func CreatePOSPromise(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	userID, _ := c.Get("userID")

	var req posPromiseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Sale must contain at least one item", "no items")
		return
	}
	if req.SubscriberID == uuid.Nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "A customer is required to create a promise", "subscriberId is required")
		return
	}
	if req.PromiseDate == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Promise date is required", "promiseDate is required")
		return
	}
	if req.PaidNow < 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Amount paid cannot be negative", "paidNow must be zero or more")
		return
	}

	var created models.POSPromise
	var sale models.Sale

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Re-price every line against the real list price. The operator may sell
		// below list but never above it, and the server decides what the sale is
		// worth rather than trusting the posted totals.
		items, subtotal, taxTotal, err := revaluePromiseItems(req.Items, func(it posSaleItem) (float64, error) {
			return listPriceForProduct(tx, companyID, it.ProductID)
		})
		if err != nil {
			return fmt.Errorf("pricing the sale: %w", err)
		}

		discount := roundPOSMoney(req.Discount)
		if discount < 0 {
			discount = 0
		}
		total := promiseTotal(subtotal, taxTotal, discount)

		paidNow, pending, err := splitPromisePayment(total, req.PaidNow)
		if err != nil {
			return err
		}

		sale = models.Sale{
			SubscriberID:   req.SubscriberID,
			SubscriberName: req.SubscriberName,
			TotalAmount:    total,
			TaxAmount:      taxTotal,
			PaymentMethod:  req.PaymentMethod,
			Date:           req.Date,
			Status:         "completed",
			Discount:       discount,
			Items:          make([]models.SaleItem, 0, len(items)),
		}
		for _, it := range items {
			sale.Items = append(sale.Items, models.SaleItem{
				ProductID:     it.ProductID,
				ProductName:   it.ProductName,
				Quantity:      it.Quantity,
				Price:         it.Price,
				OriginalPrice: it.OriginalPrice,
				TaxPercent:    it.TaxPercent,
				SaleTax:       it.SaleTax,
				WthTax:        it.WthTax,
				SerialNumber:  it.SerialNumber,
				Model:         it.Model,
			})
		}

		// Goods leave the shop now regardless of how much was paid.
		if err := recordPOSSale(tx, companyID, &sale, items); err != nil {
			return fmt.Errorf("recording the sale and stock: %w", err)
		}

		creatorID, _ := toUUIDPtr(userID)
		// The counter screen already knows the customer, so trust its phone and
		// only fall back to a lookup when it was not sent.
		phone := req.Phone
		if phone == "" {
			phone = subscriberPhoneForPOS(tx, companyID, req.SubscriberID)
		}

		promise := models.POSPromise{
			SaleID:          sale.ID,
			SubscriberID:    req.SubscriberID,
			SubscriberName:  req.SubscriberName,
			InternetID:      req.InternetID,
			Phone:           phone,
			TotalAmount:     total,
			PaidAmount:      paidNow,
			PendingAmount:   pending,
			CollectedAmount: 0,
			PromiseDate:     req.PromiseDate,
			PromiseAt:       time.Now(),
			Description:     req.Description,
			Status:          "pending",
			CreatedByID:     creatorID,
			CreatedByName:   c.GetString("name"),
		}
		promise.CompanyID = companyID
		if err := tx.Create(&promise).Error; err != nil {
			return fmt.Errorf("saving the promise: %w", err)
		}

		// Anything paid at the counter is a collection in its own right, so the
		// money received is auditable from the first moment rather than only
		// after the follow-up visits.
		if paidNow > 0 {
			collection := models.POSPromiseCollection{
				POSPromiseID:  promise.ID,
				Amount:        paidNow,
				PaymentMethod: req.PaymentMethod,
				TransactionID: req.TransactionID,
				CollectedAt:   time.Now(),
				Note:          "Paid at the counter when the promise was made",
				CollectorID:   creatorID,
				CollectorName: c.GetString("name"),
			}
			collection.CompanyID = companyID
			if err := tx.Create(&collection).Error; err != nil {
				return fmt.Errorf("saving the opening collection: %w", err)
			}
		}

		created = promise
		return nil
	})

	if err != nil {
		var pe *posPromiseError
		if errors.As(err, &pe) {
			utils.ErrorResponse(c, http.StatusBadRequest, pe.msg, nil)
			return
		}
		// Anything not raised as a validation failure is a real fault: log it
		// with its cause so the failure is traceable instead of only surfacing
		// Postgres' "transaction aborted" follow-on error.
		log.Printf("CreatePOSPromise failed: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to record promise", err.Error())
		return
	}

	utils.CreatedResponse(c, "Promise recorded", gin.H{
		"promise": created,
		"sale":    sale,
	})
}

// posPromiseError is a validation failure safe to show the operator verbatim.
type posPromiseError struct{ msg string }

func (e *posPromiseError) Error() string { return e.msg }

// revaluePromiseItems recomputes every line at the price the operator typed,
// refusing to go above the real list price, and returns the line subtotal and
// tax total. Tax is recalculated from the price actually charged so the recorded
// tax always matches the sale.
func revaluePromiseItems(items []posSaleItem, listPrice func(posSaleItem) (float64, error)) ([]posSaleItem, float64, float64, error) {
	priced := make([]posSaleItem, 0, len(items))
	subtotal, taxTotal := 0.0, 0.0

	for _, it := range items {
		if it.Quantity <= 0 {
			return nil, 0, 0, &posPromiseError{msg: "Quantity must be greater than zero"}
		}

		list, err := listPrice(it)
		if err != nil {
			return nil, 0, 0, err
		}

		unitPrice := roundPOSMoney(it.Price)
		if unitPrice < 0 {
			return nil, 0, 0, &posPromiseError{msg: "Price cannot be negative"}
		}
		if list > 0 && unitPrice > list {
			return nil, 0, 0, &posPromiseError{msg: "Price for " + it.ProductName + " is above its list price"}
		}

		it.Price = unitPrice
		it.SaleTax = roundPOSMoney(unitPrice * float64(it.Quantity) * it.TaxPercent / 100)
		it.WthTax = roundPOSMoney(unitPrice*float64(it.Quantity) + it.SaleTax)

		subtotal += unitPrice * float64(it.Quantity)
		taxTotal += it.SaleTax
		priced = append(priced, it)
	}

	return priced, roundPOSMoney(subtotal), roundPOSMoney(taxTotal), nil
}

// promiseTotal applies the discount, never returning a negative sale.
func promiseTotal(subtotal, tax, discount float64) float64 {
	d := roundPOSMoney(discount)
	if d < 0 {
		d = 0
	}
	total := roundPOSMoney(subtotal + tax - d)
	if total < 0 {
		return 0
	}
	return total
}

// splitPromisePayment decides how much is paid at the counter and how much is
// promised. A promise with nothing left owing is rejected, because that case is
// a normal sale.
func splitPromisePayment(total, paidNow float64) (float64, float64, error) {
	if paidNow < 0 {
		return 0, 0, &posPromiseError{msg: "Amount paid cannot be negative"}
	}

	paid := roundPOSMoney(paidNow)
	if paid > total {
		return 0, 0, &posPromiseError{msg: "Amount paid is more than the sale total"}
	}

	pending := roundPOSMoney(total - paid)
	if pending <= 0 {
		return 0, 0, &posPromiseError{msg: "Nothing is left pending. Use a normal sale when the customer pays in full."}
	}

	return paid, pending, nil
}

// promiseStatusAfterCollection reports whether a promise is now closed.
func promiseStatusAfterCollection(remaining float64) string {
	if roundPOSMoney(remaining) <= 0 {
		return "completed"
	}
	return "partial"
}

// posPaymentSplit divides an amount across open promises, oldest first, so the
// oldest debt is always settled before newer ones. The returned slice aligns
// with the input promises and each part is never more than that promise's
// remaining balance. Callers validate that the total is covered first.
func posPaymentSplit(open []models.POSPromise, amount float64) []float64 {
	parts := make([]float64, len(open))
	remaining := roundPOSMoney(amount)
	for i, p := range open {
		if remaining <= 0 {
			continue
		}
		part := posPromiseRemaining(p)
		if part > remaining {
			part = remaining
		}
		parts[i] = roundPOSMoney(part)
		remaining = roundPOSMoney(remaining - part)
	}
	return parts
}

// subscriberPhoneForPOS looks up a contact number for the promise, best effort.
// It uses the model rather than hand-written SQL so a column mismatch can never
// abort the surrounding transaction, and any problem just yields no phone.
func subscriberPhoneForPOS(tx *gorm.DB, companyID, subscriberID uuid.UUID) string {
	var sub models.Subscriber
	if err := tx.Select("phone").
		Where("id = ? AND company_id = ?", subscriberID, companyID).
		First(&sub).Error; err != nil {
		return ""
	}
	return sub.Phone
}

func toUUIDPtr(v any) (*uuid.UUID, bool) {
	switch t := v.(type) {
	case uuid.UUID:
		return &t, true
	case string:
		if parsed, err := uuid.Parse(t); err == nil {
			return &parsed, true
		}
	}
	return nil, false
}

// posPromiseRemaining is how much is still owed on a promise.
func posPromiseRemaining(p models.POSPromise) float64 {
	remaining := roundPOSMoney(p.PendingAmount - p.CollectedAmount)
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetPOSPromises lists promises for a subscriber, newest first. With no
// subscriberId it lists the company's open promises, which is what the pending
// list needs.
func GetPOSPromises(c *gin.Context) {
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

	switch c.Query("status") {
	case "open":
		q = q.Where("status IN ?", []string{"pending", "partial"})
	case "", "all":
		// no status filter
	default:
		q = q.Where("status = ?", c.Query("status"))
	}

	var promises []models.POSPromise
	if err := q.Order("created_at DESC").Find(&promises).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch promises", err.Error())
		return
	}

	type promiseView struct {
		models.POSPromise
		RemainingAmount float64 `json:"remainingAmount"`
	}

	views := make([]promiseView, 0, len(promises))
	for _, p := range promises {
		views = append(views, promiseView{POSPromise: p, RemainingAmount: posPromiseRemaining(p)})
	}

	utils.SuccessResponse(c, "Promises fetched", views)
}

// CollectPOSPromise records money received against a promise and closes it once
// nothing is left owing. It never touches the subscriber's monthly balance.
func CollectPOSPromise(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	userID, _ := c.Get("userID")

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid promise id", err.Error())
		return
	}

	var req struct {
		Amount        float64 `json:"amount"`
		PaymentMethod string  `json:"paymentMethod"`
		TransactionID string  `json:"transactionId"`
		Note          string  `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}

	var updated models.POSPromise

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		var promise models.POSPromise
		if err := tx.Where("id = ? AND company_id = ?", id, companyID).First(&promise).Error; err != nil {
			return err
		}
		if promise.Status == "completed" || promise.Status == "cancelled" {
			return &posPromiseError{msg: "This promise is already " + promise.Status}
		}

		collectorID, _ := toUUIDPtr(userID)
		if err := collectOnPromise(tx, companyID, &promise, req.Amount, req.PaymentMethod, req.TransactionID, req.Note, c.GetString("name"), collectorID); err != nil {
			return err
		}
		updated = promise
		return nil
	})

	if err != nil {
		var pe *posPromiseError
		if errors.As(err, &pe) {
			utils.ErrorResponse(c, http.StatusBadRequest, pe.msg, nil)
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Promise not found", nil)
			return
		}
		log.Printf("CollectPOSPromise failed: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to record collection", err.Error())
		return
	}

	utils.SuccessResponse(c, "Collection recorded", gin.H{
		"promise":         updated,
		"remainingAmount": posPromiseRemaining(updated),
	})
}

// collectOnPromise records money received against one promise and updates its
// total collected and status. Amount is rounded and must be positive and no more
// than what is still owing.
func collectOnPromise(tx *gorm.DB, companyID uuid.UUID, promise *models.POSPromise, amount float64, method, transactionID, note, collectorName string, collectorID *uuid.UUID) error {
	amount = roundPOSMoney(amount)
	if amount <= 0 {
		return &posPromiseError{msg: "Collected amount must be greater than zero"}
	}
	if amount > posPromiseRemaining(*promise) {
		return &posPromiseError{msg: "Collected amount is more than the remaining amount"}
	}

	now := time.Now()
	collection := models.POSPromiseCollection{
		POSPromiseID:  promise.ID,
		Amount:        amount,
		PaymentMethod: method,
		TransactionID: transactionID,
		CollectedAt:   now,
		Note:          note,
		CollectorID:   collectorID,
		CollectorName: collectorName,
	}
	collection.CompanyID = companyID
	if err := tx.Create(&collection).Error; err != nil {
		return fmt.Errorf("saving the collection: %w", err)
	}

	promise.CollectedAmount = roundPOSMoney(promise.CollectedAmount + amount)
	promise.LastCollectedAt = &now
	promise.CollectorID = collectorID
	promise.CollectorName = collectorName
	promise.Status = promiseStatusAfterCollection(posPromiseRemaining(*promise))
	if err := tx.Save(promise).Error; err != nil {
		return fmt.Errorf("updating the promise: %w", err)
	}
	return nil
}

// posDuesPaymentRequest collects money from a customer against their open POS
// promises and records it as a visible "dues payment" sale row, so the sales
// list shows whether the customer still has pending after this payment.
type posDuesPaymentRequest struct {
	SubscriberID   uuid.UUID `json:"subscriberId"`
	SubscriberName string    `json:"subscriberName"`
	Amount         float64   `json:"amount"`
	PaymentMethod  string    `json:"paymentMethod"`
	TransactionID  string    `json:"transactionId"`
	Date           string    `json:"date"`
	Note           string    `json:"note"`
}

// CreatePOSDuesPayment collects an entered amount across the customer's open
// promises, oldest first, and creates a promisePayment sale row for it. No
// product is involved and no stock changes: the goods already left on the
// original promise sales.
func CreatePOSDuesPayment(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	userID, _ := c.Get("userID")

	var req posDuesPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input data", err.Error())
		return
	}
	if req.SubscriberID == uuid.Nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "A customer is required", "subscriberId is required")
		return
	}
	if strings.TrimSpace(req.PaymentMethod) == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Payment method is required", "paymentMethod is required")
		return
	}
	amount := roundPOSMoney(req.Amount)
	if amount <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Amount must be greater than zero", "amount must be positive")
		return
	}

	var createdSale models.Sale
	var remainingAfter float64

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Open promises oldest first, so money always settles the oldest debt.
		var open []models.POSPromise
		if err := tx.Where("company_id = ? AND subscriber_id = ? AND status IN ?",
			companyID, req.SubscriberID, []string{"pending", "partial"}).
			Order("created_at ASC").Find(&open).Error; err != nil {
			return err
		}

		openTotal := 0.0
		for _, p := range open {
			openTotal = roundPOSMoney(openTotal + posPromiseRemaining(p))
		}
		if openTotal <= 0 {
			return &posPromiseError{msg: "This customer has no pending dues to collect"}
		}
		if amount > openTotal {
			return &posPromiseError{msg: "Amount is more than the customer's outstanding dues"}
		}

		// Spread across the promises, oldest first, up to the entered amount.
		collectorID, _ := toUUIDPtr(userID)
		parts := posPaymentSplit(open, amount)
		for i := range open {
			if parts[i] <= 0 {
				continue
			}
			if err := collectOnPromise(tx, companyID, &open[i], parts[i], req.PaymentMethod, req.TransactionID, req.Note, c.GetString("name"), collectorID); err != nil {
				return fmt.Errorf("collecting on promise %s: %w", open[i].ID, err)
			}
		}

		// Default the date to today when the screen did not send one.
		date := strings.TrimSpace(req.Date)
		if date == "" {
			date = time.Now().Format("2006-01-02")
		}

		sale := models.Sale{
			SubscriberID:   req.SubscriberID,
			SubscriberName: req.SubscriberName,
			TotalAmount:    amount,
			TaxAmount:      0,
			PaymentMethod:  req.PaymentMethod,
			Date:           date,
			Status:         "completed",
			Discount:       0,
			PromisePayment: true,
		}
		sale.CompanyID = companyID
		if err := tx.Create(&sale).Error; err != nil {
			return fmt.Errorf("saving the dues payment sale: %w", err)
		}

		// What the customer still owes after this payment; the sales page labels
		// this row Pending or Paid from this value.
		remainingAfter = roundPOSMoney(openTotal - amount)

		createdSale = sale
		return nil
	})

	if err != nil {
		var pe *posPromiseError
		if errors.As(err, &pe) {
			utils.ErrorResponse(c, http.StatusBadRequest, pe.msg, nil)
			return
		}
		log.Printf("CreatePOSDuesPayment failed: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to record dues payment", err.Error())
		return
	}

	utils.CreatedResponse(c, "Dues payment recorded", gin.H{
		"sale":            createdSale,
		"remainingAmount": remainingAfter,
	})
}

// GetPOSPromiseCollections lists the money received against one promise.
func GetPOSPromiseCollections(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid promise id", err.Error())
		return
	}

	var collections []models.POSPromiseCollection
	if err := config.DB.Where("pos_promise_id = ? AND company_id = ?", id, companyID).
		Order("collected_at ASC").Find(&collections).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch collections", err.Error())
		return
	}

	utils.SuccessResponse(c, "Collections fetched", collections)
}
