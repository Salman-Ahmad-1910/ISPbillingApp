package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserPermissionInput struct {
	PermissionID string `json:"permissionId" binding:"required"`
	WebEnabled   bool   `json:"webEnabled"`
	MobileEnabled bool  `json:"mobileEnabled"`
}

type UserPermissionsUpdateInput struct {
	Permissions []UserPermissionInput `json:"permissions" binding:"required"`
}

func GetUserPermissions(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	userID := c.Param("userId")

	var perms []models.UserPermission
	config.DB.Where("user_id = ? AND company_id = ?", userID, companyID).Find(&perms)

	utils.SuccessResponse(c, "User permissions retrieved", perms)
}

func UpdateUserPermissions(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	userIDStr := c.Param("userId")

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user id", err.Error())
		return
	}

	var req UserPermissionsUpdateInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		utils.ErrorResponse(c, 500, "Failed to start transaction", tx.Error.Error())
		return
	}

	// Delete existing permissions for this user (hard delete to avoid soft-delete rows piling up)
	if err := tx.Unscoped().Where("user_id = ? AND company_id = ?", userID, companyID).Delete(&models.UserPermission{}).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to clear permissions", err.Error())
		return
	}

	// Insert new permissions
	if len(req.Permissions) > 0 {
		newPerms := make([]models.UserPermission, 0, len(req.Permissions))
		for _, p := range req.Permissions {
			newPerms = append(newPerms, models.UserPermission{
				UserID:        userID,
				PermissionID:  p.PermissionID,
				WebEnabled:    p.WebEnabled,
				MobileEnabled: p.MobileEnabled,
				CompanyID:     companyID,
			})
		}
		if err := tx.Create(&newPerms).Error; err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to save permissions", err.Error())
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to save permissions", err.Error())
		return
	}

	utils.SuccessResponse(c, "Permissions updated successfully", nil)
}
