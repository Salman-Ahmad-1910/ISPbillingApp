package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetPromises lists all promises for the company
func GetPromises(c *gin.Context) {
	companyID, _ := c.Get("companyID")

	var promises []models.Promise
	if err := config.DB.Scopes(models.TenantScope(companyID.(uuid.UUID))).Find(&promises).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch promises", err.Error())
		return
	}

	utils.SuccessResponse(c, "Promises retrieved", promises)
}

// CreatePromise handles creating a new promise
func CreatePromise(c *gin.Context) {
	var promise models.Promise
	if err := c.ShouldBindJSON(&promise); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID, _ := c.Get("companyID")
	promise.CompanyID = companyID.(uuid.UUID)

	if promise.PromiseDate == "" {
		utils.ErrorResponse(c, 400, "Promise date is required", nil)
		return
	}
	if promise.Description == "" {
		utils.ErrorResponse(c, 400, "Description is required", nil)
		return
	}

	if err := config.DB.Create(&promise).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create promise", err.Error())
		return
	}

	utils.CreatedResponse(c, "Promise created successfully", promise)
}

// UpdatePromise handles updating a promise
func UpdatePromise(c *gin.Context) {
	id := c.Param("id")

	var promise models.Promise
	if err := config.DB.Where("id = ?", id).First(&promise).Error; err != nil {
		utils.ErrorResponse(c, 404, "Promise not found", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&promise); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	promise.ID = uuid.MustParse(id)

	if err := config.DB.Save(&promise).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update promise", err.Error())
		return
	}

	utils.SuccessResponse(c, "Promise updated successfully", promise)
}

// DeletePromise handles deleting a promise
func DeletePromise(c *gin.Context) {
	id := c.Param("id")
	companyID, _ := c.Get("companyID")

	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.Promise{}).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete promise", err.Error())
		return
	}

	utils.SuccessResponse(c, "Promise deleted successfully", nil)
}
