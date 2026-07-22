package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"awesomeProject/config"
	"awesomeProject/models"
)

type BillGroup struct {
	ConnectionIDs []string `json:"connectionIds"`
	ConnectionType string  `json:"connectionType"`
	Amount        float64  `json:"amount"`
	Subscribers   int      `json:"subscribers"`
	Sublocality   string   `json:"sublocality"`
}

type CreateBillRequest struct {
	ConnectionIDs  []string    `json:"connectionIds"`
	GroupedBills   []BillGroup `json:"groupedBills"`
	Month          string      `json:"month"`
	Year           string      `json:"year"`
	BillType       string      `json:"billType"`
	SublocalityID  string      `json:"sublocalityId"`
}

type DeleteBillRequest struct {
	ConnectionIDs  []string    `json:"connectionIds"`
	GroupedBills   []BillGroup `json:"groupedBills"`
	Month          string      `json:"month"`
	Year           string      `json:"year"`
	BillType       string      `json:"billType"`
	SublocalityID  string      `json:"sublocalityId"`
}

// CreateBills creates bill records for the specified connections or grouped bills
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

	// Handle grouped bills (new format: one entry per connection type)
	if len(req.GroupedBills) > 0 {
		var createdCount int
		for _, group := range req.GroupedBills {
			if len(group.ConnectionIDs) == 0 {
				continue
			}

			// Determine type label
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

			// Calculate total amount from connections
			var totalAmount float64
			var names []string
			for _, connIDStr := range group.ConnectionIDs {
				connID, err := uuid.Parse(connIDStr)
				if err != nil {
					continue
				}
				var conn models.Connection
				if err := config.DB.Where("id = ? AND company_id = ?", connID, companyID).First(&conn).Error; err != nil {
					continue
				}

				switch conn.ConnectionType {
				case "tv_cable":
					totalAmount += conn.Amount
				case "internet":
					totalAmount += conn.SameAmount
				default:
					totalAmount += conn.Amount + conn.SameAmount
				}
				names = append(names, conn.Name)
			}

			if totalAmount == 0 {
				totalAmount = group.Amount
			}

			if len(names) == 0 {
				names = []string{typeLabel + " subscribers"}
			}

			// Check if a bill already exists for this type/month/year
			var existing models.BillRecord
			if err := config.DB.Where(
				"connection_type = ? AND month = ? AND year = ? AND company_id = ? AND status = 'Created'",
				typeLabel, month, year, companyID,
			).First(&existing).Error; err == nil {
				continue
			}

			billRecord := models.BillRecord{
				ConnectionID:    uuid.Nil,
				ConnectionName:  strings.Join(names, ", "),
				ConnectionType:  typeLabel,
				Month:           month,
				Year:            year,
				Amount:          totalAmount,
				RemainingAmount: totalAmount,
				Sublocality:     group.Sublocality,
				Status:          "Created",
				BillDate:        now.Format("2006-01-02"),
				CreatedBy:       companyName,
			}
			billRecord.CompanyID = companyID

			if err := config.DB.Create(&billRecord).Error; err != nil {
				continue
			}

			dueDate := month + " 28, " + year
			invoice := models.Invoice{
				SubscriberID:    uuid.Nil,
				SubscriberName:  strings.Join(names, ", "),
				Amount:          totalAmount,
				RemainingAmount: totalAmount,
				DueDate:         dueDate,
				Status:          "pending",
				BillingPeriod:   month + " " + year,
				Batch:           "bill-creator-" + month + "-" + year + "-" + typeLabel,
			}
			invoice.CompanyID = companyID
			config.DB.Create(&invoice)

			createdCount++
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Bills created successfully",
			"count":   createdCount,
		})
		return
	}

	// Legacy format: individual connection IDs (backward compatible)
	var createdCount int
	for _, connIDStr := range req.ConnectionIDs {
		connID, err := uuid.Parse(connIDStr)
		if err != nil {
			continue
		}

		var conn models.Connection
		if err := config.DB.Where("id = ? AND company_id = ?", connID, companyID).First(&conn).Error; err != nil {
			continue
		}

		// Determine amount based on connection type
		var amount float64
		switch conn.ConnectionType {
		case "tv_cable":
			amount = conn.Amount
		case "internet":
			amount = conn.SameAmount
		case "both":
			amount = conn.Amount + conn.SameAmount
		default:
			amount = conn.Amount + conn.SameAmount
		}

		// Determine month/year from connection dates if not specified
		connMonth := month
		connYear := year
		if req.Month == "" || req.Year == "" {
			dateStr := conn.RechargeDate
			if dateStr == "" {
				dateStr = conn.InstallationDate
			}
			if dateStr != "" {
				t, err := time.Parse("2006-01-02", dateStr)
				if err == nil {
					if req.Month == "" {
						connMonth = t.Month().String()
					}
					if req.Year == "" {
						connYear = t.Format("2006")
					}
				}
			}
		}

		// Get sublocality name
		sublocalityName := ""
		if conn.SublocalityID != "" {
			var area models.Area
			if err := config.DB.Where("id = ?", conn.SublocalityID).First(&area).Error; err == nil {
				if area.SubLocality != "" {
					sublocalityName = area.SubLocality
				} else {
					sublocalityName = area.Locality
				}
			}
		}

		// Check if bill already exists for this connection/month/year
		var existing models.BillRecord
		if err := config.DB.Where(
			"connection_id = ? AND month = ? AND year = ? AND company_id = ? AND status = 'Created'",
			connID, connMonth, connYear, companyID,
		).First(&existing).Error; err == nil {
			continue // Already created
		}

		billRecord := models.BillRecord{
			ConnectionID:    connID,
			ConnectionName:  conn.Name,
			ConnectionType:  conn.ConnectionType,
			Month:           connMonth,
			Year:            connYear,
			Amount:          amount,
			RemainingAmount: amount,
			Sublocality:     sublocalityName,
			Status:          "Created",
			BillDate:        now.Format("2006-01-02"),
			CreatedBy:       companyName,
		}
		billRecord.CompanyID = companyID

		if err := config.DB.Create(&billRecord).Error; err != nil {
			continue
		}

		dueDate := connMonth + " 28, " + connYear
		invoice := models.Invoice{
			SubscriberID:    connID,
			SubscriberName:  conn.Name,
			Amount:          amount,
			RemainingAmount: amount,
			DueDate:         dueDate,
			Status:          "pending",
			BillingPeriod:   connMonth + " " + connYear,
			Batch:           "bill-creator-" + connMonth + "-" + connYear,
		}
		invoice.CompanyID = companyID
		config.DB.Create(&invoice)

		createdCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bills created successfully",
		"count":   createdCount,
	})
}

