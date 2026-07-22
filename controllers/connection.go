package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func decrementSplitterPorts(tx *gorm.DB, splitterID string) error {
	var splitter models.Splitter
	if err := tx.First(&splitter, "id = ?", splitterID).Error; err != nil {
		return fmt.Errorf("splitter not found")
	}
	if splitter.AvailablePorts <= 0 {
		return fmt.Errorf("no available ports on splitter %s", splitter.Name)
	}
	return tx.Model(&models.Splitter{}).Where("id = ?", splitterID).
		UpdateColumn("available_ports", gorm.Expr("GREATEST(available_ports - 1, 0)")).Error
}

func incrementSplitterPorts(tx *gorm.DB, splitterID string) error {
	var splitter models.Splitter
	if err := tx.First(&splitter, "id = ?", splitterID).Error; err != nil {
		return nil
	}
	return tx.Model(&models.Splitter{}).Where("id = ?", splitterID).
		UpdateColumn("available_ports", gorm.Expr("LEAST(available_ports + 1, total_ports)")).Error
}

func RegisterConnectionRoutes(admin *gin.RouterGroup) {
	admin.GET("/connections", findConnections)
	admin.POST("/connections", createConnection)
	admin.PUT("/connections/:id", updateConnection)
	admin.DELETE("/connections/:id", deleteConnection)
}

func findConnections(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var connections []models.Connection
	db := config.DB.Scopes(models.TenantScope(companyID))

	queryValues := c.Request.URL.Query()
	for key, values := range queryValues {
		if key == "companyId" || key == "page" || key == "limit" {
			continue
		}
		if len(values) > 0 && values[0] != "" {
			db = db.Where(key+" = ?", values[0])
		}
	}

	if err := db.Find(&connections).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch connections", err.Error())
		return
	}

	utils.SuccessResponse(c, "Connections retrieved", connections)
}

type connectionInput struct {
	InternetID          string  `json:"internetId" binding:"required"`
	Name                string  `json:"name" binding:"required"`
	Address             string  `json:"address"`
	Cell                string  `json:"cell"`
	Mobile              string  `json:"mobile"`
	InstallationAmount  float64 `json:"installationAmount"`
	OtherAmount         float64 `json:"otherAmount"`
	InstallationDate    string  `json:"installationDate"`
	RechargeDate        string  `json:"rechargeDate"`
	ConnectionProvider  string  `json:"connectionProvider"`
	ConnectionType      string  `json:"connectionType"`
	BoxNumber           string  `json:"boxNumber"`
	PackageCable        string  `json:"packageCable"`
	Discount            string  `json:"discount"`
	Amount              float64 `json:"amount"`
	PackageInternet     string  `json:"packageInternet"`
	CreateBalance       bool    `json:"createBalance"`
	BalanceDays         int     `json:"balanceDays"`
	SameDiscount        string  `json:"sameDiscount"`
	SameAmount          float64 `json:"sameAmount"`
	Status              string  `json:"status"`
	SublocalityID       string  `json:"sublocalityId"`
	SplitterID          string  `json:"splitterId"`
	SplitterPort        int     `json:"splitterPort"`
}

func createConnection(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var input connectionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		utils.ErrorResponse(c, 500, "Failed to start transaction", tx.Error.Error())
		return
	}

	if input.SplitterID != "" {
		if _, err := uuid.Parse(input.SplitterID); err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 400, "Invalid splitter ID", err.Error())
			return
		}
		if err := decrementSplitterPorts(tx, input.SplitterID); err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 400, "Splitter port error", err.Error())
			return
		}
	}

	conn := models.Connection{
		InternetID:          input.InternetID,
		Name:                input.Name,
		Address:             input.Address,
		Cell:                input.Cell,
		Mobile:              input.Mobile,
		InstallationAmount:  input.InstallationAmount,
		OtherAmount:         input.OtherAmount,
		InstallationDate:    input.InstallationDate,
		RechargeDate:        input.RechargeDate,
		ConnectionProvider:  input.ConnectionProvider,
		ConnectionType:      input.ConnectionType,
		BoxNumber:           input.BoxNumber,
		PackageCable:        input.PackageCable,
		Discount:            input.Discount,
		Amount:              input.Amount,
		PackageInternet:     input.PackageInternet,
		CreateBalance:       input.CreateBalance,
		BalanceDays:         input.BalanceDays,
		SameDiscount:        input.SameDiscount,
		SameAmount:          input.SameAmount,
		Status:              input.Status,
		SublocalityID:       input.SublocalityID,
		SplitterID:          input.SplitterID,
		SplitterPort:        input.SplitterPort,
	}
	conn.CompanyID = companyID

	if err := tx.Create(&conn).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create connection", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit", err.Error())
		return
	}

	utils.CreatedResponse(c, "Connection created", conn)
}

