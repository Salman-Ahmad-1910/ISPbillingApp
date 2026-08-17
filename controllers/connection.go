package controllers

import (
	"awesomeProject/config"
	"awesomeProject/middleware"
	"awesomeProject/models"
	"awesomeProject/utils"
	"fmt"
	"strconv"
	"time"

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
	connections := admin.Group("/connections")
	connections.Use(middleware.AuditMiddleware())
	connections.GET("", findConnections)
	connections.GET("/logs", getConnectionLogs)
	connections.POST("", createConnection)
	connections.PUT("/:id", updateConnection)
	connections.DELETE("/:id", deleteConnection)
}

func findConnections(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	// One-time cleanup: fix stale advance entries where remaining >= 0
	config.DB.Model(&models.Connection{}).
		Where("company_id = ? AND deleted_at IS NULL AND payment_status = ? AND remaining_amount >= 0", companyID, "advance").
		UpdateColumns(map[string]interface{}{
			"payment_status": "",
		})

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
	InternetID          string  `json:"internetId"`
	Name                string  `json:"name"`
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
	LeavingDate         string  `json:"leavingDate"`
	DeactivationReason  string  `json:"deactivationReason"`
	Comments            string  `json:"comments"`
	Reason              string  `json:"reason"`
	BadDebt             *bool   `json:"badDebt"`
	PaymentStatus       *string `json:"paymentStatus"`
	RemainingAmount     *float64 `json:"remainingAmount"`
}

func createConnection(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var input connectionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	if input.InternetID == "" || input.Name == "" {
		utils.ErrorResponse(c, 400, "Internet ID and Name are required", nil)
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

	switch input.ConnectionType {
	case "tv_cable":
		conn.RemainingAmount = input.Amount
	case "internet":
		conn.RemainingAmount = input.SameAmount
	default:
		conn.RemainingAmount = input.Amount + input.SameAmount
	}
	conn.CompanyID = companyID

	// Track which staff member created this subscriber
	if userID, exists := c.Get("userID"); exists {
		if uid, ok := userID.(uuid.UUID); ok {
			conn.CreatedBy = &uid
		}
	}

	if err := tx.Create(&conn).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to create connection", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit", err.Error())
		return
	}

	createConnectionLogs(c, conn, []connChange{{
		FieldName:  "connection",
		ActionType: "New Connection Installed",
		Old:        "",
		New:        fmt.Sprintf("%s (%s)", conn.Name, conn.InternetID),
	}}, input.Reason, input.Comments)

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

	// Build partial update map
	updates := map[string]interface{}{}

	if input.InternetID != "" {
		updates["internet_id"] = input.InternetID
	}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Address != "" {
		updates["address"] = input.Address
	}
	if input.Cell != "" {
		updates["cell"] = input.Cell
	}
	if input.Mobile != "" {
		updates["mobile"] = input.Mobile
	}
	if input.InstallationAmount != 0 {
		updates["installation_amount"] = input.InstallationAmount
	}
	if input.OtherAmount != 0 {
		updates["other_amount"] = input.OtherAmount
	}
	if input.InstallationDate != "" {
		updates["installation_date"] = input.InstallationDate
	}
	if input.RechargeDate != "" {
		updates["recharge_date"] = input.RechargeDate
	}
	if input.ConnectionProvider != "" {
		updates["connection_provider"] = input.ConnectionProvider
	}
	if input.ConnectionType != "" {
		updates["connection_type"] = input.ConnectionType
	}
	if input.BoxNumber != "" {
		updates["box_number"] = input.BoxNumber
	}
	if input.PackageCable != "" {
		updates["package_cable"] = input.PackageCable
	}
	if input.Discount != "" {
		updates["discount"] = input.Discount
	}
	if input.Amount != 0 {
		updates["amount"] = input.Amount
	}
	if input.PackageInternet != "" {
		updates["package_internet"] = input.PackageInternet
	}
	updates["create_balance"] = input.CreateBalance
	if input.BalanceDays != 0 {
		updates["balance_days"] = input.BalanceDays
	}
	if input.SameDiscount != "" {
		updates["same_discount"] = input.SameDiscount
	}
	if input.SameAmount != 0 {
		updates["same_amount"] = input.SameAmount
	}
	if input.Status != "" {
		updates["status"] = input.Status
	}
	if input.SublocalityID != "" {
		updates["sublocality_id"] = input.SublocalityID
	}
	if input.SplitterPort != 0 {
		updates["splitter_port"] = input.SplitterPort
	}
	// Deactivation fields - always set when provided
	if input.LeavingDate != "" {
		updates["leaving_date"] = input.LeavingDate
	}
	if input.DeactivationReason != "" {
		updates["deactivation_reason"] = input.DeactivationReason
	}
	if input.Comments != "" {
		updates["comments"] = input.Comments
	}
	if input.BadDebt != nil {
		updates["bad_debt"] = *input.BadDebt
	}
	if input.PaymentStatus != nil {
		updates["payment_status"] = *input.PaymentStatus
	}
	if input.RemainingAmount != nil {
		updates["remaining_amount"] = *input.RemainingAmount
	}

	// Handle splitter changes
	newSplitterID := input.SplitterID
	if newSplitterID == "" {
		newSplitterID = old.SplitterID
	}
	if old.SplitterID != newSplitterID {
		if old.SplitterID != "" {
			if err := incrementSplitterPorts(tx, old.SplitterID); err != nil {
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
		updates["splitter_id"] = newSplitterID
	}

	if err := tx.Model(&models.Connection{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to update connection", err.Error())
		return
	}

	var updated models.Connection
	if err := tx.First(&updated, "id = ?", id).Error; err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, 500, "Failed to reload connection", err.Error())
		return
	}

	if err := tx.Commit().Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to commit", err.Error())
		return
	}

	reason := input.Reason
	if reason == "" {
		reason = input.DeactivationReason
	}
	createConnectionLogs(c, updated, connectionFieldChanges(old, input), reason, input.Comments)

	utils.SuccessResponse(c, "Connection updated", updated)
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

	createConnectionLogs(c, conn, []connChange{{
		FieldName:  "connection",
		ActionType: "Connection Deleted",
		Old:        fmt.Sprintf("%s (%s)", conn.Name, conn.InternetID),
		New:        "",
	}}, "", "")

	utils.SuccessResponse(c, "Connection deleted", nil)
}

