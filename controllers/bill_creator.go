package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"awesomeProject/config"
	"awesomeProject/models"
)

type BillGroup struct {
	ConnectionIDs  []string `json:"connectionIds"`
	ConnectionType string   `json:"connectionType"`
	Amount         float64  `json:"amount"`
	Subscribers    int      `json:"subscribers"`
	Sublocality    string   `json:"sublocality"`
}

type CreateBillRequest struct {
	ConnectionIDs []string    `json:"connectionIds"`
	GroupedBills  []BillGroup `json:"groupedBills"`
	Month         string      `json:"month"`
	Year          string      `json:"year"`
	BillType      string      `json:"billType"`
	SublocalityID string      `json:"sublocalityId"`
}

type DeleteBillRequest struct {
	ConnectionIDs []string    `json:"connectionIds"`
	GroupedBills  []BillGroup `json:"groupedBills"`
	Month         string      `json:"month"`
	Year          string      `json:"year"`
	BillType      string      `json:"billType"`
	SublocalityID string      `json:"sublocalityId"`
}

// connectionBillType returns the canonical bill-type label for a connection.
func connectionBillType(connectionType string) string {
	switch strings.ToLower(strings.TrimSpace(connectionType)) {
	case "internet":
		return "internet"
	case "tv_cable":
		return "tv_cable"
	case "both":
		return "both"
	default:
		return strings.ToLower(strings.TrimSpace(connectionType))
	}
}

// connectionBillAmount returns the fee that a single bill for this connection
// must charge, using the amount recorded on the connection itself.
func connectionBillAmount(conn models.Connection) float64 {
	switch strings.ToLower(strings.TrimSpace(conn.ConnectionType)) {
	case "internet":
		return conn.SameAmount
	case "tv_cable":
		return conn.Amount
	default:
		return conn.Amount + conn.SameAmount
	}
}

// Outcomes of billing one subscriber.
const (
	billOutcomeCreated = "created"
	billOutcomeExists  = "already_billed"         // per-subscriber bill exists
	billOutcomeLegacy  = "already_billed_grouped" // listed in an old grouped bill
)

// errInvalidArea marks a subscriber whose area reference is not a valid id.
// Querying it would make PostgreSQL abort the transaction, so it is rejected
// before any database work and reported back to the operator.
var errInvalidArea = errors.New("invalid area id on subscriber; fix the subscriber's area and create the bill again")

// legacyGroupedBill returns the old grouped bill record (connection_id = nil)
// for the month that lists this subscriber, or nil.
//
// Before per-subscriber billing, Bill Creator saved ONE record per group whose
// connection_name is the comma-separated list of the billed subscribers'
// names (subscriber_ids was never filled). A subscriber is treated as billed by
// such a record when its name appears in that list. The connection type and
// area of the record are not required to match, because a subscriber may have
// changed type or area since; a missed match would charge the month twice,
// while a false match (two subscribers with the same name) only skips a bill,
// is reported in the response, and can be corrected by the operator.
func legacyGroupedBill(legacy []models.BillRecord, conn models.Connection) *models.BillRecord {
	name := strings.TrimSpace(conn.Name)
	for i := range legacy {
		rec := &legacy[i]
		if ids := strings.TrimSpace(rec.SubscriberIDs); ids != "" {
			var list []string
			if json.Unmarshal([]byte(ids), &list) == nil {
				for _, id := range list {
					if id == conn.ID.String() {
						return rec
					}
				}
				continue
			}
		}
		if name == "" {
			continue
		}
		if strings.Contains(", "+rec.ConnectionName+", ", ", "+name+", ") {
			return rec
		}
	}
	return nil
}

// loadLegacyGroupedBills returns the company's old grouped bill records for a
// month (read-only historical data).
func loadLegacyGroupedBills(companyID uuid.UUID, month, year string) ([]models.BillRecord, error) {
	var legacy []models.BillRecord
	err := config.DB.Where(
		"company_id = ? AND connection_id = ? AND month = ? AND year = ? AND status = 'Created'",
		companyID, uuid.Nil, month, year,
	).Find(&legacy).Error
	return legacy, err
}

