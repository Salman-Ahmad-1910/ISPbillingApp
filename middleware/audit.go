package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// auditIdentifierPattern guards the table name we derive from the URL path
// before it is handed to GORM (identifiers cannot be parameterised).
var auditIdentifierPattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

// auditEntitySnapshot captures the human-readable identity of a record just
// before it is deleted. The audit entry can then say *what* was deleted
// (subscriber/connection name, internet ID, ...) instead of only a UUID.
type auditEntitySnapshot struct {
	EntityID       string
	EntityType     string
	Name           string
	Label          string
	InternetID     string
	ConnectionType string
	// FrontendID is the human-facing reference of the record (Internet ID,
	// invoice number, serial number, ...) instead of the internal UUID.
	FrontendID      string
	FrontendIDLabel string
	// Info holds additional human-readable fields (phone, address, package,
	// status, ...) shown in the expanded log entry.
	Info map[string]string
}

// auditReferenceColumns lists the columns that hold a record's user-facing
// identifier, in priority order. The first populated one becomes the
// "frontend ID" shown in the system log.
var auditReferenceColumns = []struct {
	Column string
	Label  string
}{
	{"internet_id", "Internet ID"},
	{"subscriber_identity", "Subscriber ID"},
	{"invoice_number", "Invoice No."},
	{"payment_number", "Payment No."},
	{"bill_no", "Bill No."},
	{"po_number", "PO No."},
	{"transaction_id", "Transaction ID"},
	{"serial_number", "Serial No."},
	{"receipt_number", "Receipt No."},
	{"voucher_number", "Voucher No."},
	{"expense_number", "Expense No."},
	{"username", "Username"},
	{"code", "Code"},
	{"email", "Email"},
	{"phone", "Phone"},
	{"cell", "Cell"},
}

// auditInfoColumns lists extra descriptive columns included in the expanded
// log entry so an admin can recognise the affected record without its UUID.
var auditInfoColumns = []struct {
	Column string
	Label  string
}{
	{"connection_type", "Connection type"},
	{"status", "Status"},
	{"billing_period", "Billing period"},
	{"due_date", "Due date"},
	{"amount", "Amount"},
	{"paid_amount", "Paid"},
	{"remaining_amount", "Remaining"},
	{"method", "Method"},
	{"transaction_type", "Transaction type"},
	{"batch", "Batch"},
	{"phone", "Phone"},
	{"cell", "Cell"},
	{"mobile", "Mobile"},
	{"cnic", "CNIC"},
	{"email", "Email"},
	{"address", "Address"},
	{"installation_address", "Installation address"},
	{"area_name", "Area"},
	{"sub_locality", "Sub-locality"},
	{"package_name", "Package"},
	{"package_internet", "Internet package"},
	{"package_cable", "Cable package"},
	{"deactivation_reason", "Deactivation reason"},
	{"comments", "Comments"},
	{"role", "Role"},
}

