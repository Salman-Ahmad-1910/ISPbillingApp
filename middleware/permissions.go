package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"awesomeProject/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Server-side enforcement of the per-page child permissions managed from the
// web Roles & Permissions page (client/src/lib/permission-pages.ts).
//
// The frontend already hides controls the user is not allowed to use, but that
// is only a usability affordance: any authenticated client can call the API
// directly. These helpers mirror the frontend rules so the server is the
// actual authority:
//
//   - admin/owner always pass
//   - a user with no `user_permissions` rows at all is not configured yet, so
//     they pass. This keeps installs that never used per-user permissions
//     working, and matches hasFeaturePermission in the frontend.
//   - otherwise the permission must be granted, else the request is denied

// Global (app-wide) CRUD switches, mirrored from permission-pages.ts. They act
// as a fallback so an operator can grant create/update/delete once for every
// page instead of ticking each page individually.
const (
	CanCreatePermission = "15362"
	CanUpdatePermission = "15363"
	CanDeletePermission = "15364"
)

// Page permission IDs that own child permissions. Keep in sync with
// permission-pages.ts.
const (
	AreaPermission             = "13309"
	BoxMediaPermission         = "13314"
	PackagePermission          = "13313"
	RecoveryOfficerPermission  = "13317"
	SubscriberDetailPermission = "13315"
	InquiriesPermission        = "13316"
	PopPermission              = "15365"
	OltPermission              = "15366"
	SplitterPermission         = "15367"
	CorporateClientsPermission = "15368"
	SalesCustomersPermission   = "15336"
	GuarantorsPermission       = "15370"
	InstallmentPlansPermission = "15337"
	TransactionTypePermission  = "13324"
	BillCreatorPermission      = "13320"
	MyDealerPermission         = "13318"
	BrandPermission            = "15309"
	VendorPermission           = "15310"
	UnitTypePermission         = "15311"
	ProductPermission          = "15312"
	ProductTypePermission      = "15321"
	VendorInvoicePermission    = "15372"

	// Pages that gained Create / Update / Delete children. Keep in sync with
	// PAGE_PERMISSIONS in permission-pages.ts. Only routes owned by a single page
	// are guarded with these; see routes/api.go for the shared-endpoint cases
	// that deliberately have no page guard.
	ComplaintSubjectPermission    = "15323"
	ComplaintTypePermission       = "15325"
	ComplaintsUserPermission      = "13342"
	ComplaintsAllocatedPermission = "13343"
	MessageDraftPermission        = "13347"
	MessageNewPermission          = "13344"
	MessageWhatsappPermission     = "13359"
	MessageOtherPermission        = "13346"
	MessageExpiredPermission      = "13345"
	AccountHeadPermission         = "13322"
	AccountEntryPermission        = "13323"
	OneDayBalancePermission       = "13341"
	PurchasePermission            = "15313"
	SalesPermission               = "15315"
	FiberJointingPermission       = "15391"
	StaffPermission               = "15316"
	StaffSalaryPermission         = "15318"
	StaffAttendancePermission     = "15322"
	AdvanceLoanPermission         = "15317"
	SubscriberCollectionPage      = "13304"
	DealerCollectionPage          = "13321"
	AllocatedCollectionPage       = "13305"
	BaddebtCollectionPage         = "13357"
)

// CRUD child action keys shared by every page that exposes CRUD children.
const (
	ActionCreate = "create"
	ActionUpdate = "update"
	ActionDelete = "delete"
)

// Page-only child keys. These have no global fallback.
const (
	FeatureCards        = "cards"
	FeatureBulkEdit     = "bulk-edit"
	FeatureImportExport = "import-export"
	FeatureStatus       = "status"
	FeatureSummary      = "summary"
)

// globalCRUDPermissions maps a CRUD action to its app-wide fallback switch.
var globalCRUDPermissions = map[string]string{
	ActionCreate: CanCreatePermission,
	ActionUpdate: CanUpdatePermission,
	ActionDelete: CanDeletePermission,
}

// ChildPermissionID builds the id of a page child permission, e.g.
// ChildPermissionID("13309", "create") == "13309:create". Must match
// childPermissionId in permission-pages.ts.
func ChildPermissionID(parentID, key string) string {
	return parentID + ":" + key
}

// userPermissionSet is the resolved set of permissions applying to the current
// request, plus the two flags the checks below depend on.
type userPermissionSet struct {
	granted    map[string]bool
	configured bool
	isAdmin    bool
}

// has reports whether a single permission id is granted.
func (s userPermissionSet) has(id string) bool {
	if s.isAdmin || !s.configured {
		return true
	}
	return s.granted[id]
}

