package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

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

		c.Next()

		if shouldSkipLogging(c.Request.URL.Path) {
			return
		}

		method := c.Request.Method
		if method == "GET" || method == "OPTIONS" || method == "HEAD" {
			return
		}

		companyID := resolveCompanyID(c)
		if companyID == uuid.Nil {
			return
		}

		userID, role, userName := currentActor(c)
		action, module := determineActionAndModule(method, c.Request.URL.Path)
		page := extractPageFromPath(c.Request.URL.Path)

		details, serials := buildActivityDetails(c, requestBody, method, action)

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
func buildActivityDetails(c *gin.Context, body []byte, method, action string) (gin.H, string) {
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

	return details, serializeSerials(serials)
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
		"auth":             "authentication",
		"users":            "users",
		"companies":        "companies",
		"subscribers":      "subscribers",
		"dealers":          "dealers",
		"network":          "network",
		"billing":          "billing",
		"reports":          "reports",
		"areas":            "areas",
		"olts":             "network",
		"splitters":        "network",
		"pops":             "network",
		"invoices":         "billing",
		"payments":         "billing",
		"packages":         "billing",
		"locations":        "billing",
		"complaints":       "support",
		"expenses":         "financial",
		"dashboard":        "dashboard",
		"admin":            "admin",
		"hr":               "hr",
		"accounts":         "accounts",
		"inventory":        "inventory",
		"crm":              "crm",
		"messages":         "messages",
		"connections":      "connections",
		"connection":       "connections",
		"collection":       "collection",
		"upload":           "upload",
		"mail":             "mail",
		"sms":              "sms",
		"whatsapp":         "whatsapp",
		"roles":            "roles",
		"logs":             "logs",
		"system-config":    "system",
		"company-profile":  "company",
		"settings":         "settings",
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
		"add":    "wrote/added",
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

	desc := fmt.Sprintf("%s %s %s record on %s", actor, verb, module, page)

	if subscriber, ok := details["subscriberName"].(string); ok && subscriber != "" {
		desc += fmt.Sprintf(" for %s", subscriber)
		if internetID, ok := details["internetId"].(string); ok && internetID != "" {
			desc += fmt.Sprintf(" (%s)", internetID)
		}
	}

	if entityID, ok := details["entityId"].(string); ok && entityID != "" {
		desc += fmt.Sprintf(" (entity %s)", entityID)
	}
	if serials != "" {
		desc += fmt.Sprintf(" [serials: %s]", serials)
	}
	return desc
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