// AuditMiddleware logs every write / update / delete operation (POST, PUT,
// PATCH, DELETE) to the audit trail (audit_logs / SystemLog). Read requests
// are skipped to keep log volume manageable. It is attached at the API group
// level so activity from every subsystem (inventory, connections, billing,
// accounts, admin, ...) lands in the single system log.
//
// Each entry records the operator (name + role such as admin, manager, staff,
// dealer, sub_dealer, recovery_officer), the action type (write/update/delete/
// restore/login/logout), the module and page, any serial numbers touched, the
// affected entity id and the request outcome.
func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Read the request body but restore it so the real handler sees it too.
		var requestBody []byte
		if c.Request.Body != nil && !isMultipart(c.Request.Header.Get("Content-Type")) {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		method := c.Request.Method

		// For deletes the record disappears with the request, so snapshot its
		// display identity *before* the handler runs. This is what lets the
		// system log expand to show exactly which subscriber/connection/etc.
		// was removed.
		var deletedEntity *auditEntitySnapshot
		if method == "DELETE" {
			deletedEntity = captureDeletedEntity(c)
		}

		c.Next()

		if shouldSkipLogging(c.Request.URL.Path) {
			return
		}

		if method == "GET" || method == "OPTIONS" || method == "HEAD" {
			return
		}

		companyID := resolveCompanyID(c)
		if companyID == uuid.Nil {
			return
		}

		userID, role, userName := currentActor(c)
		// The audit_logs table has a NOT NULL foreign key on users.id, so an
		// anonymous request (e.g. a failed login with no valid token) cannot be
		// attributed to a real actor. Skip it rather than failing the insert.
		if userID == uuid.Nil {
			return
		}
		action, module := determineActionAndModule(method, c.Request.URL.Path)
		page := extractPageFromPath(c.Request.URL.Path)

		details, serials := buildActivityDetails(c, requestBody, method, action, deletedEntity)

		status := "success"
		if statusCode := c.Writer.Status(); statusCode >= 400 {
			status = "error"
		}

		logEntry := models.SystemLog{
			UserID:        userID,
			CompanyID:     companyID,
			UserRole:      role,
			Action:        action,
			Module:        module,
			Description:   generateActivityDescription(userName, action, module, page, serials, details),
			SerialNumbers: serials,
			IPAddress:     c.ClientIP(),
			UserAgent:     c.GetHeader("User-Agent"),
			Status:        status,
			Page:          page,
			Details:       details,
		}

		go func() {
			if err := config.DB.Create(&logEntry).Error; err != nil {
				gin.DefaultWriter.Write([]byte("Failed to create audit log: " + err.Error() + "\n"))
			}
		}()
	}
}

// LogAction creates a manual audit log entry (for use in controllers)
func LogAction(userID, companyID uuid.UUID, action, module, description, ipAddress, userAgent string) {
	if userID == uuid.Nil {
		return
	}
	logEntry := models.SystemLog{
		UserID:      userID,
		CompanyID:   companyID,
		Action:      action,
		Module:      module,
		Description: description,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Status:      "success",
	}

	go func() {
		if err := config.DB.Create(&logEntry).Error; err != nil {
			gin.DefaultWriter.Write([]byte("Failed to create manual audit log: " + err.Error() + "\n"))
		}
	}()
}

// LogActionWithContext creates audit log using gin context
func LogActionWithContext(c *gin.Context, action, module, description string) {
	userID, userExists := c.Get("userID")
	companyID, companyExists := c.Get("companyID")

	if userExists && companyExists {
		LogAction(
			userID.(uuid.UUID),
			companyID.(uuid.UUID),
			action,
			module,
			description,
			c.ClientIP(),
			c.GetHeader("User-Agent"),
		)
	}
}

// resolveCompanyID determines the operating company: gin context first, then
// the x-company-id header, query params, and finally the JWT claim.
func resolveCompanyID(c *gin.Context) uuid.UUID {
	if v, ok := c.Get("companyID"); ok {
		if cid, ok2 := v.(uuid.UUID); ok2 && cid != uuid.Nil {
			return cid
		}
	}

	for _, key := range []string{"x-company-id", "X-Company-Id"} {
		if val := c.GetHeader(key); val != "" {
			if cid, err := uuid.Parse(val); err == nil {
				return cid
			}
		}
	}

	for _, key := range []string{"companyId", "companyID", "company"} {
		if val := c.Query(key); val != "" {
			if cid, err := uuid.Parse(val); err == nil {
				return cid
			}
		}
	}

	if claims, err := claimsFromHeader(c); err == nil {
		return claims.CompanyID
	}
	return uuid.Nil
}

// currentActor returns the id, role and name of the person performing the
// operation. It prefers the gin context (set by AuthMiddleware) and otherwise
// validates the JWT from the Authorization header itself, so activity is also
// attributed on routes that do not run the auth middleware.
func currentActor(c *gin.Context) (uuid.UUID, string, string) {
	if v, ok := c.Get("userID"); ok {
		if uid, ok2 := v.(uuid.UUID); ok2 && uid != uuid.Nil {
			role := ""
			if rv, ok := c.Get("roleInCompany"); ok {
				role, _ = rv.(string)
			}
			return uid, role, lookupUserName(uid, role)
		}
	}
	return actorFromToken(c)
}

