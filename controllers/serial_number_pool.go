package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SerialNumberPoolCRUD struct {
	GenericCRUD[models.SerialNumberPool]
}

// Create adds a large list of serial numbers to the pool. The numbers can be
// provided as a single string separated by spaces, dashes (-), commas, or as an
// array of strings. Duplicates are ignored.
func (g SerialNumberPoolCRUD) Create(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var req struct {
		Numbers []string `json:"numbers"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	var serials []string
	seen := map[string]bool{}
	for _, raw := range req.Numbers {
		for _, f := range strings.FieldsFunc(raw, func(r rune) bool {
			return r == '-' || r == '_' || r == ',' || unicode.IsSpace(r)
		}) {
			f = strings.TrimSpace(f)
			if f == "" || seen[f] {
				continue
			}
			seen[f] = true
			serials = append(serials, f)
		}
	}

	if len(serials) == 0 {
		utils.ErrorResponse(c, 400, "No serial numbers provided", "")
		return
	}

	var created []models.SerialNumberPool
	for _, sn := range serials {
		var count int64
		config.DB.Model(&models.SerialNumberPool{}).
			Scopes(models.TenantScope(companyID)).
			Where("serial_number = ?", sn).
			Count(&count)
		if count > 0 {
			continue
		}

		pool := models.SerialNumberPool{
			TenantModel:  models.TenantModel{CompanyID: companyID},
			SerialNumber: sn,
			Status:       "available",
		}
		if err := config.DB.Create(&pool).Error; err != nil {
			utils.ErrorResponse(c, 500, "Failed to add serial numbers", err.Error())
			return
		}
		created = append(created, pool)
	}

	utils.CreatedResponse(c, "Serial numbers added", created)
}

// GetNextSerialNumber returns the next available serial number from the pool
// without marking it as used. The product form uses this to pre-fill the
// SN/MAC field; the number is marked used when the product is created.
func (g SerialNumberPoolCRUD) GetNextSerialNumber(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var pool models.SerialNumberPool
	err := config.DB.Scopes(models.TenantScope(companyID)).
		Where("status = ?", "available").
		Order("created_at asc").
		First(&pool).Error
	if err != nil {
		utils.SuccessResponse(c, "No serial numbers available", gin.H{"serialNumber": nil})
		return
	}

	utils.SuccessResponse(c, "Next serial number", gin.H{"serialNumber": pool.SerialNumber})
}

// CreateProduct creates a product. If no serial number is provided, the next
// available serial number is taken from the pool and marked as used. If the
// serial number was filled in by the frontend (from the pool), the matching
// pool entry is also marked as used so it is not reused.
func CreateProduct(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	if companyID.String() == "00000000-0000-0000-0000-000000000000" &&
		product.CompanyID.String() != "00000000-0000-0000-0000-000000000000" {
		companyID = product.CompanyID
	}
	product.CompanyID = companyID

	// Serial number is mandatory by default. It may only be omitted when the
	// "no serial number" checkbox is checked (NoSerialNumber == true).
	if strings.TrimSpace(product.SerialNumber) == "" && !product.NoSerialNumber {
		utils.ErrorResponse(c, 400, "Serial number is required", "provide a serial number or check 'no serial number' to add the product without one")
		return
	}

	if err := config.DB.Create(&product).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create record", err.Error())
		return
	}

	// If the frontend pre-filled a serial number taken from the pool, mark that
	// pool entry as used so it is not reused. Products may be created with no
	// serial number (when the checkbox is checked), in which case the
	// serial_number cell is left empty.
	if strings.TrimSpace(product.SerialNumber) != "" {
		config.DB.Model(&models.SerialNumberPool{}).
			Scopes(models.TenantScope(companyID)).
			Where("serial_number = ? AND status = ?", strings.TrimSpace(product.SerialNumber), "available").
			Updates(map[string]interface{}{
				"status":     "used",
				"product_id": product.ID.String(),
			})
	}

	utils.CreatedResponse(c, "Record created", product)
}

// RegisterProductRoutes wires up product CRUD with a custom Create handler that
// auto-assigns serial numbers from the pool.
func RegisterProductRoutes(router *gin.RouterGroup) {
	crud := GenericCRUD[models.Product]{IsScoped: true}
	router.POST("", CreateProduct)
	router.GET("", crud.FindAll)
	router.GET("/:id", crud.FindOne)
	router.PUT("/:id", crud.Update)
	router.DELETE("/:id", crud.Delete)
}
