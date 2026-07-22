package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetSalesVsRecovery fetches aggregate data utilizing safe RAW SQL to avoid N+1 and complex ORM structures
func GetSalesVsRecovery(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	type ReportResult struct {
		Month    string  `json:"month"`
		Sales    float64 `json:"sales"`
		Recovery float64 `json:"recovery"`
	}

	var results []ReportResult

	query := `
		SELECT 
			TO_CHAR(i.created_at, 'Mon') as month,
			COALESCE(SUM(i.amount), 0) as sales,
			COALESCE(SUM(p.amount), 0) as recovery
		FROM invoices i
		LEFT JOIN payments p ON p.invoice_id = i.id AND p.deleted_at IS NULL
		WHERE i.company_id = ? AND i.deleted_at IS NULL
		GROUP BY TO_CHAR(i.created_at, 'Mon')
		ORDER BY MIN(i.created_at)
	`

	if err := config.DB.Raw(query, companyID).Scan(&results).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to aggregate sales vs recovery", err.Error())
		return
	}

	utils.SuccessResponse(c, "Report generated successfully", results)
}

// GetBillingReport generates a billing report
func GetBillingReport(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	type BillingReport struct {
		TotalInvoices     float64 `json:"totalInvoices"`
		TotalPayments     float64 `json:"totalPayments"`
		OutstandingAmount float64 `json:"outstandingAmount"`
		PaidInvoices      int64   `json:"paidInvoices"`
		UnpaidInvoices    int64   `json:"unpaidInvoices"`
	}

	var report BillingReport

	// Get totals
	if err := config.DB.Model(&models.Invoice{}).Where("company_id = ?", companyID).Select("COALESCE(SUM(amount), 0)").Scan(&report.TotalInvoices).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to generate billing report", err.Error())
		return
	}

	if err := config.DB.Model(&models.Payment{}).Where("company_id = ?", companyID).Select("COALESCE(SUM(amount), 0)").Scan(&report.TotalPayments).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to generate billing report", err.Error())
		return
	}

	// Get counts
	config.DB.Model(&models.Invoice{}).Where("company_id = ? AND status = 'paid'", companyID).Count(&report.PaidInvoices)
	config.DB.Model(&models.Invoice{}).Where("company_id = ? AND status != 'paid'", companyID).Count(&report.UnpaidInvoices)

	// Calculate outstanding
	report.OutstandingAmount = report.TotalInvoices - report.TotalPayments

	utils.SuccessResponse(c, "Billing report generated", report)
}

// GetOutstandingReport generates an outstanding report
func GetOutstandingReport(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	type OutstandingReport struct {
		SubscriberID   uuid.UUID `json:"subscriberId"`
		SubscriberName string    `json:"subscriberName"`
		TotalAmount    float64   `json:"totalAmount"`
		PaidAmount     float64   `json:"paidAmount"`
		Outstanding    float64   `json:"outstanding"`
	}

	var reports []OutstandingReport

	query := `
		SELECT 
			s.id as subscriber_id,
			s.name as subscriber_name,
			COALESCE(SUM(i.amount), 0) as total_amount,
			COALESCE(SUM(p.amount), 0) as paid_amount,
			COALESCE(SUM(i.amount), 0) - COALESCE(SUM(p.amount), 0) as outstanding
		FROM subscribers s
		LEFT JOIN invoices i ON i.subscriber_id = s.id AND i.deleted_at IS NULL
		LEFT JOIN payments p ON p.invoice_id = i.id AND p.deleted_at IS NULL
		WHERE s.company_id = ? AND s.deleted_at IS NULL
		GROUP BY s.id, s.name
		HAVING COALESCE(SUM(i.amount), 0) - COALESCE(SUM(p.amount), 0) > 0
		ORDER BY outstanding DESC
	`

	if err := config.DB.Raw(query, companyID).Scan(&reports).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to generate outstanding report", err.Error())
		return
	}

	utils.SuccessResponse(c, "Outstanding report generated", reports)
}

