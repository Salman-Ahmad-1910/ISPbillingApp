package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strings"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SyncOp struct {
	ID     string                 `json:"id,omitempty"`
	Method string                 `json:"method"`
	Path   string                 `json:"path"`
	Body   map[string]interface{} `json:"body,omitempty"`
}

type SyncBatchRequest struct {
	Operations []SyncOp `json:"operations"`
}

type syncApplier func(tx *gorm.DB, companyID uuid.UUID, op SyncOp) error

type syncResource struct {
	applier syncApplier
}

var syncRegistry = map[string]syncResource{}
func normalizePath(p string) string {
	if i := strings.Index(p, "?"); i != -1 {
		p = p[:i]
	}
	if strings.HasPrefix(p, "/") {
		p = p[1:]
	}
	return p
}

func basePath(p string) string {
	n := normalizePath(p)
	parts := strings.Split(n, "/")
	if len(parts) == 0 {
		return n
	}
	last := parts[len(parts)-1]
	if isUUID(last) {
		return strings.Join(parts[:len(parts)-1], "/")
	}
	return n
}

func isUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

func extractIDFromPath(p string) string {
	n := normalizePath(p)
	parts := strings.Split(n, "/")
	for i := len(parts) - 1; i >= 0; i-- {
		if isUUID(parts[i]) {
			return parts[i]
		}
	}
	return ""
}

func SyncTransaction(c *gin.Context) {
	companyID, ok := c.Get("companyID")
	if !ok {
		utils.ErrorResponse(c, 400, "Company ID required", nil)
		return
	}
	compID, ok := companyID.(uuid.UUID)
	if !ok || compID.String() == "00000000-0000-0000-0000-000000000000" {
		utils.ErrorResponse(c, 400, "Company ID required", nil)
		return
	}

	var req SyncBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	if len(req.Operations) == 0 {
		utils.SuccessResponse(c, "No operations to sync", nil)
		return
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		for _, op := range req.Operations {
			b := basePath(op.Path)
			res, exists := syncRegistry[b]
			if !exists {
				norm := normalizePath(op.Path)
				if r2, ok2 := syncRegistry[norm]; ok2 {
					res = r2
					exists = true
					b = norm
				}
			}
			if !exists {
				return fmt.Errorf("unsupported sync path: %s", op.Path)
			}
			if res.applier == nil {
				return fmt.Errorf("no applier for path: %s", op.Path)
			}
			if err := res.applier(tx, compID, op); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Batch sync failed", err.Error())
		return
	}

	utils.SuccessResponse(c, "Batch synced successfully", gin.H{"operations": len(req.Operations)})
}
func setCompanyIDIfScoped(entity interface{}, compID uuid.UUID, scoped bool) {
	if !scoped {
		return
	}
	v := reflect.ValueOf(entity).Elem()
	if !v.IsValid() {
		return
	}
	f := v.FieldByName("CompanyID")
	if f.IsValid() && f.CanSet() && f.Type() == reflect.TypeOf(uuid.UUID{}) {
		f.Set(reflect.ValueOf(compID))
	}
}

func setIDFromBodyOrPath(entity interface{}, op SyncOp) {
	id := extractIDFromPath(op.Path)
	if id == "" && op.Body != nil {
		if bid, ok := op.Body["id"].(string); ok && bid != "" {
			id = bid
		}
	}
	if id == "" {
		return
	}
	if pid, err := uuid.Parse(id); err == nil {
		v := reflect.ValueOf(entity).Elem()
		if !v.IsValid() {
			return
		}
		f := v.FieldByName("ID")
		if f.IsValid() && f.CanSet() && f.Type() == reflect.TypeOf(uuid.UUID{}) {
			f.Set(reflect.ValueOf(pid))
		}
	}
}
func applyCreateGenericAny(tx *gorm.DB, companyID uuid.UUID, op SyncOp, scoped bool, base string) error {
	entity := entityFor(base)
	if entity == nil {
		return fmt.Errorf("no entity mapping for %s", base)
	}
	b, err := json.Marshal(op.Body)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, entity); err != nil {
		return err
	}
	setCompanyIDIfScoped(entity, companyID, scoped)
	if err := tx.Create(entity).Error; err != nil {
		return err
	}
	return nil
}