func actorFromToken(c *gin.Context) (uuid.UUID, string, string) {
	claims, err := claimsFromHeader(c)
	if err != nil {
		return uuid.Nil, "", ""
	}
	return claims.UserID, claims.RoleInCompany, lookupUserName(claims.UserID, claims.RoleInCompany)
}

func claimsFromHeader(c *gin.Context) (*utils.JWTClaims, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, fmt.Errorf("no bearer token")
	}
	return utils.ValidateToken(strings.TrimPrefix(authHeader, "Bearer "))
}

// lookupUserName resolves a user's display name (and falls back to the user's
// stored role when the token has none) for audit descriptions.
func lookupUserName(userID uuid.UUID, role string) string {
	var user struct {
		Name string `gorm:"column:name"`
		Role string `gorm:"column:role"`
	}
	if err := config.DB.Table("users").Select("name, role").Where("id = ?", userID).Scan(&user).Error; err == nil {
		if role == "" {
			role = user.Role
		}
		if name := user.Name; name != "" {
			return name
		}
	}
	_ = role
	return ""
}

// buildActivityDetails assembles the rich JSON blob stored in the log entry:
// affected entity id/type, connection context, serial numbers, a redacted
// request snapshot and (for deletes) the URL that allows later restore.
func buildActivityDetails(c *gin.Context, body []byte, method, action string, deletedEntity *auditEntitySnapshot) (gin.H, string) {
	details := gin.H{"path": c.Request.URL.Path}
	var serials []string
	isAuthPath := strings.HasSuffix(c.Request.URL.Path, "/auth/login") || strings.HasSuffix(c.Request.URL.Path, "/auth/logout")

	if method == "DELETE" {
		parts := strings.Split(strings.Trim(c.Request.URL.Path, "/"), "/")
		if len(parts) > 0 {
			if entityID, err := uuid.Parse(parts[len(parts)-1]); err == nil {
				details["entityId"] = entityID.String()
				details["entityType"] = guessEntityType(parts)
			}
		}
	}

	if len(body) > 0 && !isAuthPath && !isMultipart(c.Request.Header.Get("Content-Type")) {
		var payload map[string]interface{}
		if json.Unmarshal(body, &payload) == nil {
			extractSerialsFromObject(payload, &serials)
			for _, key := range []string{"id", "entityId", "connectionId", "subscriberId", "dealerId", "productId", "userId", "invoiceId", "paymentId"} {
				if v, ok := payload[key].(string); ok && v != "" {
					details["entityId"] = v
					details["entityType"] = strings.TrimSuffix(key, "Id")
					break
				}
			}
			if v, ok := payload["connectionType"].(string); ok && v != "" {
				details["connectionType"] = v
			}
			if v, ok := payload["subscriberName"].(string); ok && v != "" {
				details["subscriberName"] = v
			}
			if _, set := details["subscriberName"]; !set {
				// Connections payloads identify the subscriber as "name" rather
				// than "subscriberName", so fall back to it on those paths.
				if v, ok := payload["name"].(string); ok && v != "" && strings.Contains(c.Request.URL.Path, "connections") {
					details["subscriberName"] = v
				}
			}
			// Most create/update payloads use "name" for the record being
			// changed. Keep it so the log can describe the task by name.
			if v, ok := payload["name"].(string); ok && v != "" {
				details["recordName"] = v
			}
			if frontendID, label := auditFrontendReferenceFromPayload(payload); frontendID != "" {
				details["frontendId"] = frontendID
				details["frontendIdLabel"] = label
			}
			if v, ok := payload["internetId"].(string); ok && v != "" {
				details["internetId"] = v
			}
			if v, ok := payload["firstName"].(string); ok && v != "" {
				if n, ok := payload["lastName"].(string); ok && n != "" {
					details["operatorName"] = v + " " + n
				}
			}
		}

		snapshot := redactSensitive(string(body))
		if len(snapshot) > 2000 {
			snapshot = snapshot[:2000]
		}
		details["requestBody"] = snapshot
	}

	if action == "delete" {
		// entityType fallback from page name for restore mapping
		if details["entityType"] == nil {
			details["entityType"] = ""
		}
	}

	// Prefer the snapshot taken before the delete so the log carries the
	// record's real name as well as its id.
	if deletedEntity != nil {
		details["entityId"] = deletedEntity.EntityID
		details["entityType"] = deletedEntity.EntityType
		if deletedEntity.Label != "" {
			details["entityLabel"] = deletedEntity.Label
		}
		if deletedEntity.Name != "" {
			details["recordName"] = deletedEntity.Name
		}
		if deletedEntity.InternetID != "" {
			details["internetId"] = deletedEntity.InternetID
		}
		if deletedEntity.ConnectionType != "" {
			details["connectionType"] = deletedEntity.ConnectionType
		}
		if deletedEntity.FrontendID != "" {
			details["frontendId"] = deletedEntity.FrontendID
			details["frontendIdLabel"] = deletedEntity.FrontendIDLabel
		}
		if len(deletedEntity.Info) > 0 {
			details["recordInfo"] = deletedEntity.Info
		}
		if isSubscriberEntity(deletedEntity.EntityType) && deletedEntity.Name != "" {
			details["subscriberName"] = deletedEntity.Name
		}
	}

	return details, serializeSerials(serials)
}