// createBillForConnection creates one subscriber's bill inside the given
// transaction, or skips it when the subscriber was already billed for the
// month (per-subscriber record or old grouped record). It returns the outcome
// and any error, which rolls back this subscriber's transaction only.
// OLD signature: (tx, companyID, conn, companyName, month, year) (created, skipped bool, err error)
func createBillForConnection(tx *gorm.DB, companyID uuid.UUID, conn models.Connection, companyName, month, year string, legacy []models.BillRecord) (string, error) {
	// Lock the subscriber row so two concurrent requests cannot both create a
	// bill for the same subscriber/month/type.
	var locked models.Connection
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND company_id = ?", conn.ID, companyID).First(&locked).Error; err != nil {
		return "", err
	}

	typeLabel := connectionBillType(locked.ConnectionType)
	amount := connectionBillAmount(locked)

	// Resolve the subscriber's sublocality for the bill record.
	sublocalityName := ""
	if locked.SublocalityID != "" {
		// A non-UUID value would abort the transaction (see errInvalidArea).
		if _, err := uuid.Parse(locked.SublocalityID); err != nil {
			return "", errInvalidArea
		}
		// A valid id whose area no longer exists only leaves the area label on
		// the bill blank; it does not change what the subscriber owes.
		var area models.Area
		if err := tx.Where("id = ?", locked.SublocalityID).First(&area).Error; err == nil {
			if area.SubLocality != "" {
				sublocalityName = area.SubLocality
			} else {
				sublocalityName = area.Locality
			}
		}
	}

	// Per-subscriber duplicate check: only this subscriber is skipped.
	var existing models.BillRecord
	if err := tx.Where(
		"connection_id = ? AND month = ? AND year = ? AND connection_type = ? AND company_id = ? AND status = 'Created'",
		locked.ID, month, year, typeLabel, companyID,
	).First(&existing).Error; err == nil {
		return billOutcomeExists, nil
	}

	// Billed for this month by an old grouped record: never charge it again.
	if legacyGroupedBill(legacy, locked) != nil {
		return billOutcomeLegacy, nil
	}

	billRecord := models.BillRecord{
		ConnectionID:    locked.ID,
		ConnectionName:  locked.Name,
		ConnectionType:  typeLabel,
		Month:           month,
		Year:            year,
		Amount:          amount,
		RemainingAmount: amount,
		Sublocality:     sublocalityName,
		Status:          "Created",
		BillDate:        time.Now().Format("2006-01-02"),
		CreatedBy:       companyName,
	}
	billRecord.CompanyID = companyID
	if err := tx.Create(&billRecord).Error; err != nil {
		return "", err
	}

	invoice := models.Invoice{
		SubscriberID:    locked.ID,
		SubscriberName:  locked.Name,
		Amount:          amount,
		RemainingAmount: amount,
		DueDate:         month + " 28, " + year,
		Status:          "pending",
		BillingPeriod:   month + " " + year,
		Batch:           "bill-creator-" + month + "-" + year + "-" + typeLabel,
	}
	invoice.CompanyID = companyID
	if err := tx.Create(&invoice).Error; err != nil {
		return "", err
	}

	// Add the bill's actual amount to the existing Remaining balance.
	newRemaining := roundToTwo(locked.RemainingAmount + amount)
	if err := tx.Model(&models.Connection{}).
		Where("id = ? AND company_id = ?", locked.ID, companyID).
		UpdateColumns(map[string]interface{}{
			"remaining_amount": newRemaining,
			"payment_status":   paymentStatusForBalance(newRemaining),
		}).Error; err != nil {
		return "", err
	}

	return billOutcomeCreated, nil
}