// DeleteBills soft-deletes bill records and their matching invoices
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

	// Handle grouped bills (bills with uuid.Nil connection ID)
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

			config.DB.Where(
				"connection_type = ? AND month = ? AND year = ? AND company_id = ? AND status = 'Created'",
				typeLabel, month, year, companyID,
			).Delete(&models.BillRecord{})

			batch := "bill-creator-" + month + "-" + year + "-" + typeLabel
			config.DB.Where(
				"company_id = ? AND batch = ?",
				companyID, batch,
			).Delete(&models.Invoice{})
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Bills deleted successfully",
			"count":   len(req.GroupedBills),
		})
		return
	}

	// Legacy format: individual connection IDs
	var connIDs []uuid.UUID
	for _, idStr := range req.ConnectionIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			connIDs = append(connIDs, id)
		}
	}

	config.DB.Where(
		"connection_id IN ? AND company_id = ? AND status = 'Created'",
		connIDs, companyID,
	).Delete(&models.BillRecord{})

	batch := "bill-creator-"
	if month != "" && year != "" {
		batch = "bill-creator-" + month + "-" + year
	}

	config.DB.Where(
		"subscriber_id IN ? AND company_id = ? AND batch = ?",
		connIDs, companyID, batch,
	).Delete(&models.Invoice{})

	var deletedCount int64
	result := config.DB.Where(
		"connection_id IN ? AND company_id = ? AND status = 'Created'",
		connIDs, companyID,
	).Delete(&models.BillRecord{})
	deletedCount = result.RowsAffected

	c.JSON(http.StatusOK, gin.H{
		"message": "Bills deleted successfully",
		"count":   deletedCount,
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
