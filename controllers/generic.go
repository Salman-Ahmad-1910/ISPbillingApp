package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"reflect"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GenericCRUD provides standard Create, Read (All), Update, Delete mappings for any TenantModel
type GenericCRUD[T any] struct {
	IsScoped bool
}

func (g GenericCRUD[T]) Create(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var entity T
	if err := c.ShouldBindJSON(&entity); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	if g.IsScoped {
		// If context companyID is empty, try to get it from the entity
		if companyID.String() == "00000000-0000-0000-0000-000000000000" {
			val := reflect.ValueOf(&entity).Elem()
			compIDField := val.FieldByName("CompanyID")
			if compIDField.IsValid() && compIDField.CanSet() {
				if entityCompanyID, ok := compIDField.Interface().(uuid.UUID); ok && entityCompanyID.String() != "00000000-0000-0000-0000-000000000000" {
					companyID = entityCompanyID
				}
			}
		}

		// Use reflection to set CompanyID if it exists
		val := reflect.ValueOf(&entity).Elem()
		compIDField := val.FieldByName("CompanyID")
		if compIDField.IsValid() && compIDField.CanSet() {
			compIDField.Set(reflect.ValueOf(companyID))
		}
	}

	if err := config.DB.Create(&entity).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create record", err.Error())
		return
	}

	utils.CreatedResponse(c, "Record created", entity)
}

func (g GenericCRUD[T]) FindAll(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var entities []T
	db := config.DB
	if g.IsScoped {
		db = db.Scopes(models.TenantScope(companyID))
	}

	// Apply filtering from query parameters
	queryValues := c.Request.URL.Query()
	for key, values := range queryValues {
		if key == "companyId" || key == "page" || key == "limit" {
			continue // Handled elsewhere or skipped
		}
		if len(values) > 0 && values[0] != "" {
			// Basic filtering implementation
			db = db.Where(key+" = ?", values[0])
		}
	}

	if err := db.Find(&entities).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch records", err.Error())
		return
	}

	utils.SuccessResponse(c, "Records retrieved", entities)
}

func (g GenericCRUD[T]) Update(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	var entity T
	if err := c.ShouldBindJSON(&entity); err != nil {
		utils.ErrorResponse(c, 400, "Invalid update data", err.Error())
		return
	}

	if g.IsScoped {
		// If context companyID is empty, try to get it from the entity
		if companyID.String() == "00000000-0000-0000-0000-000000000000" {
			val := reflect.ValueOf(&entity).Elem()
			compIDField := val.FieldByName("CompanyID")
			if compIDField.IsValid() && compIDField.CanSet() {
				if entityCompanyID, ok := compIDField.Interface().(uuid.UUID); ok && entityCompanyID.String() != "00000000-0000-0000-0000-000000000000" {
					companyID = entityCompanyID
				}
			}
		}

		// Always ensure CompanyID is set from context to prevent overwriting with zero UUID
		val := reflect.ValueOf(&entity).Elem()
		compIDField := val.FieldByName("CompanyID")
		if compIDField.IsValid() && compIDField.CanSet() {
			compIDField.Set(reflect.ValueOf(companyID))
		}
	}

	db := config.DB.Model(new(T))
	if g.IsScoped {
		db = db.Scopes(models.TenantScope(companyID))
	}

	// Use Save() to persist all fields including null pointer values.
	// Updates() with Select("*") does not properly persist null pointers (e.g., *uuid.UUID)
	// whereas Save() overwrites every column including NULLs.
	if err := db.Where("id = ?", id).Session(&gorm.Session{FullSaveAssociations: true}).Save(&entity).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update record", err.Error())
		return
	}

	utils.SuccessResponse(c, "Record updated", nil)
}

func (g GenericCRUD[T]) FindOne(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	if g.IsScoped {
		// If context companyID is empty, try to get it from entity first
		if companyID.String() == "00000000-0000-0000-0000-000000000000" {
			var entity T
			if err := config.DB.Where("id = ?", id).First(&entity).Error; err != nil {
				utils.ErrorResponse(c, 404, "Record not found", err.Error())
				return
			}

			val := reflect.ValueOf(&entity).Elem()
			compIDField := val.FieldByName("CompanyID")
			if compIDField.IsValid() && compIDField.CanSet() {
				if entityCompanyID, ok := compIDField.Interface().(uuid.UUID); ok && entityCompanyID.String() != "00000000-0000-0000-0000-000000000000" {
					companyID = entityCompanyID
				}
			}
		}
	}

	var entity T
	db := config.DB
	if g.IsScoped {
		db = db.Scopes(models.TenantScope(companyID))
	}

	if err := db.Where("id = ?", id).First(&entity).Error; err != nil {
		utils.ErrorResponse(c, 404, "Record not found", err.Error())
		return
	}

	utils.SuccessResponse(c, "Record found", entity)
}

func (g GenericCRUD[T]) Delete(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	if g.IsScoped {
		// If context companyID is empty, try to get it from the entity first
		if companyID.String() == "00000000-0000-0000-0000-000000000000" {
			var entity T
			if err := config.DB.Where("id = ?", id).First(&entity).Error; err != nil {
				utils.ErrorResponse(c, 404, "Record not found", err.Error())
				return
			}

			val := reflect.ValueOf(&entity).Elem()
			compIDField := val.FieldByName("CompanyID")
			if compIDField.IsValid() && compIDField.CanSet() {
				if entityCompanyID, ok := compIDField.Interface().(uuid.UUID); ok && entityCompanyID.String() != "00000000-0000-0000-0000-000000000000" {
					companyID = entityCompanyID
				}
			}
		}
	}

	db := config.DB
	if g.IsScoped {
		db = db.Scopes(models.TenantScope(companyID))
	}

	if err := db.Where("id = ?", id).Delete(new(T)).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete record", err.Error())
		return
	}

	utils.SuccessResponse(c, "Record deleted", nil)
}

func RegisterGenericCRUD[T any](router *gin.RouterGroup, path string) {
	RegisterGenericCRUDScoped[T](router, path, true)
}

func RegisterGenericCRUDScoped[T any](router *gin.RouterGroup, path string, isScoped bool) {
	crud := GenericCRUD[T]{IsScoped: isScoped}
	router.POST(path, crud.Create)
	router.GET(path, crud.FindAll)
	router.GET(path+"/:id", crud.FindOne)
	router.PUT(path+"/:id", crud.Update)
	router.DELETE(path+"/:id", crud.Delete)
}