func applyUpdateGenericAny(tx *gorm.DB, companyID uuid.UUID, op SyncOp, scoped bool, base string) error {
	entity := entityFor(base)
	if entity == nil {
		return fmt.Errorf("no entity mapping for %s", base)
	}
	b, err := json.Marshal(op.Body)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, entity); err != nil {
		return err
	}
	setCompanyIDIfScoped(entity, companyID, scoped)
	setIDFromBodyOrPath(entity, op)
	db := tx.Model(entity)
	if scoped {
		db = db.Scopes(models.TenantScope(companyID))
	}
	id := extractIDFromPath(op.Path)
	if id == "" && op.Body != nil {
		if bid, ok := op.Body["id"].(string); ok && bid != "" {
			id = bid
		}
	}
	if err := db.Where("id = ?", id).Session(&gorm.Session{FullSaveAssociations: true}).Save(entity).Error; err != nil {
		return err
	}
	return nil
}

func applyDeleteGenericAny(tx *gorm.DB, companyID uuid.UUID, op SyncOp, scoped bool, base string) error {
	entity := entityFor(base)
	if entity == nil {
		return fmt.Errorf("no entity mapping for %s", base)
	}
	db := tx
	if scoped {
		db = db.Scopes(models.TenantScope(companyID))
	}
	id := extractIDFromPath(op.Path)
	if id == "" {
		return fmt.Errorf("delete requires id in path")
	}
	if err := db.Where("id = ?", id).Delete(entity).Error; err != nil {
		return err
	}
	return nil
}
func entityFor(base string) interface{} {
	switch base {
	case "companies":
		return &models.Company{}
	case "network/boxes":
		return &models.DistributionBox{}
	case "network/splitters":
		return &models.Splitter{}
	case "billing/packages":
		return &models.Package{}
	case "billing/transaction-types":
		return &models.TransactionType{}
	case "inventory/brands":
		return &models.Brand{}
	case "inventory/product-types":
		return &models.ProductType{}
	case "inventory/unit-types":
		return &models.UnitType{}
	case "inventory/vendors", "crm/vendors":
		return &models.Vendor{}
	case "crm/customers":
		return &models.Customer{}
	case "subscribers/inquiries":
		return &models.Inquiry{}
	case "sales/installment-plans":
		return &models.InstallmentPlan{}
	case "billing/subscribers":
		return &models.Subscriber{}
	case "accounts/heads":
		return &models.AccountHead{}
	case "accounts/sub-heads":
		return &models.AccountSubHead{}
	case "accounts/entries":
		return &models.AccountEntry{}
	case "hr/departments":
		return &models.StaffDepartment{}
	case "hr/salary":
		return &models.SalaryPayment{}
	case "hr/attendance":
		return &models.Attendance{}
	case "hr/advances":
		return &models.AdvanceLoan{}
	default:
		return nil
	}
}
func initSyncRegistry() {
	registerGenericScoped("companies", false)
	registerGenericScoped("network/boxes", true)
	registerGenericScoped("network/splitters", true)
	registerGenericScoped("billing/packages", true)
	registerGenericScoped("billing/transaction-types", true)
	registerGenericScoped("inventory/brands", true)
	registerGenericScoped("inventory/product-types", true)
	registerGenericScoped("inventory/unit-types", true)
	registerGenericScoped("inventory/vendors", true)
	registerGenericScoped("crm/vendors", true)
	registerGenericScoped("crm/customers", true)
	registerGenericScoped("subscribers/inquiries", true)
	registerGenericScoped("sales/installment-plans", true)
	registerGenericScoped("billing/subscribers", true)
	registerGenericScoped("accounts/heads", true)
	registerGenericScoped("accounts/sub-heads", true)
	registerGenericScoped("accounts/entries", true)
	registerGenericScoped("hr/departments", true)
	registerGenericScoped("hr/salary", true)
	registerGenericScoped("hr/attendance", true)
	registerGenericScoped("hr/advances", true)
}

func registerGenericScoped(base string, scoped bool) {
	syncRegistry[base] = syncResource{
		applier: func(tx *gorm.DB, companyID uuid.UUID, op SyncOp) error {
			m := strings.ToUpper(op.Method)
			switch m {
			case "POST":
				return applyCreateGenericAny(tx, companyID, op, scoped, base)
			case "PUT", "PATCH":
				return applyUpdateGenericAny(tx, companyID, op, scoped, base)
			case "DELETE":
				return applyDeleteGenericAny(tx, companyID, op, scoped, base)
			default:
				return fmt.Errorf("unsupported method %s", m)
			}
		},
	}
}

func init() {
	initSyncRegistry()
}