// GetRecoveryReports generates comprehensive recovery reports
func GetRecoveryReports(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	// Parse query parameters
	fromDate := c.Query("fromDate")
	toDate := c.Query("toDate")
	officerID := c.Query("officerId")
	// areaID := c.Query("areaID")

	// Build base query with filters using existing tables
	query := `
		SELECT 
			DATE(p.created_at) as date,
			u.name as recovery_officer,
			'Unknown Area' as area,
			COALESCE(SUM(p.amount), 0) as amount_collected,
			0 as target_amount,
			COUNT(DISTINCT p.subscriber_id) as accounts_visited,
			COUNT(p.id) as payments_collected,
			0 as pending_payments
		FROM payments p
		LEFT JOIN users u ON u.id = p.collector_id AND u.deleted_at IS NULL
		WHERE p.company_id = ? AND p.deleted_at IS NULL
	`

	var args []interface{}
	args = append(args, companyID)

	if fromDate != "" {
		query += " AND DATE(p.created_at) >= ?"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND DATE(p.created_at) <= ?"
		args = append(args, toDate)
	}
	if officerID != "" {
		query += " AND u.id = ?"
		args = append(args, officerID)
	}

	query += " GROUP BY DATE(p.created_at), u.name ORDER BY date DESC"

	type RecoveryData struct {
		Date              string  `json:"date"`
		RecoveryOfficer   string  `json:"recoveryOfficer"`
		Area              string  `json:"area"`
		AmountCollected   float64 `json:"amountCollected"`
		TargetAmount      float64 `json:"targetAmount"`
		AccountsVisited   int     `json:"accountsVisited"`
		PaymentsCollected int     `json:"paymentsCollected"`
		PendingPayments   int     `json:"pendingPayments"`
	}

	var data []RecoveryData
	if err := config.DB.Raw(query, args...).Scan(&data).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch recovery data", err.Error())
		return
	}

	// Calculate summary
	type RecoverySummary struct {
		TotalCollected float64 `json:"totalCollected"`
		TotalTarget    float64 `json:"totalTarget"`
		CollectionRate float64 `json:"collectionRate"`
		TotalAccounts  int     `json:"totalAccounts"`
		TotalPayments  int     `json:"totalPayments"`
		PendingCount   int     `json:"pendingCount"`
	}

	var summary RecoverySummary
	for _, item := range data {
		summary.TotalCollected += item.AmountCollected
		summary.TotalTarget += item.TargetAmount
		summary.TotalAccounts += item.AccountsVisited
		summary.TotalPayments += item.PaymentsCollected
		summary.PendingCount += item.PendingPayments
	}

	if summary.TotalTarget > 0 {
		summary.CollectionRate = (summary.TotalCollected / summary.TotalTarget) * 100
	}

	utils.SuccessResponse(c, "Recovery reports fetched successfully", map[string]interface{}{
		"data":    data,
		"summary": summary,
	})
}

