package controllers

import (
	"strconv"
	"strings"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// applyPendingFilters builds the WHERE conditions shared by the count,
// sum, and paginated list queries below. Always call it on a fresh
// *gorm.DB (config.DB.Model(&models.Connection{})) — reusing a db
// instance across Count/Scan/Find calls in GORM can leak state.
func applyPendingFilters(db *gorm.DB, c *gin.Context, companyUUID uuid.UUID) *gorm.DB {
	db = db.Where("company_id = ? AND deleted_at IS NULL AND remaining_amount > 0", companyUUID)

	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		db = db.Where(
			"LOWER(name) LIKE ? OR LOWER(internet_id) LIKE ? OR LOWER(cell) LIKE ? OR LOWER(mobile) LIKE ? OR LOWER(id::text) LIKE ?",
			like, like, like, like, like,
		)
	}
	if v := c.Query("sublocality"); v != "" && v != "all" {
		db = db.Where("sublocality_id = ?", v)
	}
	if v := c.Query("status"); v != "" && v != "all" {
		db = db.Where("status = ?", v)
	}
	if v := c.Query("type"); v != "" && v != "all" {
		typeMap := map[string]string{
			"both": "both", "tv_cable": "tv_cable", "internet": "internet",
			"cable_all": "tv_cable", "internet_all": "internet",
		}
		mapped, ok := typeMap[v]
		if !ok {
			mapped = v
		}
		db = db.Where("connection_type = ?", mapped)
	}
	if v := c.Query("box"); v != "" && v != "all" {
		db = db.Where("box_number = ?", v)
	}
	if v := c.Query("package"); v != "" && v != "all" {
		db = db.Where("package_internet = ? OR package_cable = ?", v, v)
	}
	if v := c.Query("discount"); v != "" && v != "all" {
		if v == "no_discount" {
			db = db.Where("discount IS NULL OR discount = ''")
		} else {
			db = db.Where("discount = ?", v)
		}
	}
	if v := c.Query("provider"); v != "" && v != "all" {
		db = db.Where("connection_provider = ?", v)
	}

	const cycleStartExpr = "COALESCE(last_payment_date, recharge_date, created_at::text)::date"
	if v := c.Query("dateFrom"); v != "" {
		db = db.Where(cycleStartExpr+" >= ?", v)
	}
	if v := c.Query("dateTo"); v != "" {
		db = db.Where(cycleStartExpr+" <= ?", v)
	}

	return db
}

func GetPendingSubscribers(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}
	companyUUID := companyID.(uuid.UUID)

	// --- total count (unfiltered by pagination) ---
	var totalCount int64
	applyPendingFilters(config.DB.Model(&models.Connection{}), c, companyUUID).
		Count(&totalCount)

	// --- total pending amount (unfiltered by pagination) ---
	var sumRow struct{ Total float64 }
	applyPendingFilters(config.DB.Model(&models.Connection{}), c, companyUUID).
		Select("COALESCE(SUM(remaining_amount), 0) as total").
		Scan(&sumRow)

	// --- pending count broken down by connection type ---
	var tvCableCount, internetCount, bothCount int64
	applyPendingFilters(config.DB.Model(&models.Connection{}), c, companyUUID).
		Where("connection_type = ?", "tv_cable").Count(&tvCableCount)
	applyPendingFilters(config.DB.Model(&models.Connection{}), c, companyUUID).
		Where("connection_type = ?", "internet").Count(&internetCount)
	applyPendingFilters(config.DB.Model(&models.Connection{}), c, companyUUID).
		Where("connection_type = ?", "both").Count(&bothCount)

	// --- paginated list ---
	query := applyPendingFilters(config.DB.Model(&models.Connection{}), c, companyUUID)

	switch c.Query("sortBy") {
	case "name":
		query = query.Order("name ASC")
	case "internetId":
		query = query.Order("internet_id ASC")
	case "installationDate":
		query = query.Order("installation_date ASC")
	default:
		query = query.Order("created_at DESC")
	}

	pageSizeParam := c.DefaultQuery("pageSize", "10")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	if pageSizeParam != "all" {
		pageSize, err := strconv.Atoi(pageSizeParam)
		if err != nil || pageSize < 1 {
			pageSize = 10
		}
		query = query.Limit(pageSize).Offset((page - 1) * pageSize)
	}

	var subscribers []models.Connection
	query.Find(&subscribers)

	utils.SuccessResponse(c, "Pending subscribers retrieved", gin.H{
		"subscribers":        subscribers,
		"totalCount":         totalCount,
		"totalPendingAmount": sumRow.Total,
		"tvCableCount":       tvCableCount,
		"internetCount":      internetCount,
		"bothCount":          bothCount,
		"page":               page,
		"pageSize":           pageSizeParam,
	})
}