// hasCrud mirrors hasCrudPermission: the page's own child wins, but the global
// CRUD switch is honoured as an app-wide fallback.
func (s userPermissionSet) hasCrud(pageID, action string) bool {
	if s.has(ChildPermissionID(pageID, action)) {
		return true
	}
	if fallback, ok := globalCRUDPermissions[action]; ok {
		return s.has(fallback)
	}
	return false
}

// hasPageFeature mirrors hasPagePermission: features that exist on a single page
// only (cards, bulk edit, import/export, status, summary) are governed purely by
// that page's own child permission, with no global fallback.
func (s userPermissionSet) hasPageFeature(pageID, key string) bool {
	return s.has(ChildPermissionID(pageID, key))
}

// loadUserPermissionSet resolves the effective permissions for a user in a
// company. Permissions may be stored against the user record itself or against a
// linked staff / recovery officer / dealer record (which can carry a different
// primary key), so those are resolved via the user's email - the same rule
// already used by checkUserGrantedPermission.
func loadUserPermissionSet(db *gorm.DB, userID, companyID uuid.UUID) (userPermissionSet, error) {
	set := userPermissionSet{granted: map[string]bool{}}

	// owner/admin bypass everything, mirroring the frontend's isAdmin check.
	var userCompany models.UserCompany
	err := db.Where("user_id = ? AND company_id = ?", userID, companyID).First(&userCompany).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return set, err
	}
	if userCompany.UserRole == "owner" || userCompany.UserRole == "admin" {
		set.isAdmin = true
		return set, nil
	}

	entityIDs := []string{userID.String()}

	var user models.User
	if err := db.Select("email").Where("id = ?", userID).First(&user).Error; err == nil && user.Email != "" {
		var staffIDs []string
		if err := db.Model(&models.Staff{}).Where("email = ? AND company_id = ?", user.Email, companyID).Pluck("id", &staffIDs).Error; err == nil {
			entityIDs = append(entityIDs, staffIDs...)
		}

		var officerIDs []string
		if err := db.Model(&models.RecoveryOfficer{}).Where("email = ? AND company_id = ?", user.Email, companyID).Pluck("id", &officerIDs).Error; err == nil {
			entityIDs = append(entityIDs, officerIDs...)
		}

		var dealerIDs []string
		if err := db.Model(&models.Dealer{}).Where("email = ? AND company_id = ?", user.Email, companyID).Pluck("id", &dealerIDs).Error; err == nil {
			entityIDs = append(entityIDs, dealerIDs...)
		}
	}

	// user_permissions.user_id is a UUID, so drop any unparseable entity id
	// rather than letting a malformed row fail the whole guard.
	uuids := make([]uuid.UUID, 0, len(entityIDs))
	for _, id := range entityIDs {
		if parsed, parseErr := uuid.Parse(id); parseErr == nil {
			uuids = append(uuids, parsed)
		}
	}

	var perms []models.UserPermission
	if err := db.Where("user_id IN ? AND company_id = ?", uuids, companyID).Find(&perms).Error; err != nil {
		return set, err
	}

	// "Configured" means the user has been through the Roles & Permissions page
	// at least once. With no rows at all we stay permissive so installs that
	// never used per-user permissions are not locked out.
	set.configured = len(perms) > 0
	for _, p := range perms {
		if p.WebEnabled {
			set.granted[p.PermissionID] = true
		}
	}

	return set, nil
}

// permissionContext pulls the authenticated user and company out of the request.
func permissionContext(c *gin.Context) (uuid.UUID, uuid.UUID, bool) {
	userIDRaw, userOK := c.Get("userID")
	companyIDRaw, companyOK := c.Get("companyID")

	userID, ok1 := userIDRaw.(uuid.UUID)
	companyID, ok2 := companyIDRaw.(uuid.UUID)
	if !userOK || !companyOK || !ok1 || !ok2 {
		return uuid.Nil, uuid.Nil, false
	}
	return userID, companyID, true
}

// resolvePermissionSet is the shared entry point for every guard. It writes the
// error response and returns false when the request cannot be evaluated.
func resolvePermissionSet(c *gin.Context, db *gorm.DB) (userPermissionSet, bool) {
	userID, companyID, ok := permissionContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return userPermissionSet{}, false
	}

	set, err := loadUserPermissionSet(db, userID, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to resolve permissions",
		})
		return userPermissionSet{}, false
	}

	return set, true
}

func denyPermission(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"success": false,
		"message": "Access denied: Insufficient permissions",
	})
	c.Abort()
}

// crudActionForMethod maps an HTTP method to the CRUD action it performs.
// Reads are deliberately unmapped - listing a page is governed by the existing
// module-level RBAC, not by a child permission.
func crudActionForMethod(method string) (string, bool) {
	switch method {
	case http.MethodPost:
		return ActionCreate, true
	case http.MethodPut, http.MethodPatch:
		return ActionUpdate, true
	case http.MethodDelete:
		return ActionDelete, true
	}
	return "", false
}

