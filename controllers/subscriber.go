package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateSubscriber handles new allocations
func CreateSubscriber(c *gin.Context) {
	var sub models.Subscriber
	if err := c.ShouldBindJSON(&sub); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID, _ := c.Get("companyID")
	sub.CompanyID = companyID.(uuid.UUID)

	// Validate Port Availability explicitly
	var count int64
	config.DB.Model(&models.Subscriber{}).Where("splitter_id = ? AND splitter_port = ? AND company_id = ? AND status != 'deactivated'", sub.SplitterID, sub.SplitterPort, sub.CompanyID).Count(&count)

	if count > 0 {
		utils.ErrorResponse(c, 409, "Port Conflict", "The selected port is already in use by an active subscriber")
		return
	}

	if err := config.DB.Create(&sub).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create subscriber", err.Error())
		return
	}

	// Decrement available ports on the splitter
	if sub.SplitterPort > 0 {
		config.DB.Model(&models.Splitter{}).Where("id = ? AND available_ports > 0", sub.SplitterID).
			Update("available_ports", gorm.Expr("available_ports - 1"))
	}

	utils.CreatedResponse(c, "Subscriber created successfully", sub)
}

// GetSubscribers handles list with pagination and relations
func GetSubscribers(c *gin.Context) {
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

	var subscribers []models.Subscriber

	// Apply Tenant Scope
	query := config.DB.Scopes(models.TenantScope(companyID)).Preload("Package").Preload("Area").Preload("Splitter")

	// Basic filtering example
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&subscribers).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch subscribers", err.Error())
		return
	}

	// Populate PackageName and AreaName from relationships
	for i := range subscribers {
		// Handle Package
		if subscribers[i].Package.ID != uuid.Nil && subscribers[i].Package.ID.String() != "00000000-0000-0000-0000-000000000000" {
			subscribers[i].PackageName = subscribers[i].Package.Name
		} else {
			// Try to fetch package directly if preload failed
			var pkg models.Package
			if err := config.DB.Where("id = ?", subscribers[i].PackageID).First(&pkg).Error; err == nil {
				subscribers[i].PackageName = pkg.Name
				subscribers[i].Package = pkg
			} else {
				// Set a default value if package not found
				subscribers[i].PackageName = "Standard Package"
			}
		}

		// Handle Area
		if subscribers[i].Area.ID != uuid.Nil && subscribers[i].Area.ID.String() != "00000000-0000-0000-0000-000000000000" {
			// Create a composite area name from city, zone, and locality
			areaName := subscribers[i].Area.City
			if subscribers[i].Area.Zone != "" {
				areaName += ", " + subscribers[i].Area.Zone
			}
			if subscribers[i].Area.Locality != "" {
				areaName += ", " + subscribers[i].Area.Locality
			}
			subscribers[i].AreaName = areaName
		} else {
			// Try to fetch area directly if preload failed
			var area models.Area
			if err := config.DB.Where("id = ?", subscribers[i].AreaID).First(&area).Error; err == nil {
				// Create a composite area name from city, zone, and locality
				areaName := area.City
				if area.Zone != "" {
					areaName += ", " + area.Zone
				}
				if area.Locality != "" {
					areaName += ", " + area.Locality
				}
				subscribers[i].AreaName = areaName
				subscribers[i].Area = area
			} else {
				// Set a default value if area not found
				subscribers[i].AreaName = "Default Area"
			}
		}
	}

	utils.SuccessResponse(c, "Subscribers retrieved", subscribers)
}

// UpdateSubscriber handles updating subscriber information
func UpdateSubscriber(c *gin.Context) {
	id := c.Param("id")
	companyID, _ := c.Get("companyID")

	var subscriber models.Subscriber
	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).First(&subscriber).Error; err != nil {
		utils.ErrorResponse(c, 404, "Subscriber not found", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&subscriber); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	if err := config.DB.Save(&subscriber).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update subscriber", err.Error())
		return
	}

	utils.SuccessResponse(c, "Subscriber updated successfully", subscriber)
}

// DeleteSubscriber handles deleting a subscriber
func DeleteSubscriber(c *gin.Context) {
	id := c.Param("id")
	companyID, _ := c.Get("companyID")

	// Fetch subscriber before deletion to update splitter ports
	var subscriber models.Subscriber
	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).First(&subscriber).Error; err == nil {
		// Delete the subscriber
		config.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.Subscriber{})

		// Increment available ports on the splitter back
		if subscriber.SplitterPort > 0 {
			config.DB.Model(&models.Splitter{}).Where("id = ?", subscriber.SplitterID).
				Update("available_ports", gorm.Expr("available_ports + 1"))
		}
	} else {
		utils.ErrorResponse(c, 404, "Subscriber not found", err.Error())
		return
	}

	utils.SuccessResponse(c, "Subscriber deleted successfully", nil)
}
