package routes

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSetupRoutesRegistersWithoutPanic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	defer func() {
		if rec := recover(); rec != nil {
			t.Fatalf("SetupRoutes panicked (likely duplicate route): %v", rec)
		}
	}()

	SetupRoutes(r)

	want := map[string]bool{
		"/api/v1/crm/customers":                 false,
		"/api/v1/crm/customers/:id":             false,
		"/api/v1/crm/guarantors":                false,
		"/api/v1/crm/guarantors/:id":            false,
		"/api/v1/crm/vendors":                   false,
		"/api/v1/crm/vendors/:id":               false,
		"/api/v1/sales/installment-plans":       false,
		"/api/v1/sales/installment-plans/:id":   false,
		"/api/v1/inventory/brands":              false,
		"/api/v1/inventory/brands/:id":          false,
		"/api/v1/inventory/unit-types":          false,
		"/api/v1/inventory/unit-types/:id":      false,
		"/api/v1/inventory/product-types":       false,
		"/api/v1/inventory/product-types/:id":   false,
		"/api/v1/inventory/vendors":             false,
		"/api/v1/inventory/vendors/:id":         false,
		"/api/v1/inventory/products":            false,
		"/api/v1/inventory/products/:id":        false,
		"/api/v1/billing/transaction-types":     false,
		"/api/v1/billing/transaction-types/:id": false,
		"/api/v1/billing/bills/create":          false,
		"/api/v1/billing/bills/delete":          false,
		"/api/v1/dealers/:id/status":            false,
		"/api/v1/inventory/vendor-invoices":     false,
		"/api/v1/inventory/vendor-invoices/:id": false,
		"/api/v1/crm/vendor-invoices":           false,
		"/api/v1/crm/vendor-invoices/:id":       false,
	}

	for _, ri := range r.Routes() {
		if _, expected := want[ri.Path]; expected {
			want[ri.Path] = true
			t.Logf("registered: %-6s %s", ri.Method, ri.Path)
		}
	}

	for path, got := range want {
		if !got {
			t.Errorf("expected %s to be registered", path)
		}
	}
}