// captureDeletedEntity looks up the record referenced by a DELETE request
// before it is removed. It is deliberately best-effort: if the table/row
// cannot be resolved the audit entry still records the id and route.
func captureDeletedEntity(c *gin.Context) *auditEntitySnapshot {
	if config.DB == nil {
		return nil
	}

	parts := strings.Split(strings.Trim(c.Request.URL.Path, "/"), "/")
	if len(parts) == 0 {
		return nil
	}

	entityID, err := uuid.Parse(parts[len(parts)-1])
	if err != nil {
		return nil
	}

	entityType := guessEntityType(parts)
	table := auditTableForEntityType(entityType)
	if table == "" {
		return nil
	}

	row, ok := scanAuditRow(table, entityID)
	if !ok {
		return nil
	}

	// Never surface the identity of a record that belongs to another company.
	if companyID := resolveCompanyID(c); companyID != uuid.Nil {
		if rowCompany := firstRowString(row, "company_id"); rowCompany != "" && !strings.EqualFold(rowCompany, companyID.String()) {
			return nil
		}
	}

	frontendID, frontendIDLabel := auditFrontendReference(row)
	return &auditEntitySnapshot{
		EntityID:        entityID.String(),
		EntityType:      entityType,
		Name:            firstRowString(row, "name", "subscriber_name", "full_name", "title", "vendor_name", "customer_name", "dealer_name"),
		Label:           buildEntityLabel(entityType, row),
		InternetID:      firstRowString(row, "internet_id", "subscriber_identity"),
		ConnectionType:  firstRowString(row, "connection_type"),
		FrontendID:      frontendID,
		FrontendIDLabel: frontendIDLabel,
		Info:            auditRecordInfo(row),
	}
}

// scanAuditRow loads a single row from a tenant table into a column->value
// map so the audit code can pick a display label without knowing the model.
func scanAuditRow(table string, entityID uuid.UUID) (map[string]interface{}, bool) {
	rows, err := config.DB.Table(table).Select("*").Where("id = ?", entityID).Limit(1).Rows()
	if err != nil {
		return nil, false
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, false
	}

	columns, err := rows.Columns()
	if err != nil {
		return nil, false
	}

	values := make([]interface{}, len(columns))
	scanTargets := make([]interface{}, len(columns))
	for i := range values {
		scanTargets[i] = &values[i]
	}
	if err := rows.Scan(scanTargets...); err != nil {
		return nil, false
	}

	row := make(map[string]interface{}, len(columns))
	for i, column := range columns {
		switch value := values[i].(type) {
		case []byte:
			row[column] = string(value)
		case nil:
			row[column] = nil
		default:
			row[column] = value
		}
	}
	return row, true
}