// GetOutstandingReports generates comprehensive outstanding reports
func GetOutstandingReports(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	asOfDate := c.Query("asOfDate")
	packageID := c.Query("packageId")
	status := c.Query("status")
	minAmount := c.Query("minAmount")
	maxAmount := c.Query("maxAmount")

	query := `
		SELECT 
			s.id as id,
			s.name as subscriber_name,
			s.id as subscriber_id,
			'Unknown Area' as area,
			p.name as package,
			COALESCE(SUM(i.amount), 0) as total_amount,
			COALESCE(SUM(pay.amount), 0) as paid_amount,
			COALESCE(SUM(i.amount), 0) - COALESCE(SUM(pay.amount), 0) as outstanding_amount,
			i.due_date as due_date,
			0 as days_overdue,
			pay.created_at as last_payment_date,
			CASE 
				WHEN i.status = 'paid' THEN 'current'
				WHEN i.status = 'pending' THEN 'overdue'
				ELSE 'current'
			END as status,
			'Unassigned' as recovery_officer
		FROM subscribers s
		LEFT JOIN invoices i ON i.subscriber_id = s.id AND i.deleted_at IS NULL
		LEFT JOIN payments pay ON pay.invoice_id = i.id AND pay.deleted_at IS NULL
		LEFT JOIN packages p ON p.id = s.package_id AND p.deleted_at IS NULL
		WHERE s.company_id = ? AND s.deleted_at IS NULL
	`

	var args []interface{}
	args = append(args, companyID)

	if asOfDate != "" {
		query += " AND DATE(i.created_at) <= ?"
		args = append(args, asOfDate)
	}
	if packageID != "" {
		query += " AND p.id = ?"
		args = append(args, packageID)
	}
	if status != "" {
		switch status {
		case "current":
			query += " AND i.status = 'paid'"
		case "overdue":
			query += " AND i.status = 'pending'"
		case "critical":
			query += " AND i.status = 'pending'"
		}
	}
	if minAmount != "" {
		query += " AND (COALESCE(SUM(i.amount), 0) - COALESCE(SUM(pay.amount), 0)) >= ?"
		args = append(args, minAmount)
	}
	if maxAmount != "" {
		query += " AND (COALESCE(SUM(i.amount), 0) - COALESCE(SUM(pay.amount), 0)) <= ?"
		args = append(args, maxAmount)
	}

	query += " GROUP BY s.id, s.name, p.name, i.due_date, pay.created_at, i.status HAVING (COALESCE(SUM(i.amount), 0) - COALESCE(SUM(pay.amount), 0)) > 0"

	type OutstandingData struct {
		ID                string  `json:"id"`
		SubscriberName    string  `json:"subscriberName"`
		SubscriberID      string  `json:"subscriberId"`
		Area              string  `json:"area"`
		Package           string  `json:"package"`
		TotalAmount       float64 `json:"totalAmount"`
		PaidAmount        float64 `json:"paidAmount"`
		OutstandingAmount float64 `json:"outstandingAmount"`
		DueDate           string  `json:"dueDate"`
		DaysOverdue       int     `json:"daysOverdue"`
		LastPaymentDate   string  `json:"lastPaymentDate"`
		Status            string  `json:"status"`
		RecoveryOfficer   string  `json:"recoveryOfficer"`
	}

	var data []OutstandingData
	if err := config.DB.Raw(query, args...).Scan(&data).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch outstanding data", err.Error())
		return
	}

	// Calculate summary
	var summary struct {
		TotalOutstanding   float64 `json:"totalOutstanding"`
		CurrentAmount      float64 `json:"currentAmount"`
		OverdueAmount      float64 `json:"overdueAmount"`
		CriticalAmount     float64 `json:"criticalAmount"`
		TotalAccounts      int     `json:"totalAccounts"`
		OverdueAccounts    int     `json:"overdueAccounts"`
		CriticalAccounts   int     `json:"criticalAccounts"`
		AverageOverdueDays float64 `json:"averageOverdueDays"`
	}

	for _, item := range data {
		summary.TotalOutstanding += item.OutstandingAmount
		summary.TotalAccounts++
		summary.AverageOverdueDays += float64(item.DaysOverdue)

		switch item.Status {
		case "current":
			summary.CurrentAmount += item.OutstandingAmount
		case "overdue":
			summary.OverdueAmount += item.OutstandingAmount
			summary.OverdueAccounts++
		case "critical":
			summary.CriticalAmount += item.OutstandingAmount
			summary.CriticalAccounts++
		}
	}

	if summary.TotalAccounts > 0 {
		summary.AverageOverdueDays /= float64(summary.TotalAccounts)
	}

	// Get areas and packages for filters
	var areas []struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}
	var packages []struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}

	config.DB.Model(&models.Area{}).Where("company_id = ?", companyID).Select("id, name").Scan(&areas)
	config.DB.Model(&models.Package{}).Where("company_id = ?", companyID).Select("id, name").Scan(&packages)

	response := gin.H{
		"data":     data,
		"summary":  summary,
		"areas":    areas,
		"packages": packages,
	}

	utils.SuccessResponse(c, "Outstanding reports generated", response)
}