// billFailure describes a subscriber that could not be billed.
type billFailure struct {
	SubscriberID string `json:"subscriberId"`
	Name         string `json:"name"`
	Reason       string `json:"reason"`
}

// CreateBills creates bill records per subscriber.
func CreateBills(c *gin.Context) {
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid company ID"})
		return
	}

	var req CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body", "error": err.Error()})
		return
	}

	companyName := getCompanyName(c)

	now := time.Now()
	month := req.Month
	year := req.Year
	if month == "" {
		month = now.Month().String()
	}
	if year == "" {
		year = now.Format("2006")
	}

	// OLD: every subscriber was billed inside ONE transaction, so a single
	// failing subscriber rolled back the whole run and nobody was billed. Each
	// subscriber now has its own transaction: a failure rolls back only that
	// subscriber (no partial bill, invoice or balance change) and is reported.

	createdCount := 0
	skippedCount := 0
	legacySkipped := 0
	failures := []billFailure{}
	seen := map[uuid.UUID]bool{}
	legacyByPeriod := map[string][]models.BillRecord{}

	billOne := func(connID uuid.UUID, billMonth, billYear string) {
		var conn models.Connection
		if err := config.DB.Where("id = ? AND company_id = ?", connID, companyID).First(&conn).Error; err != nil {
			// Unknown subscriber (deleted or another company): nothing to bill.
			return
		}

		key := billMonth + " " + billYear
		legacy, ok := legacyByPeriod[key]
		if !ok {
			var err error
			if legacy, err = loadLegacyGroupedBills(companyID, billMonth, billYear); err != nil {
				failures = append(failures, billFailure{conn.ID.String(), conn.Name, "could not read old bill records: " + err.Error()})
				log.Printf("CreateBills: subscriber %s (%s) not billed: %v", conn.ID, conn.Name, err)
				return
			}
			legacyByPeriod[key] = legacy
		}

		outcome := ""
		err := config.DB.Transaction(func(tx *gorm.DB) error {
			var err error
			outcome, err = createBillForConnection(tx, companyID, conn, companyName, billMonth, billYear, legacy)
			return err
		})
		if err != nil {
			failures = append(failures, billFailure{conn.ID.String(), conn.Name, err.Error()})
			log.Printf("CreateBills: subscriber %s (%s) not billed for %s: %v", conn.ID, conn.Name, key, err)
			return
		}
		switch outcome {
		case billOutcomeCreated:
			createdCount++
		case billOutcomeExists:
			skippedCount++
		case billOutcomeLegacy:
			skippedCount++
			legacySkipped++
		}
	}

	if len(req.GroupedBills) > 0 {
		for _, group := range req.GroupedBills {
			for _, connIDStr := range group.ConnectionIDs {
				connID, err := uuid.Parse(connIDStr)
				if err != nil || seen[connID] {
					continue
				}
				seen[connID] = true
				billOne(connID, month, year)
			}
		}
	} else {
		for _, connIDStr := range req.ConnectionIDs {
			connID, err := uuid.Parse(connIDStr)
			if err != nil || seen[connID] {
				continue
			}
			seen[connID] = true

			// Legacy format: without month/year the period comes from the
			// subscriber's recharge / installation date.
			billMonth, billYear := month, year
			if req.Month == "" || req.Year == "" {
				var conn models.Connection
				if err := config.DB.Where("id = ? AND company_id = ?", connID, companyID).First(&conn).Error; err == nil {
					dateStr := conn.RechargeDate
					if dateStr == "" {
						dateStr = conn.InstallationDate
					}
					if t, err := time.Parse("2006-01-02", dateStr); err == nil {
						if req.Month == "" {
							billMonth = t.Month().String()
						}
						if req.Year == "" {
							billYear = t.Format("2006")
						}
					}
				}
			}
			billOne(connID, billMonth, billYear)
		}
	}

	message := "Bills created successfully"
	if skippedCount > 0 || len(failures) > 0 {
		message = fmt.Sprintf("%d bill(s) created, %d already billed for this month", createdCount, skippedCount)
		if len(failures) > 0 {
			message += fmt.Sprintf(", %d failed", len(failures))
		}
		message += "."
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        message,
		"count":          createdCount,
		"skipped":        skippedCount,
		"skippedGrouped": legacySkipped,
		"failed":         len(failures),
		"failures":       failures,
	})
}