// auditTableForEntityType maps a route entity segment (e.g. "connections",
// "recovery-officers") to the table that holds it. Only identifier-safe names
// are returned because table names cannot be passed as SQL parameters.
func auditTableForEntityType(entityType string) string {
	key := strings.ToLower(strings.TrimSpace(entityType))
	aliases := map[string]string{
		"connection":          "connections",
		"subscriber":          "subscribers",
		"dealer":              "dealers",
		"user":                "users",
		"admin-user":          "users",
		"recovery-officer":    "users",
		"recovery-officers":   "users",
		"recovery_officer":    "users",
		"recovery_officers":   "users",
		"vendor-invoice":      "vendor_invoices",
		"vendor-invoices":     "vendor_invoices",
		"vendor_invoices":     "vendor_invoices",
		"serial-number-pool":  "serial_number_pools",
		"serial_number_pool":  "serial_number_pools",
		"serial-number-pools": "serial_number_pools",
		"ledger":              "ledger_entries",
		"file":                "shared_files",
		"files":               "shared_files",
	}
	if mapped, ok := aliases[key]; ok {
		return mapped
	}

	normalized := strings.ReplaceAll(key, "-", "_")
	if auditIdentifierPattern.MatchString(normalized) {
		return normalized
	}
	return ""
}

// firstRowString returns the first non-empty string-ish column from a scanned
// database row.
func firstRowString(row map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		value, ok := row[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case string:
			if trimmed := strings.TrimSpace(typed); trimmed != "" {
				return trimmed
			}
		case []byte:
			if trimmed := strings.TrimSpace(string(typed)); trimmed != "" {
				return trimmed
			}
		case fmt.Stringer:
			if trimmed := strings.TrimSpace(typed.String()); trimmed != "" {
				return trimmed
			}
		case int:
			return strconv.Itoa(typed)
		case int32:
			return strconv.FormatInt(int64(typed), 10)
		case int64:
			return strconv.FormatInt(typed, 10)
		case uint:
			return strconv.FormatUint(uint64(typed), 10)
		case uint32:
			return strconv.FormatUint(uint64(typed), 10)
		case uint64:
			return strconv.FormatUint(typed, 10)
		case float32:
			return strconv.FormatFloat(float64(typed), 'f', -1, 32)
		case float64:
			return strconv.FormatFloat(typed, 'f', -1, 64)
		case bool:
			if typed {
				return "Yes"
			}
			return "No"
		}
	}
	return ""
}

// auditFrontendReference returns the first user-facing identifier found in a
// scanned row together with its display label.
func auditFrontendReference(row map[string]interface{}) (string, string) {
	for _, ref := range auditReferenceColumns {
		if value := firstRowString(row, ref.Column); value != "" {
			return value, ref.Label
		}
	}
	return "", ""
}

// auditRecordInfo collects the descriptive fields of a row (phone, address,
// package, status, ...) for the expanded log entry. Empty values are skipped.
func auditRecordInfo(row map[string]interface{}) map[string]string {
	info := make(map[string]string)
	seen := make(map[string]bool)
	for _, column := range auditInfoColumns {
		if seen[column.Label] {
			continue
		}
		if value := firstRowString(row, column.Column); value != "" {
			info[column.Label] = value
			seen[column.Label] = true
		}
	}
	if len(info) == 0 {
		return nil
	}
	return info
}