// GetCashFlowReports generates cash flow reports
func GetCashFlowReports(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	fromDate := c.Query("fromDate")
	toDate := c.Query("toDate")
	category := c.Query("category")

	// Build cash flow from invoices (outflow) and payments (inflow)
	query := `
		SELECT 
			DATE(created_at) as date,
			description,
			CASE 
				WHEN type = 'payment' THEN 'revenue'
				WHEN type = 'invoice' THEN 'expense'
				ELSE 'other'
			END as category,
			COALESCE(subcategory, 'general') as subcategory,
			CASE WHEN type = 'payment' THEN amount ELSE 0 END as inflow,
			CASE WHEN type = 'invoice' THEN amount ELSE 0 END as outflow,
			CASE WHEN type = 'payment' THEN amount ELSE -amount END as net_flow,
			0 as balance,
			reference,
			created_by
		FROM (
			SELECT 
				p.created_at,
				'Payment from ' || s.name as description,
				'payment' as type,
				p.amount,
				'payment' as subcategory,
				p.invoice_id as reference,
				u.name as created_by
			FROM payments p
			LEFT JOIN subscribers s ON s.id = p.subscriber_id
			LEFT JOIN users u ON u.id = p.collector_id
			WHERE p.company_id = ? AND p.deleted_at IS NULL
			
			UNION ALL
			
			SELECT 
				i.created_at,
				'Invoice to ' || s.name as description,
				'invoice' as type,
				i.amount,
				'billing' as subcategory,
				i.id as reference,
				'Unknown' as created_by
			FROM invoices i
			LEFT JOIN subscribers s ON s.id = i.subscriber_id
			WHERE i.company_id = ? AND i.deleted_at IS NULL
		) combined
	`

	var args []interface{}
	args = append(args, companyID, companyID)

	if fromDate != "" {
		query += " WHERE DATE(created_at) >= ?"
		args = append(args, fromDate)
	}
	if toDate != "" {
		if fromDate != "" {
			query += " AND DATE(created_at) <= ?"
		} else {
			query += " WHERE DATE(created_at) <= ?"
		}
		args = append(args, toDate)
	}
	if category != "" && category != "all" {
		if fromDate != "" || toDate != "" {
			query += " AND category = ?"
		} else {
			query += " WHERE category = ?"
		}
		args = append(args, category)
	}

	query += " ORDER BY date DESC"

	type CashFlowData struct {
		ID          string  `json:"id"`
		Date        string  `json:"date"`
		Description string  `json:"description"`
		Category    string  `json:"category"`
		Subcategory string  `json:"subcategory"`
		Inflow      float64 `json:"inflow"`
		Outflow     float64 `json:"outflow"`
		NetFlow     float64 `json:"netFlow"`
		Balance     float64 `json:"balance"`
		Reference   string  `json:"reference"`
		CreatedBy   string  `json:"createdBy"`
	}

	var data []CashFlowData
	if err := config.DB.Raw(query, args...).Scan(&data).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch cash flow data", err.Error())
		return
	}

	// Calculate running balance and summary
	var summary struct {
		TotalInflow      float64            `json:"totalInflow"`
		TotalOutflow     float64            `json:"totalOutflow"`
		NetCashFlow      float64            `json:"netCashFlow"`
		OpeningBalance   float64            `json:"openingBalance"`
		ClosingBalance   float64            `json:"closingBalance"`
		RevenueBreakdown map[string]float64 `json:"revenueBreakdown"`
		ExpenseBreakdown map[string]float64 `json:"expenseBreakdown"`
		MonthlyTrend     []gin.H            `json:"monthlyTrend"`
	}

	summary.RevenueBreakdown = make(map[string]float64)
	summary.ExpenseBreakdown = make(map[string]float64)

	runningBalance := 0.0
	for i := len(data) - 1; i >= 0; i-- {
		data[i].Balance = runningBalance + data[i].NetFlow
		runningBalance = data[i].Balance

		summary.TotalInflow += data[i].Inflow
		summary.TotalOutflow += data[i].Outflow

		switch data[i].Category {
		case "revenue":
			summary.RevenueBreakdown[data[i].Subcategory] += data[i].Inflow
		case "expense":
			summary.ExpenseBreakdown[data[i].Subcategory] += data[i].Outflow
		}
	}

	summary.NetCashFlow = summary.TotalInflow - summary.TotalOutflow
	summary.OpeningBalance = 0.0 // This would come from accounting period opening
	summary.ClosingBalance = runningBalance

	response := gin.H{
		"data":    data,
		"summary": summary,
	}

	utils.SuccessResponse(c, "Cash flow reports generated", response)
}

