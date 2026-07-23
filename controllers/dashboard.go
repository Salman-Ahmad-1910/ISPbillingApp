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
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}

	var activeCount, suspendedCount int64
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'active'`, companyID).Scan(&activeCount)
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'suspended'`, companyID).Scan(&suspendedCount)

	var totalCollectionToday float64
	config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND payment_date = CURRENT_DATE::text`, companyID).Scan(&totalCollectionToday)

	var totalCollectionMonth float64
	config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL AND payment_date >= (DATE_TRUNC('month', CURRENT_DATE))::text`, companyID).Scan(&totalCollectionMonth)

	var overdueCount int64
	config.DB.Raw(`
		SELECT COUNT(*)
		FROM connections
		WHERE company_id = ? AND deleted_at IS NULL
		AND COALESCE(last_payment_date, recharge_date, created_at::text) < (CURRENT_DATE - INTERVAL '30 days')::text
	`, companyID).Scan(&overdueCount)

	var overdueAmount float64
	config.DB.Raw(`
		SELECT COALESCE(SUM(amount), 0)
		FROM connections
		WHERE company_id = ? AND deleted_at IS NULL
		AND COALESCE(last_payment_date, recharge_date, created_at::text) < (CURRENT_DATE - INTERVAL '30 days')::text
	`, companyID).Scan(&overdueAmount)

	var payments []models.Payment
	config.DB.Scopes(models.TenantScope(companyID)).Order("payment_date desc").Limit(5).Find(&payments)

	var complaintCount int64
	var recentComplaints []models.Complaint
	config.DB.Model(&models.Complaint{}).Scopes(models.TenantScope(companyID)).Where("status NOT IN (?)", []string{"resolved", "closed"}).Count(&complaintCount)
	config.DB.Scopes(models.TenantScope(companyID)).Where("status NOT IN (?)", []string{"resolved", "closed"}).Order("created_at desc").Limit(5).Find(&recentComplaints)

	var dailyCollection []ChartPoint
	config.DB.Raw(`SELECT payment_date as label, SUM(CAST(amount AS numeric)) as value FROM payments WHERE company_id = ? AND deleted_at IS NULL AND payment_date >= (CURRENT_DATE - INTERVAL '7 days')::text GROUP BY payment_date ORDER BY payment_date ASC`, companyID).Scan(&dailyCollection)

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
	`, companyID).Scan(&subscriberGrowth)

	utils.SuccessResponse(c, "Dashboard data retrieved", gin.H{
		"subscribersStats": gin.H{
			"active":    activeCount,
			"suspended": suspendedCount,
		},
		"totalCollectionToday": totalCollectionToday,
		"totalCollectionMonth": totalCollectionMonth,
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
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}

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
		`, companyID).Scan(&results)

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
		`, companyID).Scan(&results)

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
		`, monthStart.Format("2006-01-02"), monthEnd.Format("2006-01-02"), companyID, monthEnd.Format("2006-01-02")).Scan(&results)

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
		`, companyID).Scan(&results)

	default:
		period = "daily"
		results = []ChartPoint{}
	}

	// Fallback: if no payments exist, render a flat line at 0.
	if len(results) == 0 || results[len(results)-1].Value == 0 {
		var liveTotal float64
		config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL`, companyID).Scan(&liveTotal)
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

	// Overwrite the last point with the live total so the current value is
	// always accurate, even when the latest payment just arrived.
	var liveTotal float64
	config.DB.Raw(`SELECT COALESCE(SUM(CAST(amount AS numeric)), 0) FROM payments WHERE company_id = ? AND deleted_at IS NULL`, companyID).Scan(&liveTotal)
	if len(results) > 0 {
		results[len(results)-1].Value = liveTotal
	}

	utils.SuccessResponse(c, fmt.Sprintf("Collection chart data (%s)", period), gin.H{
		"period": period,
		"data":   results,
	})
}

func GetSubscriberGrowthChart(c *gin.Context) {
	companyIDStr := c.Query("companyId")
	companyID, err := uuid.Parse(companyIDStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid company ID", nil)
		return
	}

	period := c.DefaultQuery("period", "daily")
	monthParam := c.DefaultQuery("month", "")
	var results []ChartPoint
	var monthStart, monthEnd time.Time

	// Reconstruct the running active-subscriber count at each time bucket
	// by accumulating every status transition logged in connection_status_changes.
	//
	// Net-change logic per row:
	//   created active          → +1
	//   created non-active       →  0
	//   reactivated              → +1
	//   deactivated (active→*)   → -1
	//   non-active → non-active  →  0
	//
	// A PostgreSQL trigger (trg_connection_status_change) on the connections
	// table guarantees that every INSERT and every status UPDATE writes a row
	// to connection_status_changes, so the ledger is always complete.
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
		`, companyID).Scan(&results)

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
		`, companyID).Scan(&results)

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
		`, monthStart.Format("2006-01-02"), monthEnd.Format("2006-01-02"), companyID, monthEnd.Format("2006-01-02")).Scan(&results)

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
		`, companyID).Scan(&results)

	default:
		period = "daily"
		results = []ChartPoint{}
	}

	// Fallback: if connection_status_changes has no rows (empty table),
	// render a flat line at the current active count.
	if len(results) == 0 || results[len(results)-1].Value == 0 {
		var currentCount int64
		config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'active'`, companyID).Scan(&currentCount)
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
	config.DB.Raw(`SELECT COUNT(*) FROM connections WHERE company_id = ? AND deleted_at IS NULL AND status = 'active'`, companyID).Scan(&currentCount)
	if len(results) > 0 {
		results[len(results)-1].Value = float64(currentCount)
	}

	utils.SuccessResponse(c, fmt.Sprintf("Subscriber growth chart data (%s)", period), gin.H{
		"period": period,
		"data":   results,
	})
}