// auditFrontendReferenceFromPayload resolves the user-facing identifier from a
// create/update JSON payload (camelCase keys) so new entries also avoid UUIDs.
func auditFrontendReferenceFromPayload(payload map[string]interface{}) (string, string) {
	references := []struct {
		Key   string
		Label string
	}{
		{"internetId", "Internet ID"},
		{"subscriberIdentity", "Subscriber ID"},
		{"invoiceNumber", "Invoice No."},
		{"paymentNumber", "Payment No."},
		{"poNumber", "PO No."},
		{"transactionId", "Transaction ID"},
		{"serialNumber", "Serial No."},
		{"receiptNumber", "Receipt No."},
		{"voucherNumber", "Voucher No."},
		{"expenseNumber", "Expense No."},
		{"username", "Username"},
		{"code", "Code"},
	}
	for _, ref := range references {
		if value, ok := payload[ref.Key].(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value), ref.Label
		}
	}
	return "", ""
}

// buildEntityLabel creates the human-readable name shown in the log, e.g.
// "John Doe (INT-001)" for a connection or "Ali Khan" for a subscriber.
func buildEntityLabel(entityType string, row map[string]interface{}) string {
	if strings.Contains(strings.ToLower(entityType), "area") {
		parts := make([]string, 0, 4)
		for _, key := range []string{"city", "zone", "locality", "sub_locality"} {
			if value := firstRowString(row, key); value != "" {
				parts = append(parts, value)
			}
		}
		if len(parts) > 0 {
			return strings.Join(parts, " / ")
		}
	}

	name := firstRowString(row, "name", "title", "full_name", "vendor_name", "customer_name", "subscriber_name", "dealer_name")
	identifier := firstRowString(row,
		"internet_id", "subscriber_identity", "serial_number", "invoice_number",
		"payment_number", "po_number", "transaction_id", "email", "phone", "cell")
	if name != "" && identifier != "" && name != identifier {
		return fmt.Sprintf("%s (%s)", name, identifier)
	}
	if name != "" {
		return name
	}
	if identifier != "" {
		return identifier
	}
	return ""
}

// isSubscriberEntity reports whether the entity represents a subscriber or a
// connection (whose display name is the subscriber's name).
func isSubscriberEntity(entityType string) bool {
	lower := strings.ToLower(entityType)
	return strings.Contains(lower, "connection") || strings.Contains(lower, "subscriber") || strings.Contains(lower, "customer")
}

// extractSerialsFromObject walks a decoded JSON payload and collects every
// value attached to a serial-related key (serialNumber, serialNumbers, serial,
// serials, batch... no, batch is separate) into the provided slice.
func extractSerialsFromObject(obj map[string]interface{}, out *[]string) {
	var walk func(v interface{})
	walk = func(v interface{}) {
		switch t := v.(type) {
		case map[string]interface{}:
			for k, val := range t {
				if strings.Contains(strings.ToLower(k), "serial") {
					switch s := val.(type) {
					case string:
						*out = append(*out, splitSerials(s)...)
					case []interface{}:
						for _, item := range s {
							if str, ok := item.(string); ok {
								*out = append(*out, str)
							}
						}
					default:
						walk(val)
					}
				} else {
					walk(val)
				}
			}
		case []interface{}:
			for _, item := range t {
				walk(item)
			}
		case string:
			// top-level strings from array walks already handled above
		}
	}
	walk(obj)
}

