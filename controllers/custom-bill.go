package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetCustomBills handles retrieving custom bills with subscriber names
func GetCustomBills(c *gin.Context) {
	companyIDInterface, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 401, "Company ID not found", nil)
		return
	}

	companyID, ok := companyIDInterface.(uuid.UUID)
	if !ok {
		utils.ErrorResponse(c, 500, "Invalid company ID format", nil)
		return
	}

	var customBills []models.CustomBill

	// Apply Tenant Scope with preload for Subscriber
	query := config.DB.Scopes(models.TenantScope(companyID)).Preload("Subscriber")

	if err := query.Find(&customBills).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch custom bills", err.Error())
		return
	}

	// Populate subscriber names and handle date field
	for i := range customBills {
		// Handle Subscriber Name
		if customBills[i].Subscriber.ID != uuid.Nil && customBills[i].Subscriber.ID.String() != "00000000-0000-0000-0000-000000000000" {
			customBills[i].SubscriberName = customBills[i].Subscriber.Name
			fmt.Printf("DEBUG: Found subscriber %s with name %s\n", customBills[i].Subscriber.ID, customBills[i].Subscriber.Name)
		} else {
			// Try to fetch subscriber directly if preload failed
			var subscriber models.Subscriber
			if err := config.DB.Where("id = ?", customBills[i].SubscriberID).First(&subscriber).Error; err == nil {
				customBills[i].SubscriberName = subscriber.Name
				customBills[i].Subscriber = subscriber
				fmt.Printf("DEBUG: Fetched subscriber %s with name %s\n", customBills[i].SubscriberID, subscriber.Name)
			} else {
				customBills[i].SubscriberName = "Unknown Subscriber"
				fmt.Printf("DEBUG: Could not find subscriber %s\n", customBills[i].SubscriberID)
			}
		}

		// Handle Date field - if empty, use CreatedAt
		if customBills[i].Date == "" {
			customBills[i].Date = customBills[i].CreatedAt.Format("2006-01-02T15:04:05Z07:00")
		}
	}

	utils.SuccessResponse(c, "Custom bills retrieved", customBills)
}

// CreateCustomBill handles creating a new custom bill
func CreateCustomBill(c *gin.Context) {
	var customBill models.CustomBill
	if err := c.ShouldBindJSON(&customBill); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID, _ := c.Get("companyID")
	customBill.CompanyID = companyID.(uuid.UUID)

	// Set the date to current time if not provided
	if customBill.Date == "" {
		customBill.Date = time.Now().Format("2006-01-02T15:04:05Z07:00")
	}

	// Get subscriber name
	var subscriber models.Subscriber
	if err := config.DB.Where("id = ?", customBill.SubscriberID).First(&subscriber).Error; err == nil {
		customBill.SubscriberName = subscriber.Name
	}

	if err := config.DB.Create(&customBill).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create custom bill", err.Error())
		return
	}

	utils.CreatedResponse(c, "Custom bill created successfully", customBill)
}

// UpdateCustomBill handles updating a custom bill
func UpdateCustomBill(c *gin.Context) {
	id := c.Param("id")

	var customBill models.CustomBill
	if err := config.DB.Where("id = ?", id).First(&customBill).Error; err != nil {
		utils.ErrorResponse(c, 404, "Custom bill not found", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&customBill); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	customBill.ID = uuid.MustParse(id)

	// Get subscriber name if subscriber ID changed
	var subscriber models.Subscriber
	if err := config.DB.Where("id = ?", customBill.SubscriberID).First(&subscriber).Error; err == nil {
		customBill.SubscriberName = subscriber.Name
	}

	if err := config.DB.Save(&customBill).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update custom bill", err.Error())
		return
	}

	utils.SuccessResponse(c, "Custom bill updated successfully", customBill)
}
