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

type ChartPoint struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

func GetDashboardData(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}
	companyUUID := companyID.(uuid.UUID)

	rangeParam := c.DefaultQuery("range", "monthly")
	var dateFilter string
	switch rangeParam {
	case "daily":
		dateFilter = "AND payment_date = CURRENT_DATE::text"
	case "monthly":
		dateFilter = "AND payment_date >= (DATE_TRUNC('month', CURRENT_DATE))::text"
	case "yearly":
		dateFilter = "AND payment_date >= (DATE_TRUNC('year', CURRENT_DATE))::text"
	case "all":
		dateFilter = ""
	default:
		dateFilter = "AND payment_date >= (DATE_TRUNC('month', CURRENT_DATE))::text"
	}

	// packageType filter: internet | tv_cable | both (or empty = all)
	packageType := c.Query("packageType")
	packageClause := ""
	switch packageType {
	case "internet":
		packageClause = " AND connection_type = 'internet'"
	case "tv_cable":
		packageClause = " AND connection_type = 'tv_cable'"
	default:
		packageClause = ""
	}

	// Billing cycle is monthly (30 days) with a 3-day grace period.
	// Pending = every subscriber who still has a remaining amount to pay,
	// regardless of how long ago their last payment was (matches the
	// Subscriber Collections page). Once that remaining amount lapses into
	// months of non-payment they are additionally reported as overdue.
	const cycleStartExpr = "COALESCE(last_payment_date, recharge_date, created_at::text)::date"
	pendingClause := " AND remaining_amount > 0"
	overdueClause := " AND remaining_amount > 0 AND (CURRENT_DATE - " + cycleStartExpr + ") > 33"

	var activeCount, suspendedCount int64
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'active'`+packageClause, companyUUID).Scan(&activeCount)
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'suspended'`+packageClause, companyUUID).Scan(&suspendedCount)

	// Pending = every subscriber who still owes money and hasn't passed the grace period.
	var pendingCount int64
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL`+pendingClause+packageClause, companyUUID).Scan(&pendingCount)

	// Total remaining amount across all pending subscribers.
	var pendingAmount float64
	config.DB.Raw(`SELECT COALESCE(SUM(CAST(remaining_amount AS numeric)), 0) FROM connections WHERE company_id = ? AND deleted_at IS NULL`+pendingClause+packageClause, companyUUID).Scan(&pendingAmount)

	// Paid = subscribers who have fully cleared their dues (remaining_amount <= 0).
	// Advance subscribers (overpaid) are included here as well as on the Advance card.
	var paidCount int64
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND remaining_amount <= 0`+packageClause, companyUUID).Scan(&paidCount)

	var advanceCount int64
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND payment_status = 'advance'`+packageClause, companyUUID).Scan(&advanceCount)

	var totalCollectionToday float64
	config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND payment_date = CURRENT_DATE::text`, companyUUID).Scan(&totalCollectionToday)

	var totalCollectionMonth float64
	config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND payment_date >= (DATE_TRUNC('month', CURRENT_DATE))::text`, companyUUID).Scan(&totalCollectionMonth)

	var totalCollection float64
	config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL `+dateFilter, companyUUID).Scan(&totalCollection)

	// Overdue = subscribers who still owe money and have exceeded the grace period.
	var overdueCount int64
	config.DB.Raw(`
		SELECT COUNT(*)
		FROM connections
		WHERE company_id = ? AND deleted_at IS NULL
	`+overdueClause+packageClause, companyUUID).Scan(&overdueCount)

	var overdueAmount float64
	config.DB.Raw(`
		SELECT COALESCE(SUM(
			GREATEST(remaining_amount, 0) +
			amount *
			GREATEST(0,
				EXTRACT(YEAR FROM age(CURRENT_DATE, COALESCE(last_payment_date, recharge_date, created_at::text)::date)) * 12 +
				EXTRACT(MONTH FROM age(CURRENT_DATE, COALESCE(last_payment_date, recharge_date, created_at::text)::date))
			)
		), 0)
		FROM connections
		WHERE company_id = ? AND deleted_at IS NULL
	`+overdueClause+packageClause+` AND GREATEST(remaining_amount, 0) + (amount + same_amount) * GREATEST(0,
			EXTRACT(YEAR FROM age(CURRENT_DATE, COALESCE(last_payment_date, recharge_date, created_at::text)::date)) * 12 +
			EXTRACT(MONTH FROM age(CURRENT_DATE, COALESCE(last_payment_date, recharge_date, created_at::text)::date))
		) > 0`, companyUUID).Scan(&overdueAmount)

	var payments []models.Payment
	config.DB.Scopes(models.TenantScope(companyUUID)).Order("payment_date desc").Limit(5).Find(&payments)

	var complaintCount int64
	var recentComplaints []models.Complaint
	config.DB.Model(&models.Complaint{}).Scopes(models.TenantScope(companyUUID)).Where("status NOT IN (?)", []string{"resolved", "closed"}).Count(&complaintCount)
	config.DB.Scopes(models.TenantScope(companyUUID)).Where("status NOT IN (?)", []string{"resolved", "closed"}).Order("created_at desc").Limit(5).Find(&recentComplaints)

	var dailyCollection []ChartPoint
	config.DB.Raw(`SELECT payment_date as label, SUM(CAST(amount AS numeric)) as value FROM payments WHERE company_id = ? AND deleted_at IS NULL AND payment_date >= (CURRENT_DATE - INTERVAL '7 days')::text GROUP BY payment_date ORDER BY payment_date ASC`, companyUUID).Scan(&dailyCollection)

	var subscriberGrowth []ChartPoint
	config.DB.Raw(`
		SELECT gs.day::text as label,
			SUM(COALESCE(de.added, 0) - COALESCE(de.removed, 0)) OVER (ORDER BY gs.day)::float as value
		FROM generate_series((CURRENT_DATE - INTERVAL '6 months')::date, CURRENT_DATE, '1 month'::interval) gs(day)
		LEFT JOIN (
			SELECT date_trunc('month', changed_at)::date as day,
				SUM(CASE WHEN old_status IS NULL OR (old_status IN ('suspended','inactive','deactivated') AND new_status = 'active') THEN 1 ELSE 0 END) as added,
				SUM(CASE WHEN old_status = 'active' AND new_status IN ('suspended','inactive','deactivated') THEN 1 ELSE 0 END) as removed
			FROM connection_status_changes
			WHERE company_id = ?
			GROUP BY date_trunc('month', changed_at)::date
		) de ON gs.day = de.day
		ORDER BY gs.day
	`, companyUUID).Scan(&subscriberGrowth)

	utils.SuccessResponse(c, "Dashboard data retrieved", gin.H{
		"subscribersStats": gin.H{
			"active":    activeCount,
			"suspended": suspendedCount,
			"pending":   pendingCount,
			"advance":   advanceCount,
			"paid":      paidCount,
		},
		"totalCollectionToday": totalCollectionToday,
		"totalCollectionMonth": totalCollectionMonth,
		"totalCollection":      totalCollection,
		"pendingAmount":        pendingAmount,
		"range":                rangeParam,
		"overdueCount":         overdueCount,
		"overdueAmount":        overdueAmount,
		"payments":             payments,
		"complaintsCount":      complaintCount,
		"complaints":           recentComplaints,
		"dailyCollection":      dailyCollection,
		"subscriberGrowth":     subscriberGrowth,
	})
}

