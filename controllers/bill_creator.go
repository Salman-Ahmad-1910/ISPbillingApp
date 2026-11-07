package controllers

import (
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

// createBillForConnection creates one subscriber's bill inside the given
// transaction, or skips it when an active bill already exists. It returns
// created/skipped flags and any error that should abort the transaction.
func createBillForConnection(tx *gorm.DB, companyID uuid.UUID, conn models.Connection, companyName, month, year string) (bool, bool, error) {
	// Lock the subscriber row so two concurrent requests cannot both create a
	// bill for the same subscriber/month/type.
	var locked models.Connection
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND company_id = ?", conn.ID, companyID).First(&locked).Error; err != nil {
		return false, false, err
	}

	typeLabel := connectionBillType(locked.ConnectionType)
	amount := connectionBillAmount(locked)

	// Resolve the subscriber's sublocality for the bill record.
	sublocalityName := ""
	if locked.SublocalityID != "" {
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
		return false, true, nil
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
		return false, false, err
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
		return false, false, err
	}

	// Add the bill's actual amount to the existing Remaining balance.
	newRemaining := roundToTwo(locked.RemainingAmount + amount)
	if err := tx.Model(&models.Connection{}).
		Where("id = ? AND company_id = ?", locked.ID, companyID).
		UpdateColumns(map[string]interface{}{
			"remaining_amount": newRemaining,
			"payment_status":   paymentStatusForBalance(newRemaining),
		}).Error; err != nil {
		return false, false, err
	}

	return true, false, nil
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

	createdCount := 0
	skippedCount := 0
	seen := map[uuid.UUID]bool{}

	abort := func(err error) {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create bills", "error": err.Error()})
	}

	if len(req.GroupedBills) > 0 {
		for _, group := range req.GroupedBills {
			if len(group.ConnectionIDs) == 0 {
				continue
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

				var conn models.Connection
				if err := tx.Where("id = ? AND company_id = ?", connID, companyID).First(&conn).Error; err != nil {
					continue
				}

				created, skipped, err := createBillForConnection(tx, companyID, conn, companyName, month, year)
				if err != nil {
					abort(err)
					return
				}
				if created {
					createdCount++
				}
				if skipped {
					skippedCount++
				}
			}
		}
	} else {
		for _, connIDStr := range req.ConnectionIDs {
			connID, err := uuid.Parse(connIDStr)
			if err != nil {
				continue
			}
			if seen[connID] {
				continue
			}
			seen[connID] = true

			var conn models.Connection
			if err := tx.Where("id = ? AND company_id = ?", connID, companyID).First(&conn).Error; err != nil {
				continue
			}

			billMonth := month
			billYear := year
			if req.Month == "" || req.Year == "" {
				dateStr := conn.RechargeDate
				if dateStr == "" {
					dateStr = conn.InstallationDate
				}
				if dateStr != "" {
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

			created, skipped, err := createBillForConnection(tx, companyID, conn, companyName, billMonth, billYear)
			if err != nil {
				abort(err)
				return
			}
			if created {
				createdCount++
			}
			if skipped {
				skippedCount++
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to commit bills", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bills created successfully",
		"count":   createdCount,
		"skipped": skippedCount,
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

			// Remove any legacy group-level bill record for this month/type
			// (connection_id is the zero UUID) so it cannot block recreation.
			// Payments on its invoice are protected.
			var legacyBills []models.BillRecord
			if err := tx.Where(
				"connection_id = ? AND connection_type = ? AND month = ? AND year = ? AND company_id = ? AND status = 'Created'",
				uuid.Nil, typeLabel, month, year, companyID,
			).Find(&legacyBills).Error; err == nil {
				for _, lb := range legacyBills {
					legacyBatch := "bill-creator-" + month + "-" + year + "-" + typeLabel
					var legacyInvoices []models.Invoice
					tx.Where("subscriber_id = ? AND company_id = ? AND batch = ?", uuid.Nil, companyID, legacyBatch).
						Find(&legacyInvoices)
					blocked := false
					for _, inv := range legacyInvoices {
						var paidCount int64
						tx.Model(&models.Payment{}).Where("invoice_id = ? AND company_id = ?", inv.ID, companyID).Count(&paidCount)
						if paidCount > 0 || inv.PaidAmount > 0 {
							blocked = true
							break
						}
					}
					if blocked {
						skippedCount++
						continue
					}
					if err := tx.Delete(&models.BillRecord{}, "id = ?", lb.ID).Error; err != nil {
						abort(err)
						return
					}
					tx.Where("subscriber_id = ? AND company_id = ? AND batch = ?", uuid.Nil, companyID, legacyBatch).
						Delete(&models.Invoice{})
					deletedCount++
				}
			}
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

	c.JSON(http.StatusOK, gin.H{
		"message": "Bills deleted successfully",
		"count":   deletedCount,
		"skipped": skippedCount,
	})
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
