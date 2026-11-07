// OLD: "//go:build scenario" - the file only compiled with -tags scenario
// because it used the real database. It now uses the guarded test database
// (requireTestDB) and runs with the other tests.

package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"awesomeProject/config"
	"awesomeProject/models"
)

var scenarioCompanyID uuid.UUID

// OLD: a TestMain loaded ../.env and connected to the APPLICATION database,
// so running the controller tests wrote test rows into the real database.
// Database tests now call requireTestDB (testdb_test.go), which only connects
// to a separate TEST_DB_NAME database and never falls back to DB_* / .env.

func newConn(companyID uuid.UUID, name string, connType string, amount, sameAmount, remaining float64) models.Connection {
	c := models.Connection{
		CompanyID:       companyID,
		Name:            name,
		InternetID:      uuid.New().String(),
		ConnectionType:   connType,
		Amount:          amount,
		SameAmount:      sameAmount,
		RemainingAmount:  remaining,
		Status:          "active",
		PaymentStatus:    paymentStatusForBalance(remaining),
	}
	config.DB.Create(&c)
	return c
}

func callCreate(companyID uuid.UUID, body CreateBillRequest) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", "/billing/bills/create?companyId="+companyID.String(), bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("companyID", companyID)
	CreateBills(c)
	return w
}

func callDelete(companyID uuid.UUID, body DeleteBillRequest) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", "/billing/bills/delete?companyId="+companyID.String(), bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("companyID", companyID)
	DeleteBills(c)
	return w
}

func getConn(id uuid.UUID) models.Connection {
	var c models.Connection
	config.DB.Where("id = ?", id).First(&c)
	return c
}

func countBills(companyID uuid.UUID, connID uuid.UUID, month, year, ctype string) int64 {
	var n int64
	q := config.DB.Model(&models.BillRecord{}).Where("company_id = ? AND connection_id = ? AND month = ? AND year = ? AND status = 'Created'", companyID, connID, month, year)
	if ctype != "" {
		q = q.Where("connection_type = ?", ctype)
	}
	q.Count(&n)
	return n
}