// DeleteBills soft-deletes bill records and their matching invoices, reversing
// the exact charge that each bill originally added to Remaining.
func DeleteBills(c *gin.Context) {
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid company ID"})
		return
	}

	var req DeleteBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body"})
		return
	}

	month := req.Month
	year := req.Year
	if month == "" {
		month = time.Now().Month().String()
	}
	if year == "" {
		year = time.Now().Format("2006")
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to start transaction", "error": tx.Error.Error()})
		return
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	deletedCount := 0
	skippedCount := 0
	legacyKept := 0
	abort := func(err error) {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete bills", "error": err.Error()})
	}

	deleteBillsForConnection := func(connID uuid.UUID) (int, int, error) {
		deleted, skipped := 0, 0
		var locked models.Connection
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND company_id = ?", connID, companyID).First(&locked).Error; err != nil {
			// Unknown subscriber: nothing to reverse.
			return 0, 0, nil
		}

		var bills []models.BillRecord
		if err := tx.Where(
			"connection_id = ? AND company_id = ? AND month = ? AND year = ? AND status = 'Created'",
			connID, companyID, month, year,
		).Find(&bills).Error; err != nil {
			return 0, 0, err
		}

		for _, bill := range bills {
			batch := "bill-creator-" + month + "-" + year + "-" + bill.ConnectionType

			// Protect payment history: refuse to delete a bill whose invoice
			// has already received a payment.
			var billInvoices []models.Invoice
			if err := tx.Where(
				"subscriber_id = ? AND company_id = ? AND batch = ?",
				connID, companyID, batch,
			).Find(&billInvoices).Error; err != nil {
				return deleted, skipped, err
			}
			if len(billInvoices) == 0 {
				// Fall back to any invoice for this subscriber/month.
				tx.Where(
					"subscriber_id = ? AND company_id = ? AND billing_period = ?",
					connID, companyID, month+" "+year,
				).Find(&billInvoices)
			}

			blocked := false
			for _, inv := range billInvoices {
				var paidCount int64
				if err := tx.Model(&models.Payment{}).
					Where("invoice_id = ? AND company_id = ?", inv.ID, companyID).
					Count(&paidCount).Error; err != nil {
					return deleted, skipped, err
				}
				if paidCount > 0 || inv.PaidAmount > 0 {
					blocked = true
					break
				}
			}
			if blocked {
				skipped++
				continue
			}

			// Reverse exactly the amount originally charged by this bill.
			newRemaining := roundToTwo(locked.RemainingAmount - bill.Amount)
			if err := tx.Model(&models.Connection{}).
				Where("id = ? AND company_id = ?", locked.ID, companyID).
				UpdateColumns(map[string]interface{}{
					"remaining_amount": newRemaining,
					"payment_status":   paymentStatusForBalance(newRemaining),
				}).Error; err != nil {
				return deleted, skipped, err
			}
			locked.RemainingAmount = newRemaining

			if err := tx.Delete(&models.BillRecord{}, "id = ?", bill.ID).Error; err != nil {
				return deleted, skipped, err
			}
			tx.Where("subscriber_id = ? AND company_id = ? AND batch = ?", connID, companyID, batch).
				Delete(&models.Invoice{})

			deleted++
		}
		return deleted, skipped, nil
	}

	seen := map[uuid.UUID]bool{}

	if len(req.GroupedBills) > 0 {
		for _, group := range req.GroupedBills {
			typeLabel := "both"
			switch group.ConnectionType {
			case "Internet":
				typeLabel = "internet"
			case "Cable":
				typeLabel = "tv_cable"
			case "Both":
				typeLabel = "both"
			default:
				typeLabel = strings.ToLower(group.ConnectionType)
			}

			for _, connIDStr := range group.ConnectionIDs {
				connID, err := uuid.Parse(connIDStr)
				if err != nil {
					continue
				}
				if seen[connID] {
					continue
				}
				seen[connID] = true
				d, s, err := deleteBillsForConnection(connID)
				if err != nil {
					abort(err)
					return
				}
				deletedCount += d
				skippedCount += s
			}

			// OLD: legacy group-level records (connection_id = nil) were deleted
			// here WITHOUT reversing what they had charged, so recreating the
			// month charged those subscribers a second time. Their per-
			// subscriber amounts are not recorded, so they cannot be reversed
			// exactly; they are now kept (historical record) and keep the
			// listed subscribers from being billed twice.
			var legacyCount int64
			if err := tx.Model(&models.BillRecord{}).Where(
				"connection_id = ? AND connection_type = ? AND month = ? AND year = ? AND company_id = ? AND status = 'Created'",
				uuid.Nil, typeLabel, month, year, companyID,
			).Count(&legacyCount).Error; err != nil {
				abort(err)
				return
			}
			legacyKept += int(legacyCount)
		}
	} else {
		var connIDs []uuid.UUID
		for _, idStr := range req.ConnectionIDs {
			if id, err := uuid.Parse(idStr); err == nil {
				connIDs = append(connIDs, id)
			}
		}
		for _, connID := range connIDs {
			if seen[connID] {
				continue
			}
			seen[connID] = true
			d, s, err := deleteBillsForConnection(connID)
			if err != nil {
				abort(err)
				return
			}
			deletedCount += d
			skippedCount += s
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to commit deletion", "error": err.Error()})
		return
	}

	message := "Bills deleted successfully"
	if skippedCount > 0 || legacyKept > 0 {
		message = fmt.Sprintf("%d bill(s) deleted", deletedCount)
		if skippedCount > 0 {
			message += fmt.Sprintf(", %d kept because payments were received against them", skippedCount)
		}
		if legacyKept > 0 {
			message += fmt.Sprintf(", %d old grouped bill record(s) kept (created by the previous version; their charges cannot be reversed exactly)", legacyKept)
		}
		message += "."
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    message,
		"count":      deletedCount,
		"skipped":    skippedCount,
		"legacyKept": legacyKept,
	})
}