func GetCollectionChart(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}
	companyUUID := companyID.(uuid.UUID)

	period := c.DefaultQuery("period", "daily")
	monthParam := c.DefaultQuery("month", "")
	var results []ChartPoint
	var monthStart, monthEnd time.Time

	// Reconstruct the cumulative collection total at each time bucket
	// by summing payments up to each bucket boundary.
	switch period {
	case "daily":
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					date_trunc('hour', NOW() - INTERVAL '24 hours'),
					date_trunc('hour', NOW()),
					'1 hour'::interval
				) AS bucket
			),
			per_bucket AS (
				SELECT date_trunc('hour', created_at) AS bucket,
					SUM(CAST(amount AS numeric))::float AS total
				FROM payments
				WHERE company_id = ? AND deleted_at IS NULL
				GROUP BY date_trunc('hour', created_at)
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM-DD HH24:MI:SS') AS label,
				COALESCE(SUM(pb.total) OVER (ORDER BY b.bucket), 0) AS value
			FROM buckets b
			LEFT JOIN per_bucket pb ON pb.bucket = b.bucket
			ORDER BY b.bucket
		`, companyUUID).Scan(&results)

	case "weekly":
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					(CURRENT_DATE - INTERVAL '7 days')::date,
					CURRENT_DATE,
					'1 day'::interval
				) AS bucket
			),
			per_bucket AS (
				SELECT date_trunc('day', created_at) AS bucket,
					SUM(CAST(amount AS numeric))::float AS total
				FROM payments
				WHERE company_id = ? AND deleted_at IS NULL
				GROUP BY date_trunc('day', created_at)
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM-DD') AS label,
				COALESCE(SUM(pb.total) OVER (ORDER BY b.bucket), 0) AS value
			FROM buckets b
			LEFT JOIN per_bucket pb ON pb.bucket = b.bucket
			ORDER BY b.bucket
		`, companyUUID).Scan(&results)

	case "monthly":
		if monthParam != "" {
			monthStart, _ = time.Parse("2006-01", monthParam)
			monthEnd = monthStart.AddDate(0, 1, 0)
		} else {
			now := time.Now()
			monthStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			monthEnd = monthStart.AddDate(0, 1, 0)
		}
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					?::date,
					?::date - INTERVAL '1 day',
					'1 day'::interval
				) AS bucket
			),
			per_bucket AS (
				SELECT date_trunc('day', created_at) AS bucket,
					SUM(CAST(amount AS numeric))::float AS total
				FROM payments
				WHERE company_id = ? AND deleted_at IS NULL
				  AND created_at < ?::date + INTERVAL '1 day'
				GROUP BY date_trunc('day', created_at)
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM-DD') AS label,
				COALESCE(SUM(pb.total) OVER (ORDER BY b.bucket), 0) AS value
			FROM buckets b
			LEFT JOIN per_bucket pb ON pb.bucket = b.bucket
			ORDER BY b.bucket
		`, monthStart.Format("2006-01-02"), monthEnd.Format("2006-01-02"), companyUUID, monthEnd.Format("2006-01-02")).Scan(&results)

	case "yearly":
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					(CURRENT_DATE - INTERVAL '2 years')::date,
					CURRENT_DATE,
					'1 month'::interval
				) AS bucket
			),
			per_bucket AS (
				SELECT date_trunc('month', created_at) AS bucket,
					SUM(CAST(amount AS numeric))::float AS total
				FROM payments
				WHERE company_id = ? AND deleted_at IS NULL
				GROUP BY date_trunc('month', created_at)
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM') AS label,
				COALESCE(SUM(pb.total) OVER (ORDER BY b.bucket), 0) AS value
			FROM buckets b
			LEFT JOIN per_bucket pb ON pb.bucket = b.bucket
			ORDER BY b.bucket
		`, companyUUID).Scan(&results)

	default:
		period = "daily"
		results = []ChartPoint{}
	}

	// Fallback: if no payments exist, render a flat line at 0.
	if len(results) == 0 || results[len(results)-1].Value == 0 {
		var liveTotal float64
		config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL`, companyUUID).Scan(&liveTotal)
		results = []ChartPoint{}
		now := time.Now()
		switch period {
		case "daily":
			for i := 0; i < 24; i++ {
				h := now.Add(-time.Duration(23-i) * time.Hour).Truncate(time.Hour)
				results = append(results, ChartPoint{Label: h.Format("2006-01-02 15:04:05"), Value: liveTotal})
			}
		case "weekly":
			for i := 0; i < 8; i++ {
				d := now.AddDate(0, 0, -7+i)
				results = append(results, ChartPoint{Label: d.Format("2006-01-02"), Value: liveTotal})
			}
		case "monthly":
			for d := monthStart; d.Before(monthEnd); d = d.AddDate(0, 0, 1) {
				results = append(results, ChartPoint{Label: d.Format("2006-01-02"), Value: liveTotal})
			}
		case "yearly":
			for i := 0; i < 25; i++ {
				m := now.AddDate(0, -24+i, 0)
				results = append(results, ChartPoint{Label: m.Format("2006-01"), Value: liveTotal})
			}
		}
	}

	// Compute the sum of payments made within the selected period window.
	var periodTotal float64
	switch period {
	case "daily":
		config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND created_at >= date_trunc('hour', NOW() - INTERVAL '24 hours')`, companyUUID).Scan(&periodTotal)
	case "weekly":
		config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND created_at >= (CURRENT_DATE - INTERVAL '7 days')::date`, companyUUID).Scan(&periodTotal)
	case "monthly":
		config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND created_at >= ?::date AND created_at < ?::date + INTERVAL '1 day'`, companyUUID, monthStart.Format("2006-01-02"), monthEnd.Format("2006-01-02")).Scan(&periodTotal)
	case "yearly":
		config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND created_at >= (CURRENT_DATE - INTERVAL '2 years')::date`, companyUUID).Scan(&periodTotal)
	}

	utils.SuccessResponse(c, fmt.Sprintf("Collection chart data (%s)", period), gin.H{
		"period":      period,
		"data":        results,
		"periodTotal": periodTotal,
	})
}

func GetSubscriberGrowthChart(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}
	companyUUID := companyID.(uuid.UUID)

	period := c.DefaultQuery("period", "daily")
	monthParam := c.DefaultQuery("month", "")
	var results []ChartPoint
	var monthStart, monthEnd time.Time

	switch period {
	case "daily":
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					date_trunc('hour', NOW() - INTERVAL '24 hours'),
					date_trunc('hour', NOW()),
					'1 hour'::interval
				) AS bucket
			),
			changes AS (
				SELECT date_trunc('hour', changed_at) AS bucket,
					SUM(
						CASE
							WHEN old_status IS NULL AND new_status = 'active' THEN 1
							WHEN old_status IS NULL THEN 0
							WHEN new_status = 'active' THEN 1
							WHEN old_status = 'active' THEN -1
							ELSE 0
						END
					)::float AS net
				FROM connection_status_changes
				WHERE company_id = ?
				GROUP BY date_trunc('hour', changed_at)
			),
			running AS (
				SELECT bucket, SUM(net) OVER (ORDER BY bucket) AS total
				FROM changes
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM-DD HH24:MI:SS') AS label,
				COALESCE(r.total, 0) AS value
			FROM buckets b
			LEFT JOIN running r ON r.bucket = b.bucket
			ORDER BY b.bucket
		`, companyUUID).Scan(&results)

	case "weekly":
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					(CURRENT_DATE - INTERVAL '7 days')::date,
					CURRENT_DATE,
					'1 day'::interval
				) AS bucket
			),
			changes AS (
				SELECT date_trunc('day', changed_at) AS bucket,
					SUM(
						CASE
							WHEN old_status IS NULL AND new_status = 'active' THEN 1
							WHEN old_status IS NULL THEN 0
							WHEN new_status = 'active' THEN 1
							WHEN old_status = 'active' THEN -1
							ELSE 0
						END
					)::float AS net
				FROM connection_status_changes
				WHERE company_id = ?
				GROUP BY date_trunc('day', changed_at)
			),
			running AS (
				SELECT bucket, SUM(net) OVER (ORDER BY bucket) AS total
				FROM changes
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM-DD') AS label,
				COALESCE(r.total, 0) AS value
			FROM buckets b
			LEFT JOIN running r ON r.bucket = b.bucket
			ORDER BY b.bucket
		`, companyUUID).Scan(&results)

	case "monthly":
		if monthParam != "" {
			monthStart, _ = time.Parse("2006-01", monthParam)
			monthEnd = monthStart.AddDate(0, 1, 0)
		} else {
			now := time.Now()
			monthStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			monthEnd = monthStart.AddDate(0, 1, 0)
		}
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					?::date,
					?::date - INTERVAL '1 day',
					'1 day'::interval
				) AS bucket
			),
			changes AS (
				SELECT date_trunc('day', changed_at) AS bucket,
					SUM(
						CASE
							WHEN old_status IS NULL AND new_status = 'active' THEN 1
							WHEN old_status IS NULL THEN 0
							WHEN new_status = 'active' THEN 1
							WHEN old_status = 'active' THEN -1
							ELSE 0
						END
					)::float AS net
				FROM connection_status_changes
				WHERE company_id = ? AND changed_at < ?::date + INTERVAL '1 day'
				GROUP BY date_trunc('day', changed_at)
			),
			running AS (
				SELECT bucket, SUM(net) OVER (ORDER BY bucket) AS total
				FROM changes
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM-DD') AS label,
				COALESCE(r.total, 0) AS value
			FROM buckets b
			LEFT JOIN running r ON r.bucket = b.bucket
			ORDER BY b.bucket
		`, monthStart.Format("2006-01-02"), monthEnd.Format("2006-01-02"), companyUUID, monthEnd.Format("2006-01-02")).Scan(&results)

	case "yearly":
		config.DB.Raw(`
			WITH buckets AS (
				SELECT generate_series(
					(CURRENT_DATE - INTERVAL '2 years')::date,
					CURRENT_DATE,
					'1 month'::interval
				) AS bucket
			),
			changes AS (
				SELECT date_trunc('month', changed_at) AS bucket,
					SUM(
						CASE
							WHEN old_status IS NULL AND new_status = 'active' THEN 1
							WHEN old_status IS NULL THEN 0
							WHEN new_status = 'active' THEN 1
							WHEN old_status = 'active' THEN -1
							ELSE 0
						END
					)::float AS net
				FROM connection_status_changes
				WHERE company_id = ?
				GROUP BY date_trunc('month', changed_at)
			),
			running AS (
				SELECT bucket, SUM(net) OVER (ORDER BY bucket) AS total
				FROM changes
			)
			SELECT TO_CHAR(b.bucket, 'YYYY-MM') AS label,
				COALESCE(r.total, 0) AS value
			FROM buckets b
			LEFT JOIN running r ON r.bucket = b.bucket
			ORDER BY b.bucket
		`, companyUUID).Scan(&results)

	default:
		period = "daily"
		results = []ChartPoint{}
	}

	// Fallback: if connection_status_changes has no rows (empty table),
	// render a flat line at the current active count.
	if len(results) == 0 || results[len(results)-1].Value == 0 {
		var currentCount int64
		config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'active'`, companyUUID).Scan(&currentCount)
		results = []ChartPoint{}
		now := time.Now()
		switch period {
		case "daily":
			for i := 0; i < 24; i++ {
				h := now.Add(-time.Duration(23-i) * time.Hour).Truncate(time.Hour)
				results = append(results, ChartPoint{Label: h.Format("2006-01-02 15:04:05"), Value: float64(currentCount)})
			}
		case "weekly":
			for i := 0; i < 8; i++ {
				d := now.AddDate(0, 0, -7+i)
				results = append(results, ChartPoint{Label: d.Format("2006-01-02"), Value: float64(currentCount)})
			}
		case "monthly":
			for d := monthStart; d.Before(monthEnd); d = d.AddDate(0, 0, 1) {
				results = append(results, ChartPoint{Label: d.Format("2006-01-02"), Value: float64(currentCount)})
			}
		case "yearly":
			for i := 0; i < 12; i++ {
				m := now.AddDate(0, -11+i, 0)
				results = append(results, ChartPoint{Label: m.Format("2006-01"), Value: float64(currentCount)})
			}
		}
	}

	// Overwrite the last point with the live count so the current value is
	// always accurate, even when the trigger hasn't caught up yet.
	var currentCount int64
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'active'`, companyUUID).Scan(&currentCount)
	if len(results) > 0 {
		results[len(results)-1].Value = float64(currentCount)
	}

	utils.SuccessResponse(c, fmt.Sprintf("Subscriber growth chart data (%s)", period), gin.H{
		"period": period,
		"data":   results,
	})
}
