package controllers

import (
	"strconv"
	"strings"
	"time"

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
	// Pending = any subscriber who still owes money for the current billing
	// cycle. The outstanding is derived live from the package fee minus the
	// payments received this month, so BOTH fully-unpaid (never paid) and
	// half-paid subscribers are always included (even if the stored
	// remaining_amount is stale/zero).
	outstandingExpr := pendingOutstandingSQL(time.Now().Format("2006-01") + "-01")
	db = db.Where("company_id = ? AND deleted_at IS NULL", companyUUID)
	db = db.Where(outstandingExpr + " > 0")

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

// packageFee computes a connection's monthly package fee based on its type,
// matching the frontend getPackagePrice() and billing.go recompute logic.
func packageFee(conn models.Connection) float64 {
	switch conn.ConnectionType {
	case "tv_cable":
		return conn.Amount
	case "internet":
		return conn.SameAmount
	default: // both
		return conn.Amount + conn.SameAmount
	}
}

// connectionOutstanding returns the live outstanding balance for a connection
// for the current billing cycle: package fee minus the payments received so
// far this month, floored at zero. It does not rely on the stored
// remaining_amount, which can be stale at month boundaries.
func connectionOutstanding(conn models.Connection, monthStart string) float64 {
	fee := packageFee(conn)
	var paid float64
	config.DB.Raw(
		`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE subscriber_id = ? AND payment_date >= ?`,
		conn.ID, monthStart,
	).Scan(&paid)
	outstanding := fee - paid
	if outstanding < 0 {
		outstanding = 0
	}
	return outstanding
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
	outstandingExpr := pendingOutstandingSQL(time.Now().Format("2006-01") + "-01")
	var sumRow struct{ Total float64 }
	applyPendingFilters(config.DB.Model(&models.Connection{}), c, companyUUID).
		Select("COALESCE(SUM(" + outstandingExpr + "), 0) as total").
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

	// Reflect the true outstanding (package fee - payments this month) on each
	// returned row so the frontend shows the correct remaining amount, even for
	// fully-unpaid subscribers whose stored remaining_amount may be stale/zero.
	monthStart := time.Now().Format("2006-01") + "-01"
	for i := range subscribers {
		subscribers[i].RemainingAmount = connectionOutstanding(subscribers[i], monthStart)
	}

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