func updateConnection(c *gin.Context) {
	id := c.Param("id")

	var input connectionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		utils.ErrorResponse(c, 500, "Failed to start transaction", tx.Error.Error())
		return
	}

	var old models.Connection
	if err := tx.First(&old, "id = ?", id).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 404, "Connection not found", nil)
		return
	}

	oldSplitterID := old.SplitterID
	newSplitterID := input.SplitterID

	if oldSplitterID != newSplitterID {
		if oldSplitterID != "" {
			if err := incrementSplitterPorts(tx, oldSplitterID); err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 500, "Failed to restore old splitter ports", err.Error())
				return
			}
		}
		if newSplitterID != "" {
			if _, err := uuid.Parse(newSplitterID); err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 400, "Invalid splitter ID", err.Error())
				return
			}
			if err := decrementSplitterPorts(tx, newSplitterID); err != nil {
				tx.Rollback()
				utils.ErrorResponse(c, 400, "Splitter port error", err.Error())
				return
			}
		}
	}

	conn := models.Connection{
		InternetID:          input.InternetID,
		Name:                input.Name,
		Address:             input.Address,
		Cell:                input.Cell,
		Mobile:              input.Mobile,
		InstallationAmount:  input.InstallationAmount,
		OtherAmount:         input.OtherAmount,
		InstallationDate:    input.InstallationDate,
		RechargeDate:        input.RechargeDate,
		ConnectionProvider:  input.ConnectionProvider,
		ConnectionType:      input.ConnectionType,
		BoxNumber:           input.BoxNumber,
		PackageCable:        input.PackageCable,
		Discount:            input.Discount,
		Amount:              input.Amount,
		PackageInternet:     input.PackageInternet,
		CreateBalance:       input.CreateBalance,
		BalanceDays:         input.BalanceDays,
		SameDiscount:        input.SameDiscount,
		SameAmount:          input.SameAmount,
		Status:              input.Status,
		SublocalityID:       input.SublocalityID,
		SplitterID:          newSplitterID,
		SplitterPort:        input.SplitterPort,
	}
	conn.ID = old.ID
	conn.CompanyID = old.CompanyID
	conn.CreatedAt = old.CreatedAt

	if err := tx.Save(&conn).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to update connection", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit", err.Error())
		return
	}

	utils.SuccessResponse(c, "Connection updated", conn)
}

func deleteConnection(c *gin.Context) {
	id := c.Param("id")

	tx := config.DB.Begin()
	if tx.Error != nil {
		utils.ErrorResponse(c, 500, "Failed to start transaction", tx.Error.Error())
		return
	}

	var conn models.Connection
	if err := tx.First(&conn, "id = ?", id).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 404, "Connection not found", nil)
		return
	}

	if conn.SplitterID != "" {
		if err := incrementSplitterPorts(tx, conn.SplitterID); err != nil {
			tx.Rollback()
			utils.ErrorResponse(c, 500, "Failed to restore splitter ports", err.Error())
			return
		}
	}

	if err := tx.Delete(&conn).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to delete connection", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit", err.Error())
		return
	}

	utils.SuccessResponse(c, "Connection deleted", nil)
}