// GetSalesReports generates sales summary reports
func GetSalesReports(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	fromDate := c.Query("fromDate")
	toDate := c.Query("toDate")
	period := c.Query("period")
	packageID := c.Query("packageId")

	// Build query based on period
	var dateFormat string
	switch period {
	case "daily":
		dateFormat = "YYYY-MM-DD"
	case "weekly":
		dateFormat = "YYYY-WW"
	case "monthly":
		dateFormat = "YYYY-MM"
	default:
		dateFormat = "YYYY-MM-DD"
	}

	query := fmt.Sprintf(`
		SELECT 
			TO_CHAR(s.created_at, '%s') as date,
			'%s' as period,
			COUNT(*) as new_subscribers,
			(SELECT COUNT(*) FROM subscribers WHERE company_id = ? AND deleted_at IS NULL) as total_subscribers,
			COALESCE(SUM(p.price), 0) as revenue,
			'[]' as packages_sold,
			0 as churned_subscribers,
			COUNT(*) as net_growth,
			CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(p.price), 0) / COUNT(*)) ELSE 0 END as average_revenue_per_user,
			p.name as top_selling_package,
			'Unknown' as sales_officer
		FROM subscribers s
		LEFT JOIN packages p ON p.id = s.package_id AND p.deleted_at IS NULL
		WHERE s.company_id = ? AND s.deleted_at IS NULL
	`, dateFormat, period)

	var args []interface{}
	args = append(args, companyID, companyID)

	if fromDate != "" {
		query += " AND DATE(s.created_at) >= ?"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND DATE(s.created_at) <= ?"
		args = append(args, toDate)
	}
	if packageID != "" {
		query += " AND s.package_id = ?"
		args = append(args, packageID)
	}

	query += " GROUP BY TO_CHAR(s.created_at, '" + dateFormat + "'), p.name ORDER BY date DESC"

	type SalesData struct {
		ID                    string  `json:"id"`
		Date                  string  `json:"date"`
		Period                string  `json:"period"`
		NewSubscribers        int     `json:"newSubscribers"`
		TotalSubscribers      int     `json:"totalSubscribers"`
		Revenue               float64 `json:"revenue"`
		PackagesSold          string  `json:"packagesSold"`
		ChurnedSubscribers    int     `json:"churnedSubscribers"`
		NetGrowth             int     `json:"netGrowth"`
		AverageRevenuePerUser float64 `json:"averageRevenuePerUser"`
		TopSellingPackage     string  `json:"topSellingPackage"`
		SalesOfficer          string  `json:"salesOfficer"`
	}

	var data []SalesData
	if err := config.DB.Raw(query, args...).Scan(&data).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch sales data", err.Error())
		return
	}

	// Calculate summary
	var summary struct {
		TotalRevenue            float64 `json:"totalRevenue"`
		TotalSubscribers        int     `json:"totalSubscribers"`
		NewSubscribers          int     `json:"newSubscribers"`
		ChurnedSubscribers      int     `json:"churnedSubscribers"`
		NetGrowth               int     `json:"netGrowth"`
		AverageRevenuePerUser   float64 `json:"averageRevenuePerUser"`
		TopSellingPackage       string  `json:"topSellingPackage"`
		PackageBreakdown        []gin.H `json:"packageBreakdown"`
		MonthlyTrend            []gin.H `json:"monthlyTrend"`
		SalesOfficerPerformance []gin.H `json:"salesOfficerPerformance"`
	}

	for _, item := range data {
		summary.TotalRevenue += item.Revenue
		summary.NewSubscribers += item.NewSubscribers
		summary.ChurnedSubscribers += item.ChurnedSubscribers
		summary.NetGrowth += item.NetGrowth
	}

	if len(data) > 0 {
		summary.TotalSubscribers = data[0].TotalSubscribers // Latest total
	}
	summary.NetGrowth = summary.NewSubscribers - summary.ChurnedSubscribers

	if summary.TotalSubscribers > 0 {
		summary.AverageRevenuePerUser = summary.TotalRevenue / float64(summary.TotalSubscribers)
	}

	// Get packages and sales officers for filters
	var packages []struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}
	var salesOfficers []struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}

	config.DB.Model(&models.Package{}).Where("company_id = ?", companyID).Select("id, name").Scan(&packages)
	config.DB.Model(&models.User{}).Where("company_id = ?", companyID).Select("id, name").Scan(&salesOfficers)

	response := gin.H{
		"data":          data,
		"summary":       summary,
		"packages":      packages,
		"salesOfficers": salesOfficers,
	}

	utils.SuccessResponse(c, "Sales reports generated", response)
}