func splitSerials(s string) []string {
	var result []string
	for _, part := range strings.FieldsFunc(s, func(r rune) bool { return r == ',' || r == ' ' || r == '\t' || r == '\n' }) {
		p := strings.TrimSpace(part)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func serializeSerials(serials []string) string {
	seen := map[string]bool{}
	uniq := []string{}
	for _, s := range serials {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		uniq = append(uniq, s)
	}
	return strings.Join(uniq, ", ")
}

// redactSensitive masks password-like payload values before the body snapshot
// is stored.
func redactSensitive(payload string) string {
	var raw map[string]interface{}
	if json.Unmarshal([]byte(payload), &raw) != nil {
		return payload
	}
	redact := func(k string, v interface{}) interface{} {
		if strings.Contains(strings.ToLower(k), "password") || strings.Contains(strings.ToLower(k), "secret") {
			return "[REDACTED]"
		}
		return v
	}
	var walk func(v interface{}) interface{}
	walk = func(v interface{}) interface{} {
		switch t := v.(type) {
		case map[string]interface{}:
			m := map[string]interface{}{}
			for k, val := range t {
				m[k] = redact(k, walk(val))
			}
			return m
		case []interface{}:
			arr := make([]interface{}, len(t))
			for i, item := range t {
				arr[i] = walk(item)
			}
			return arr
		default:
			return v
		}
	}
	out, _ := json.Marshal(walk(raw))
	return string(out)
}

func guessEntityType(parts []string) string {
	for i := len(parts) - 2; i >= 0; i-- {
		seg := parts[i]
		if seg != "" && seg != "api" && seg != "v1" {
			return seg
		}
	}
	return ""
}

func isMultipart(contentType string) bool {
	return strings.HasPrefix(strings.ToLower(contentType), "multipart/")
}

// extractPageFromPath extracts page name from URL path
func extractPageFromPath(path string) string {
	pathParts := strings.Split(strings.Trim(path, "/"), "/")

	for i, part := range pathParts {
		if part == "api" && i+1 < len(pathParts) {
			if i+2 < len(pathParts) {
				if pathParts[i+2] == "admin" && i+3 < len(pathParts) {
					return pathParts[i+3]
				}
				return pathParts[i+2]
			}
		}
	}

	for i := len(pathParts) - 1; i >= 0; i-- {
		if pathParts[i] != "" &&
			pathParts[i] != "api" &&
			pathParts[i] != "v1" &&
			!strings.Contains(pathParts[i], "{") {
			return pathParts[i]
		}
	}

	return "unknown"
}

// shouldSkipLogging determines if a request should be skipped from audit logging
func shouldSkipLogging(path string) bool {
	skipPaths := []string{
		"/health",
		"/favicon.ico",
		"/static/",
		"/assets/",
	}

	for _, skipPath := range skipPaths {
		if strings.HasPrefix(path, skipPath) {
			return true
		}
	}
	return false
}

// determineActionAndModule extracts action and module from HTTP method and path
func determineActionAndModule(method, path string) (string, string) {
	action := "unknown"
	switch method {
	case "GET":
		action = "read"
	case "POST":
		action = "add"
	case "PUT", "PATCH":
		action = "edit"
	case "DELETE":
		action = "delete"
	}

	if strings.HasSuffix(path, "/auth/login") || strings.HasSuffix(path, "/login") {
		action = "login"
	}
	if strings.HasSuffix(path, "/auth/logout") || strings.HasSuffix(path, "/logout") {
		action = "logout"
	}

	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	start := 0
	for start < len(pathParts) && (pathParts[start] == "api" || pathParts[start] == "v1") {
		start++
	}
	if start >= len(pathParts) {
		return action, "unknown"
	}

	// The {env}/admin/... group packs many modules under one route segment. Skip
	// it so /admin/connections -> "connections", /admin/users -> "users", etc.
	module := pathParts[start]
	if module == "admin" && start+1 < len(pathParts) &&
		pathParts[start+1] != "" && !strings.Contains(pathParts[start+1], "{") {
		module = pathParts[start+1]
	}

	moduleMap := map[string]string{
		"auth":              "authentication",
		"users":             "users",
		"companies":         "companies",
		"subscribers":       "subscribers",
		"dealers":           "dealers",
		"network":           "network",
		"billing":           "billing",
		"reports":           "reports",
		"areas":             "areas",
		"olts":              "network",
		"splitters":         "network",
		"pops":              "network",
		"invoices":          "billing",
		"payments":          "billing",
		"packages":          "billing",
		"locations":         "billing",
		"complaints":        "support",
		"expenses":          "financial",
		"dashboard":         "dashboard",
		"admin":             "admin",
		"hr":                "hr",
		"accounts":          "accounts",
		"inventory":         "inventory",
		"crm":               "crm",
		"messages":          "messages",
		"connections":       "connections",
		"connection":        "connections",
		"collection":        "collection",
		"upload":            "upload",
		"mail":              "mail",
		"sms":               "sms",
		"whatsapp":          "whatsapp",
		"roles":             "roles",
		"logs":              "logs",
		"system-config":     "system",
		"company-profile":   "company",
		"settings":          "settings",
		"recovery-officers": "recovery",
		"recovery_officers": "recovery",
	}

	if mapped, exists := moduleMap[module]; exists {
		module = mapped
	}

	return action, module
}

// generateActivityDescription creates a human-readable audit description that
// names the operator, the operation type, module/page, entity and serials.
func generateActivityDescription(userName, action, module, page, serials string, details gin.H) string {
	verb := map[string]string{
		"add":    "added",
		"edit":   "updated",
		"delete": "deleted",
		"login":  "logged in to",
		"logout": "logged out of",
	}[action]
	if verb == "" {
		verb = "performed"
	}

	actor := userName
	if actor == "" {
		actor = "An operator"
	}

	entityName, _ := details["entityLabel"].(string)
	if entityName == "" {
		entityName, _ = details["subscriberName"].(string)
	}
	if entityName == "" {
		entityName, _ = details["recordName"].(string)
	}
	frontendID, _ := details["frontendId"].(string)
	internetID, _ := details["internetId"].(string)

	desc := fmt.Sprintf("%s %s %s", actor, verb, singularEntityName(module))
	if entityName != "" {
		desc += fmt.Sprintf(" \"%s\"", entityName)
	} else if frontendID != "" {
		desc += fmt.Sprintf(" \"%s\"", frontendID)
	}
	desc += fmt.Sprintf(" on %s", page)

	if internetID != "" && !strings.Contains(entityName, internetID) {
		desc += fmt.Sprintf(" [Internet ID: %s]", internetID)
	}
	if serials != "" {
		desc += fmt.Sprintf(" [serials: %s]", serials)
	}
	return desc
}

// singularEntityName turns a module name into the thing that was acted on so
// descriptions read naturally ("deleted connection ..." rather than
// "deleted connections record ...").
func singularEntityName(module string) string {
	lower := strings.ToLower(strings.TrimSpace(module))
	switch lower {
	case "connections":
		return "connection"
	case "subscribers":
		return "subscriber"
	case "users":
		return "user"
	case "dealers":
		return "dealer"
	case "areas":
		return "area"
	case "packages":
		return "package"
	case "payments":
		return "payment"
	case "invoices":
		return "invoice"
	case "purchases":
		return "purchase"
	case "products":
		return "product"
	case "expenses":
		return "expense"
	case "complaints":
		return "complaint"
	case "messages", "sms", "mail", "email", "whatsapp":
		return lower + " message"
	case "":
		return "record"
	}
	if strings.HasSuffix(lower, "s") && len(lower) > 1 {
		return strings.TrimSuffix(lower, "s")
	}
	return lower
}

// GetAuditLogs retrieves audit logs for a company (for admin users)
func GetAuditLogs(db *gorm.DB, companyID uuid.UUID, limit, offset int) ([]models.SystemLog, error) {
	var logs []models.SystemLog
	err := db.Where("company_id = ?", companyID).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}

// GetAuditLogsByModule retrieves audit logs for a specific module
func GetAuditLogsByModule(db *gorm.DB, companyID uuid.UUID, module string, limit, offset int) ([]models.SystemLog, error) {
	var logs []models.SystemLog
	err := db.Where("company_id = ? AND module = ?", companyID, module).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}

// GetAuditLogsByUser retrieves audit logs for a specific user
func GetAuditLogsByUser(db *gorm.DB, companyID, userID uuid.UUID, limit, offset int) ([]models.SystemLog, error) {
	var logs []models.SystemLog
	err := db.Where("company_id = ? AND user_id = ?", companyID, userID).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}
