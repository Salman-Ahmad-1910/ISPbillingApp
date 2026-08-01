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

// CreateProduct creates a product. If no serial number is provided, the next
// available serial number is taken from the pool and marked as used.
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

	assignedFromPool := ""
	if strings.TrimSpace(product.SerialNumber) == "" {
		var pool models.SerialNumberPool
		err := config.DB.Scopes(models.TenantScope(companyID)).
			Where("status = ?", "available").
			Order("created_at asc").
			First(&pool).Error
		if err == nil {
			product.SerialNumber = pool.SerialNumber
			assignedFromPool = pool.ID.String()
		}
	}

	if err := config.DB.Create(&product).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create record", err.Error())
		return
	}

	if assignedFromPool != "" {
		config.DB.Model(&models.SerialNumberPool{}).
			Scopes(models.TenantScope(companyID)).
			Where("id = ?", assignedFromPool).
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