// GetSubscriberReports generates subscriber analytics reports
func GetSubscriberReports(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	fromDate := c.Query("fromDate")
	toDate := c.Query("toDate")
	period := c.Query("period")
	packageID := c.Query("packageId")

	// Build query based on period
	var dateFormat string
	switch period {
	case "daily":
		dateFormat = "YYYY-MM-DD"
	case "weekly":
		dateFormat = "YYYY-WW"
	case "monthly":
		dateFormat = "YYYY-MM"
	default:
		dateFormat = "YYYY-MM"
	}

	query := fmt.Sprintf(`
		SELECT 
			TO_CHAR(s.created_at, '%s') as date,
			'%s' as period,
			COUNT(*) as total_subscribers,
			COUNT(*) as new_subscribers,
			0 as churned_subscribers,
			COUNT(*) as net_growth,
			CASE WHEN COUNT(*) > 0 THEN 100.0 ELSE 0 END as growth_rate,
			COUNT(*) FILTER (WHERE s.status = 'active') as active_subscribers,
			COUNT(*) FILTER (WHERE s.status = 'inactive') as inactive_subscribers,
			COUNT(*) FILTER (WHERE s.status = 'suspended') as suspended_subscribers,
			'{}' as area_breakdown,
			'{}' as package_breakdown,
			0 as average_tenure,
			0 as churn_rate
		FROM subscribers s
		LEFT JOIN packages p ON p.id = s.package_id AND p.deleted_at IS NULL
		WHERE s.company_id = ? AND s.deleted_at IS NULL
	`, dateFormat, period)

	var args []interface{}
	args = append(args, companyID)

	if fromDate != "" {
		query += " AND DATE(s.created_at) >= ?"
		args = append(args, fromDate)
	}
	if toDate != "" {
		query += " AND DATE(s.created_at) <= ?"
		args = append(args, toDate)
	}
	if packageID != "" {
		query += " AND s.package_id = ?"
		args = append(args, packageID)
	}

	query += " GROUP BY TO_CHAR(s.created_at, '" + dateFormat + "') ORDER BY date DESC"

	type SubscriberData struct {
		ID                   string  `json:"id"`
		Date                 string  `json:"date"`
		Period               string  `json:"period"`
		TotalSubscribers     int     `json:"totalSubscribers"`
		NewSubscribers       int     `json:"newSubscribers"`
		ChurnedSubscribers   int     `json:"churnedSubscribers"`
		NetGrowth            int     `json:"netGrowth"`
		GrowthRate           float64 `json:"growthRate"`
		ActiveSubscribers    int     `json:"activeSubscribers"`
		InactiveSubscribers  int     `json:"inactiveSubscribers"`
		SuspendedSubscribers int     `json:"suspendedSubscribers"`
		AreaBreakdown        string  `json:"areaBreakdown"`
		PackageBreakdown     string  `json:"packageBreakdown"`
		AverageTenure        float64 `json:"averageTenure"`
		ChurnRate            float64 `json:"churnRate"`
	}

	var data []SubscriberData
	if err := config.DB.Raw(query, args...).Scan(&data).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch subscriber data", err.Error())
		return
	}

	// Calculate summary
	var summary struct {
		CurrentTotal         int     `json:"currentTotal"`
		TotalNew             int     `json:"totalNew"`
		TotalChurned         int     `json:"totalChurned"`
		NetGrowth            int     `json:"netGrowth"`
		OverallGrowthRate    float64 `json:"overallGrowthRate"`
		CurrentChurnRate     float64 `json:"currentChurnRate"`
		AverageTenure        float64 `json:"averageTenure"`
		TopGrowthArea        string  `json:"topGrowthArea"`
		HighestChurnArea     string  `json:"highestChurnArea"`
		MostPopularPackage   string  `json:"mostPopularPackage"`
		AreaDistribution     []gin.H `json:"areaDistribution"`
		PackageDistribution  []gin.H `json:"packageDistribution"`
		MonthlyTrend         []gin.H `json:"monthlyTrend"`
		DemographicBreakdown gin.H   `json:"demographicBreakdown"`
	}

	for _, item := range data {
		summary.TotalNew += item.NewSubscribers
		summary.TotalChurned += item.ChurnedSubscribers
	}

	if len(data) > 0 {
		summary.CurrentTotal = data[0].TotalSubscribers // Latest total
	}
	summary.NetGrowth = summary.TotalNew - summary.TotalChurned

	if summary.CurrentTotal > 0 {
		summary.OverallGrowthRate = (float64(summary.NetGrowth) / float64(summary.CurrentTotal)) * 100
		summary.CurrentChurnRate = (float64(summary.TotalChurned) / float64(summary.CurrentTotal)) * 100
	}

	// Get areas and packages for filters
	var areas []struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}
	var packages []struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}

	config.DB.Model(&models.Area{}).Where("company_id = ?", companyID).Select("id, name").Scan(&areas)
	config.DB.Model(&models.Package{}).Where("company_id = ?", companyID).Select("id, name").Scan(&packages)

	response := gin.H{
		"data":     data,
		"summary":  summary,
		"areas":    areas,
		"packages": packages,
	}

	utils.SuccessResponse(c, "Subscriber reports generated", response)
}