// RequirePageCrud enforces a page's own Create / Update / Delete child
// permission, falling back to the global CRUD switches. The action is derived
// from the HTTP method, so attach it once per route:
//
//	network.POST("/areas", middleware.RequirePageCrud(db, middleware.AreaPermission), controllers.CreateArea)
func RequirePageCrud(db *gorm.DB, pageID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		action, ok := crudActionForMethod(c.Request.Method)
		if !ok {
			// GET/HEAD/OPTIONS only reads the page, which the enclosing group RBAC
			// already covers.
			c.Next()
			return
		}

		set, ok := resolvePermissionSet(c, db)
		if !ok {
			c.Abort()
			return
		}

		if !set.hasCrud(pageID, action) {
			denyPermission(c)
			return
		}

		c.Next()
	}
}

// RequirePageCrudAction is RequirePageCrud with an explicit action instead of
// one derived from the HTTP method. Needed for routes whose verb does not match
// what they do, e.g. POST /areas/:id/assign-officer mutates an existing area
// rather than creating one.
func RequirePageCrudAction(db *gorm.DB, pageID, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		set, ok := resolvePermissionSet(c, db)
		if !ok {
			c.Abort()
			return
		}

		if !set.hasCrud(pageID, action) {
			denyPermission(c)
			return
		}

		c.Next()
	}
}

// RequirePageFeature enforces a single page-only child permission such as
// "cards", "bulk-edit", "import-export", "status" or "summary". Unlike
// RequirePageCrud there is no global fallback: the permission must be granted
// explicitly.
func RequirePageFeature(db *gorm.DB, pageID, key string) gin.HandlerFunc {
	return func(c *gin.Context) {
		set, ok := resolvePermissionSet(c, db)
		if !ok {
			c.Abort()
			return
		}

		if !set.hasPageFeature(pageID, key) {
			denyPermission(c)
			return
		}

		c.Next()
	}
}

// bodyHasField reports whether a JSON request body contains the given key. The
// body is buffered and restored so the downstream handler still reads it.
// StripPageFieldUnlessFeature removes a field from a JSON body unless the page's
// feature permission for it is granted, then lets the request through. It exists
// for forms that mix a separately-governed field in with ordinary edits: the
// dealer edit form carries `status`, so without this a user granted only "Edit"
// could change a status that "Change Status" governs. Denying the request would
// be wrong here (the rest of the edit is legitimate), so the field is dropped
// instead and the handler simply leaves that column untouched.
func StripPageFieldUnlessFeature(db *gorm.DB, pageID, action, field, featureKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body == nil {
			c.Next()
			return
		}

		raw, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.Next()
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(raw))
		c.Request.ContentLength = int64(len(raw))

		if len(bytes.TrimSpace(raw)) == 0 {
			c.Next()
			return
		}
		var payload map[string]any
		if err := json.Unmarshal(raw, &payload); err != nil {
			c.Next()
			return
		}
		if _, present := payload[field]; !present {
			c.Next()
			return
		}

		set, ok := resolvePermissionSet(c, db)
		if !ok {
			c.Abort()
			return
		}
		if set.hasPageFeature(pageID, featureKey) {
			c.Next()
			return
		}

		delete(payload, field)
		stripped, err := json.Marshal(payload)
		if err != nil {
			c.Next()
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(stripped))
		c.Request.ContentLength = int64(len(stripped))
		c.Request.Header.Set("Content-Length", strconv.Itoa(len(stripped)))
		c.Next()
	}
}

func bodyHasField(c *gin.Context, field string) bool {
	if c.Request.Body == nil {
		return false
	}

	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return false
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(raw))
	c.Request.ContentLength = int64(len(raw))

	if len(bytes.TrimSpace(raw)) == 0 {
		return false
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return false
	}
	_, ok := payload[field]
	return ok
}

// RequirePageCrudUnlessFeature guards a route that serves two different child
// permissions on the same verb. The subscriber status change is a PUT that
// shares updateConnection with the ordinary edit form, so a user granted
// "update" could otherwise change a status they were not granted. When the body
// carries the given field the feature permission is required; otherwise the CRUD
// action is checked.
func RequirePageCrudUnlessFeature(db *gorm.DB, pageID, action, field, featureKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		set, ok := resolvePermissionSet(c, db)
		if !ok {
			c.Abort()
			return
		}

		if bodyHasField(c, field) {
			if !set.hasPageFeature(pageID, featureKey) {
				denyPermission(c)
				return
			}
			c.Next()
			return
		}

		if !set.hasCrud(pageID, action) {
			denyPermission(c)
			return
		}

		c.Next()
	}
}