// connChange represents one field-level change on a connection.
type connChange struct {
	FieldName  string
	ActionType string
	Old        string
	New        string
}

func fmtNum(v float64) string {
	return strconv.FormatFloat(v, 'f', 2, 64)
}

func fmtInt(v int) string {
	return strconv.Itoa(v)
}

func fmtBool(v bool) string {
	if v {
		return "true"
	}
	return "false"
}

// connectionFieldChanges diffs the previous connection against the incoming
// input and returns one connChange per modified field.
func connectionFieldChanges(old models.Connection, input connectionInput) []connChange {
	var changes []connChange

	add := func(field, action, oldV, newV string) {
		if newV == "" || newV == oldV {
			return
		}
		changes = append(changes, connChange{FieldName: field, ActionType: action, Old: oldV, New: newV})
	}

	add("internetId", "Subscriber ID Changed", old.InternetID, input.InternetID)
	add("name", "Subscriber Name Changed", old.Name, input.Name)
	add("address", "Address Changed", old.Address, input.Address)
	add("cell", "Contact Number Changed", old.Cell, input.Cell)
	add("mobile", "Contact Number Changed", old.Mobile, input.Mobile)
	add("connectionProvider", "Provider Changed", old.ConnectionProvider, input.ConnectionProvider)
	add("connectionType", "Connection Type Changed", old.ConnectionType, input.ConnectionType)
	add("boxNumber", "Box Number Changed", old.BoxNumber, input.BoxNumber)
	add("packageCable", "Cable Package Changed", old.PackageCable, input.PackageCable)
	add("packageInternet", "Internet Package Changed", old.PackageInternet, input.PackageInternet)
	add("discount", "Discount Updated", old.Discount, input.Discount)
	add("sameDiscount", "Internet Discount Updated", old.SameDiscount, input.SameDiscount)
	add("installationDate", "Installation Date Changed", old.InstallationDate, input.InstallationDate)
	add("rechargeDate", "Recharge Date Updated", old.RechargeDate, input.RechargeDate)
	add("leavingDate", "Leaving Date Updated", old.LeavingDate, input.LeavingDate)
	add("deactivationReason", "Deactivation Reason Updated", old.DeactivationReason, input.DeactivationReason)
	add("comments", "Remarks Updated", old.Comments, input.Comments)

	if input.InstallationAmount != 0 {
		add("installationAmount", "Installation Charges Updated", fmtNum(old.InstallationAmount), fmtNum(input.InstallationAmount))
	}
	if input.OtherAmount != 0 {
		add("otherAmount", "Other Charges Updated", fmtNum(old.OtherAmount), fmtNum(input.OtherAmount))
	}
	if input.Amount != 0 {
		add("amount", "Cable Price Changed", fmtNum(old.Amount), fmtNum(input.Amount))
	}
	if input.SameAmount != 0 {
		add("sameAmount", "Internet Price Changed", fmtNum(old.SameAmount), fmtNum(input.SameAmount))
	}
	if input.BalanceDays != 0 {
		add("balanceDays", "Balance Days Updated", fmtInt(old.BalanceDays), fmtInt(input.BalanceDays))
	}
	if input.CreateBalance != old.CreateBalance {
		add("createBalance", "Balance Setting Updated", fmtBool(old.CreateBalance), fmtBool(input.CreateBalance))
	}
	if input.SplitterPort != 0 && input.SplitterPort != old.SplitterPort {
		add("splitterPort", "Splitter Port Changed", fmtInt(old.SplitterPort), fmtInt(input.SplitterPort))
	}
	if input.SublocalityID != "" && input.SublocalityID != old.SublocalityID {
		add("sublocalityId", "Area Changed", old.SublocalityID, input.SublocalityID)
	}
	if input.BadDebt != nil && *input.BadDebt != old.BadDebt {
		add("badDebt", "Bad Debt Flag Updated", fmtBool(old.BadDebt), fmtBool(*input.BadDebt))
	}

	newSplitter := input.SplitterID
	if newSplitter == "" {
		newSplitter = old.SplitterID
	}
	if newSplitter != old.SplitterID {
		add("splitterId", "Splitter Changed", old.SplitterID, newSplitter)
	}

	if input.Status != "" && input.Status != old.Status {
		action := "Connection Status Changed"
		switch input.Status {
		case "active":
			if old.Status == "suspended" {
				action = "Connection Resumed"
			} else {
				action = "Connection Activated"
			}
		case "suspended":
			action = "Connection Suspended"
		case "deactivated", "inactive":
			action = "Connection Disconnected"
		}
		add("status", action, old.Status, input.Status)
	}

	return changes
}