// GetBillingReports generates comprehensive billing reports
func GetBillingReports(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	period := c.Query("period")
	packageID := c.Query("packageId")
	status := c.Query("status")

	query := fmt.Sprintf(`
		SELECT 
			'2026-03-06' as date,
			'%s' as period,
			COUNT(*) as invoices_generated,
			COUNT(*) FILTER (WHERE i.status = 'paid') as invoices_paid,
			COUNT(*) FILTER (WHERE i.status = 'pending') as invoices_pending,
			COUNT(*) FILTER (WHERE i.status = 'overdue') as invoices_overdue,
			COALESCE(SUM(i.amount), 0) as total_revenue,
			COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) as paid_revenue,
			COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'pending'), 0) as pending_revenue,
			COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'overdue'), 0) as overdue_revenue,
			'{}' as payment_methods,
			'{}' as package_revenue,
			CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE i.status = 'paid') * 100.0 / COUNT(*)) ELSE 0 END as collection_rate,
			CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(i.amount), 0) / COUNT(*) ELSE 0 END as average_invoice_amount,
			0 as late_payments
		FROM invoices i
		LEFT JOIN payments p ON p.invoice_id = i.id AND p.deleted_at IS NULL
		LEFT JOIN subscribers s ON s.id = i.subscriber_id AND s.deleted_at IS NULL
		LEFT JOIN packages pkg ON pkg.id = s.package_id AND pkg.deleted_at IS NULL
		WHERE i.company_id = ? AND i.deleted_at IS NULL
	`, period)

	var args []interface{}
	args = append(args, companyID)

	if packageID != "" {
		query += " AND s.package_id = ?"
		args = append(args, packageID)
	}
	if status != "" && status != "all" {
		query += " AND i.status = ?"
		args = append(args, status)
	}

	query += " GROUP BY date ORDER BY date DESC"

	type BillingData struct {
		ID                   string  `json:"id"`
		Date                 string  `json:"date"`
		Period               string  `json:"period"`
		InvoicesGenerated    int     `json:"invoicesGenerated"`
		InvoicesPaid         int     `json:"invoicesPaid"`
		InvoicesPending      int     `json:"invoicesPending"`
		InvoicesOverdue      int     `json:"invoicesOverdue"`
		TotalRevenue         float64 `json:"totalRevenue"`
		PaidRevenue          float64 `json:"paidRevenue"`
		PendingRevenue       float64 `json:"pendingRevenue"`
		OverdueRevenue       float64 `json:"overdueRevenue"`
		PaymentMethods       string  `json:"paymentMethods"`
		PackageRevenue       string  `json:"packageRevenue"`
		CollectionRate       float64 `json:"collectionRate"`
		AverageInvoiceAmount float64 `json:"averageInvoiceAmount"`
		LatePayments         int     `json:"latePayments"`
	}

	var data []BillingData
	if err := config.DB.Raw(query, args...).Scan(&data).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch billing data", err.Error())
		return
	}

	// Calculate summary
	var summary struct {
		TotalInvoices          int     `json:"totalInvoices"`
		TotalRevenue           float64 `json:"totalRevenue"`
		TotalPaid              float64 `json:"totalPaid"`
		TotalPending           float64 `json:"totalPending"`
		TotalOverdue           float64 `json:"totalOverdue"`
		OverallCollectionRate  float64 `json:"overallCollectionRate"`
		AverageInvoiceAmount   float64 `json:"averageInvoiceAmount"`
		TopRevenuePackage      string  `json:"topRevenuePackage"`
		PaymentMethodBreakdown []gin.H `json:"paymentMethodBreakdown"`
		MonthlyTrend           []gin.H `json:"monthlyTrend"`
		AgingReport            gin.H   `json:"agingReport"`
	}

	for _, item := range data {
		summary.TotalInvoices += item.InvoicesGenerated
		summary.TotalRevenue += item.TotalRevenue
		summary.TotalPaid += item.PaidRevenue
		summary.TotalPending += item.PendingRevenue
		summary.TotalOverdue += item.OverdueRevenue
	}

	if summary.TotalInvoices > 0 {
		summary.OverallCollectionRate = (summary.TotalPaid / summary.TotalRevenue) * 100
		summary.AverageInvoiceAmount = summary.TotalRevenue / float64(summary.TotalInvoices)
	}

	// Get packages for filters
	var packages []struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}

	config.DB.Model(&models.Package{}).Where("company_id = ?", companyID).Select("id, name").Scan(&packages)

	response := gin.H{
		"data":     data,
		"summary":  summary,
		"packages": packages,
	}

	utils.SuccessResponse(c, "Billing reports generated", response)
}

// ExportReport handles report export functionality
func ExportReport(c *gin.Context) {
	// This would handle Excel/PDF export functionality
	// For now, return the same data with export format
	c.Header("Content-Disposition", "attachment; filename=report.xlsx")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

	// Implementation would use a library like excelize to generate Excel files
	utils.SuccessResponse(c, "Export functionality ready", gin.H{"message": "Export to be implemented"})
}