func TestBillingScenarios(t *testing.T) {
	requireTestDB(t)
	gin.SetMode(gin.TestMode)
	// Isolated company; all its rows are hard-deleted when the test ends.
	company := models.Company{BaseModel: models.BaseModel{ID: newTestCompany(t, "ScenarioCo")}}
	scenarioCompanyID = company.ID

	// Test 1: package change preserves remaining
	t.Run("Test1_PackageChange", func(t *testing.T) {
		conn := newConn(company.ID, "Sub1", "internet", 1100, 1100, 1100)
		conn.PackageInternet = "Basic"
		config.DB.Save(&conn)
		// call updateConnection to change package fee to 1800
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		body := map[string]interface{}{
			"packageInternet": "Premium",
			"sameAmount":      1800.0,
		}
		b, _ := json.Marshal(body)
		req, _ := http.NewRequest("PUT", "/admin/connections/"+conn.ID.String()+"?companyId="+company.ID.String(), bytes.NewBuffer(b))
		req.Header.Set("Content-Type", "application/json")
		c.Request = req
		c.Params = gin.Params{{Key: "id", Value: conn.ID.String()}}
		c.Set("companyID", company.ID)
		updateConnection(c)
		got := getConn(conn.ID)
		if got.RemainingAmount != 1100 {
			t.Fatalf("remaining = %v, want 1100", got.RemainingAmount)
		}
		if got.SameAmount != 1800 {
			t.Fatalf("sameAmount = %v, want 1800", got.SameAmount)
		}
		_ = w
	})

	// prepare a fresh subscriber for bill tests: remaining 1100, fee 1800
	conn := newConn(company.ID, "SubBill", "internet", 0, 1800, 1100)
	conn.PackageInternet = "Premium"
	config.DB.Save(&conn)

	// Test 2: first bill creation
	t.Run("Test2_FirstBill", func(t *testing.T) {
		w := callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{conn.ID.String()}, ConnectionType: "Internet", Amount: 1800, Subscribers: 1}},
			Month:        "November",
			Year:         "2025",
		})
		if w.Code != 200 {
			t.Fatalf("create status %d: %s", w.Code, w.Body.String())
		}
		got := getConn(conn.ID)
		if got.RemainingAmount != 2900 {
			t.Fatalf("remaining = %v, want 2900", got.RemainingAmount)
		}
		if n := countBills(company.ID, conn.ID, "November", "2025", "internet"); n != 1 {
			t.Fatalf("bill count = %d, want 1", n)
		}
	})

	// Test 3: delete bill
	t.Run("Test3_DeleteBill", func(t *testing.T) {
		w := callDelete(company.ID, DeleteBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{conn.ID.String()}, ConnectionType: "Internet"}},
			Month:        "November",
			Year:         "2025",
		})
		if w.Code != 200 {
			t.Fatalf("delete status %d: %s", w.Code, w.Body.String())
		}
		got := getConn(conn.ID)
		if got.RemainingAmount != 1100 {
			t.Fatalf("remaining = %v, want 1100", got.RemainingAmount)
		}
	})

	// Test 4: recreate
	t.Run("Test4_Recreate", func(t *testing.T) {
		w := callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{conn.ID.String()}, ConnectionType: "Internet"}},
			Month:        "November",
			Year:         "2025",
		})
		if w.Code != 200 {
			t.Fatalf("create status %d: %s", w.Code, w.Body.String())
		}
		got := getConn(conn.ID)
		if got.RemainingAmount != 2900 {
			t.Fatalf("remaining = %v, want 2900", got.RemainingAmount)
		}
		if n := countBills(company.ID, conn.ID, "November", "2025", "internet"); n != 1 {
			t.Fatalf("bill count = %d, want 1", n)
		}
	})
	// cleanup november bill for accumulation test
	callDelete(company.ID, DeleteBillRequest{
		GroupedBills: []BillGroup{{ConnectionIDs: []string{conn.ID.String()}, ConnectionType: "Internet"}},
		Month:        "November",
		Year:         "2025",
	})

	// Test 5: unpaid accumulation Oct/Nov/Dec
	t.Run("Test5_Accumulation", func(t *testing.T) {
		c2 := newConn(company.ID, "Accum", "internet", 0, 1100, 1100) // october remaining 1100
		c2.PackageInternet = "Basic"
		config.DB.Save(&c2)
		// November bill 1800
		connNov := c2
		connNov.SameAmount = 1800
		config.DB.Save(&connNov)
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{c2.ID.String()}, ConnectionType: "Internet"}},
			Month:        "November",
			Year:         "2025",
		})
		// December bill 1800
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{c2.ID.String()}, ConnectionType: "Internet"}},
			Month:        "December",
			Year:         "2025",
		})
		got := getConn(c2.ID)
		if got.RemainingAmount != 4700 {
			t.Fatalf("remaining = %v, want 4700", got.RemainingAmount)
		}
	})

	// Test 6 & 7: partial/full payment
	t.Run("Test6_PartialPayment", func(t *testing.T) {
		c3 := newConn(company.ID, "PayPartial", "internet", 0, 1800, 2900)
		// create payment 1000
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		pay := models.Payment{SubscriberID: &c3.ID, Amount: 1000, Method: "cash"}
		b, _ := json.Marshal(pay)
		req, _ := http.NewRequest("POST", "/billing/payments?companyId="+company.ID.String(), bytes.NewBuffer(b))
		req.Header.Set("Content-Type", "application/json")
		ctx.Request = req
		ctx.Set("companyID", company.ID)
		CreatePayment(ctx)
		if w.Code != 201 && w.Code != 200 {
			t.Fatalf("payment status %d: %s", w.Code, w.Body.String())
		}
		got := getConn(c3.ID)
		if got.RemainingAmount != 1900 {
			t.Fatalf("remaining = %v, want 1900", got.RemainingAmount)
		}
	})
	t.Run("Test7_FullPayment", func(t *testing.T) {
		c4 := newConn(company.ID, "PayFull", "internet", 0, 1800, 2900)
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		pay := models.Payment{SubscriberID: &c4.ID, Amount: 2900, Method: "cash"}
		b, _ := json.Marshal(pay)
		req, _ := http.NewRequest("POST", "/billing/payments?companyId="+company.ID.String(), bytes.NewBuffer(b))
		req.Header.Set("Content-Type", "application/json")
		ctx.Request = req
		ctx.Set("companyID", company.ID)
		CreatePayment(ctx)
		got := getConn(c4.ID)
		if got.RemainingAmount != 0 {
			t.Fatalf("remaining = %v, want 0", got.RemainingAmount)
		}
	})

	// Test 8: advance payment preserved on package change
	t.Run("Test8_Advance", func(t *testing.T) {
		c5 := newConn(company.ID, "Adv", "internet", 0, 1100, -500)
		c5.PackageInternet = "Basic"
		config.DB.Save(&c5)
		// change package fee to 1800 via updateConnection
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		body := map[string]interface{}{"packageInternet": "Premium", "sameAmount": 1800.0}
		b, _ := json.Marshal(body)
		req, _ := http.NewRequest("PUT", "/admin/connections/"+c5.ID.String()+"?companyId="+company.ID.String(), bytes.NewBuffer(b))
		req.Header.Set("Content-Type", "application/json")
		ctx.Request = req
		ctx.Params = gin.Params{{Key: "id", Value: c5.ID.String()}}
		ctx.Set("companyID", company.ID)
		updateConnection(ctx)
		got := getConn(c5.ID)
		if got.RemainingAmount != -500 {
			t.Fatalf("remaining = %v, want -500", got.RemainingAmount)
		}
	})

	// Test 9: different subscriber types
	t.Run("Test9_Types", func(t *testing.T) {
		ci := newConn(company.ID, "InternetOnly", "internet", 0, 1000, 0)
		cc := newConn(company.ID, "CableOnly", "tv_cable", 500, 0, 0)
		cb := newConn(company.ID, "Both", "both", 500, 1000, 0)
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{
				{ConnectionIDs: []string{ci.ID.String()}, ConnectionType: "Internet"},
				{ConnectionIDs: []string{cc.ID.String()}, ConnectionType: "Cable"},
				{ConnectionIDs: []string{cb.ID.String()}, ConnectionType: "Both"},
			},
			Month: "January",
			Year:  "2026",
		})
		if getConn(ci.ID).RemainingAmount != 1000 {
			t.Fatalf("internet remaining = %v", getConn(ci.ID).RemainingAmount)
		}
		if getConn(cc.ID).RemainingAmount != 500 {
			t.Fatalf("cable remaining = %v", getConn(cc.ID).RemainingAmount)
		}
		if getConn(cb.ID).RemainingAmount != 1500 {
			t.Fatalf("both remaining = %v", getConn(cb.ID).RemainingAmount)
		}
	})

	// Test 10: multiple subscribers, existing bill for one doesn't block others
	t.Run("Test10_Multiple", func(t *testing.T) {
		a := newConn(company.ID, "A", "internet", 0, 1000, 0)
		b := newConn(company.ID, "B", "internet", 0, 1000, 0)
		// pre-create bill for A
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{a.ID.String()}, ConnectionType: "Internet"}},
			Month:        "February",
			Year:         "2026",
		})
		// now create for both A and B
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{a.ID.String(), b.ID.String()}, ConnectionType: "Internet"}},
			Month:        "February",
			Year:         "2026",
		})
		// A should still have one bill and remaining 1000 (not 2000)
		if getConn(a.ID).RemainingAmount != 1000 {
			t.Fatalf("A remaining = %v, want 1000", getConn(a.ID).RemainingAmount)
		}
		if getConn(b.ID).RemainingAmount != 1000 {
			t.Fatalf("B remaining = %v, want 1000", getConn(b.ID).RemainingAmount)
		}
		if n := countBills(company.ID, a.ID, "February", "2026", "internet"); n != 1 {
			t.Fatalf("A bill count = %d, want 1", n)
		}
		if n := countBills(company.ID, b.ID, "February", "2026", "internet"); n != 1 {
			t.Fatalf("B bill count = %d, want 1", n)
		}
	})

	// Test 11: repeated requests
	t.Run("Test11_Repeated", func(t *testing.T) {
		c := newConn(company.ID, "Repeat", "internet", 0, 1000, 0)
		for i := 0; i < 3; i++ {
			callCreate(company.ID, CreateBillRequest{
				GroupedBills: []BillGroup{{ConnectionIDs: []string{c.ID.String()}, ConnectionType: "Internet"}},
				Month:        "March",
				Year:         "2026",
			})
		}
		if getConn(c.ID).RemainingAmount != 1000 {
			t.Fatalf("remaining = %v, want 1000", getConn(c.ID).RemainingAmount)
		}
		if n := countBills(company.ID, c.ID, "March", "2026", "internet"); n != 1 {
			t.Fatalf("bill count = %d, want 1", n)
		}
	})

	// Test 12: bill with payment records protected
	t.Run("Test12_PaymentProtected", func(t *testing.T) {
		c := newConn(company.ID, "PaidBill", "internet", 0, 1000, 1000)
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{c.ID.String()}, ConnectionType: "Internet"}},
			Month:        "April",
			Year:         "2026",
		})
		// allocate a payment to the invoice
		var inv models.Invoice
		config.DB.Where("subscriber_id = ? AND billing_period = ?", c.ID, "April 2026").First(&inv)
		// create payment linked to invoice
		pay := models.Payment{TenantModel: models.TenantModel{CompanyID: company.ID}, InvoiceID: &inv.ID, SubscriberID: &c.ID, Amount: 500, Method: "cash", PaymentDate: "2026-04-01"}
		config.DB.Create(&pay)
		inv.PaidAmount = 500
		inv.RemainingAmount = 500
		config.DB.Save(&inv)
		adjustConnectionBalance(c.ID, -500)
		before := getConn(c.ID).RemainingAmount
		w := callDelete(company.ID, DeleteBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{c.ID.String()}, ConnectionType: "Internet"}},
			Month:        "April",
			Year:         "2026",
		})
		_ = w
		after := getConn(c.ID).RemainingAmount
		if after != before {
			t.Fatalf("remaining changed from %v to %v, want unchanged", before, after)
		}
		if n := countBills(company.ID, c.ID, "April", "2026", "internet"); n != 1 {
			t.Fatalf("bill should remain, count = %d", n)
		}
	})

	// Test 13: delete and recreate
	t.Run("Test13_DeleteRecreate", func(t *testing.T) {
		c := newConn(company.ID, "DelRec", "internet", 0, 1800, 1100)
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{c.ID.String()}, ConnectionType: "Internet"}},
			Month:        "May",
			Year:         "2026",
		})
		if getConn(c.ID).RemainingAmount != 2900 {
			t.Fatalf("after create remaining = %v", getConn(c.ID).RemainingAmount)
		}
		callDelete(company.ID, DeleteBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{c.ID.String()}, ConnectionType: "Internet"}},
			Month:        "May",
			Year:         "2026",
		})
		if getConn(c.ID).RemainingAmount != 1100 {
			t.Fatalf("after delete remaining = %v", getConn(c.ID).RemainingAmount)
		}
		callCreate(company.ID, CreateBillRequest{
			GroupedBills: []BillGroup{{ConnectionIDs: []string{c.ID.String()}, ConnectionType: "Internet"}},
			Month:        "May",
			Year:         "2026",
		})
		if getConn(c.ID).RemainingAmount != 2900 {
			t.Fatalf("after recreate remaining = %v", getConn(c.ID).RemainingAmount)
		}
		if n := countBills(company.ID, c.ID, "May", "2026", "internet"); n != 1 {
			t.Fatalf("bill count = %d, want 1", n)
		}
	})

	_ = fmt.Sprintf
}