// connectionLogContext extracts the acting user, role, branch, IP and device
// from the Gin context for connection log entries.
func connectionLogContext(c *gin.Context) (userID *uuid.UUID, role, ip, device, branch string) {
	ip = c.ClientIP()
	device = c.GetHeader("User-Agent")

	if v, ok := c.Get("userID"); ok {
		if uid, ok2 := v.(uuid.UUID); ok2 {
			userID = &uid
			var user models.User
			if err := config.DB.First(&user, "id = ?", uid).Error; err == nil {
				role = user.Role
			}
		}
	}
	if v, ok := c.Get("userRoleInCompany"); ok {
		if s, ok2 := v.(string); ok2 && s != "" {
			role = s
		}
	}
	if v, ok := c.Get("companyID"); ok {
		if cid, ok2 := v.(uuid.UUID); ok2 {
			var company models.Company
			if err := config.DB.First(&company, "id = ?", cid).Error; err == nil {
				branch = company.Name
			}
		}
	}
	return
}

// createConnectionLogs writes one ConnectionLog row per change using the shared
// DB connection AFTER the main operation has committed. This guarantees a log
// write failure (e.g. missing table) can never abort the subscriber update.
func createConnectionLogs(c *gin.Context, conn models.Connection, changes []connChange, reason, remarks string) {
	if len(changes) == 0 {
		return
	}
	userID, role, ip, device, branch := connectionLogContext(c)
	now := time.Now()
	for _, ch := range changes {
		logEntry := models.ConnectionLog{
			TenantModel:    models.TenantModel{CompanyID: conn.CompanyID},
			ConnectionID:   conn.ID,
			SubscriberName: conn.Name,
			InternetID:     conn.InternetID,
			ConnectionType: conn.ConnectionType,
			ActionType:     ch.ActionType,
			FieldName:      ch.FieldName,
			OldValue:       ch.Old,
			NewValue:       ch.New,
			Reason:         reason,
			Remarks:        remarks,
			UpdatedBy:      userID,
			UserRole:       role,
			Branch:         branch,
			IPAddress:      ip,
			DeviceName:     device,
			LogDate:        now.Format("2006-01-02"),
			LogTime:        now.Format("15:04:05"),
		}
		if err := config.DB.Create(&logEntry).Error; err != nil {
			fmt.Printf("Failed to create connection log: %v\n", err)
		}
	}
}

func getConnectionLogs(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	db := config.DB.Scopes(models.TenantScope(companyID))

	if s := c.Query("search"); s != "" {
		db = db.Where("subscriber_name ILIKE ? OR internet_id ILIKE ?", "%"+s+"%", "%"+s+"%")
	}
	if a := c.Query("actionType"); a != "" {
		db = db.Where("action_type = ?", a)
	}
	if u := c.Query("updatedBy"); u != "" {
		db = db.Where("updated_by = ?", u)
	}
	if t := c.Query("connectionType"); t != "" && t != "both" {
		db = db.Where("connection_type = ?", t)
	}
	if from := c.Query("from"); from != "" {
		db = db.Where("log_date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		db = db.Where("log_date <= ?", to)
	}

	var logs []models.ConnectionLog
	if err := db.Order("created_at DESC").Find(&logs).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch connection logs", err.Error())
		return
	}

	userMap := map[string]string{}
	var users []models.User
	if err := config.DB.Find(&users).Error; err == nil {
		for _, u := range users {
			userMap[u.ID.String()] = u.Name
		}
	}

	branch := ""
	if v, ok := c.Get("companyID"); ok {
		if cid, ok2 := v.(uuid.UUID); ok2 {
			var company models.Company
			if err := config.DB.First(&company, "id = ?", cid).Error; err == nil {
				branch = company.Name
			}
		}
	}

	for i := range logs {
		if logs[i].UpdatedBy != nil {
			if n, ok := userMap[logs[i].UpdatedBy.String()]; ok {
				logs[i].UpdatedByName = n
			}
		}
		if logs[i].Branch == "" {
			logs[i].Branch = branch
		}
	}

	utils.SuccessResponse(c, "Connection logs retrieved", logs)
}
