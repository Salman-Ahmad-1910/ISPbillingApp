package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetDashboardData(c *gin.Context) {
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}

	// 1. Subscribers Summary
	var activeCount, suspendedCount int64
	config.DB.Model(&models.Subscriber{}).Scopes(models.TenantScope(companyID)).Where("status = ?", "active").Count(&activeCount)
	config.DB.Model(&models.Subscriber{}).Scopes(models.TenantScope(companyID)).Where("status = ?", "suspended").Count(&suspendedCount)

	// 2. Recent Payments
	var payments []models.Payment
	config.DB.Scopes(models.TenantScope(companyID)).Order("payment_date desc").Limit(5).Find(&payments)

	// 3. Open Complaints
	var complaintCount int64
	var recentComplaints []models.Complaint
	config.DB.Model(&models.Complaint{}).Scopes(models.TenantScope(companyID)).Where("status NOT IN (?)", []string{"resolved", "closed"}).Count(&complaintCount)
	config.DB.Scopes(models.TenantScope(companyID)).Where("status NOT IN (?)", []string{"resolved", "closed"}).Order("created_at desc").Limit(5).Find(&recentComplaints)

	// 4. Daily Collection (Last 7 Days) - Simplified query
	type CollectionDay struct {
		Day        string  `json:"day"`
		Collection float64 `json:"collection"`
	}
	var dailyCollection []CollectionDay
	// Use simpler date formatting
	config.DB.Raw(`
		SELECT EXTRACT(DAY FROM payment_date) as day, SUM(amount) as collection 
		FROM payments 
		WHERE company_id = ? AND payment_date >= CURRENT_DATE - INTERVAL '7 days'
		GROUP BY EXTRACT(DAY FROM payment_date), payment_date
		ORDER BY payment_date DESC
		LIMIT 7
	`, companyID).Scan(&dailyCollection)

	// 5. New Subscribers (Growth)
	var growth []struct {
		Month string `json:"month"`
		New   int    `json:"new"`
	}
	config.DB.Raw(`
		SELECT EXTRACT(MONTH FROM created_at) as month, COUNT(*) as new
		FROM subscribers
		WHERE company_id = ? AND created_at >= CURRENT_DATE - INTERVAL '6 months'
		GROUP BY EXTRACT(MONTH FROM created_at), created_at
		ORDER BY created_at DESC
		LIMIT 6
	`, companyID).Scan(&growth)

	utils.SuccessResponse(c, "Dashboard data retrieved", gin.H{
		"subscribersStats": gin.H{
			"active":    activeCount,
			"suspended": suspendedCount,
		},
		"payments":        payments,
		"complaintsCount": complaintCount,
		"complaints":      recentComplaints,
		"dailyCollection": dailyCollection,
		"newSubscribers":  growth,
	})
}