// GetBillStatus tells the subscriber edit form whether a subscriber is already
// billed for the current month, so it can preview what "Create balance" will
// add (price difference when billed, full new fee when not).
// GET /billing/bills/status?companyId=...&connectionId=...
func GetBillStatus(c *gin.Context) {
	companyID, err := uuid.Parse(c.Query("companyId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid company ID"})
		return
	}
	connID, err := uuid.Parse(c.Query("connectionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid connection ID"})
		return
	}
	var conn models.Connection
	if err := config.DB.Where("id = ? AND company_id = ?", connID, companyID).First(&conn).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Subscriber not found"})
		return
	}
	now := time.Now()
	month, year := now.Month().String(), now.Format("2006")
	billed, err := subscriberBilledForMonth(config.DB, conn, month, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to check bill status", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"billed": billed, "month": month, "year": year}})
}

// GetBillRecords returns bill records for the company
func GetBillRecords(c *gin.Context) {
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid company ID"})
		return
	}

	var records []models.BillRecord
	if err := config.DB.Where("company_id = ? AND deleted_at IS NULL", companyID).Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch bill records"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": records})
}

// getCompanyName retrieves the company name from the request context or database
func getCompanyName(c *gin.Context) string {
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		return "Unknown"
	}

	var company models.Company
	if err := config.DB.Where("id = ?", companyID).First(&company).Error; err != nil {
		return "Unknown"
	}
	return company.Name
}
