package controllers

// Billing accounting scenarios run through the real HTTP handlers (subscriber
// create/edit, Create Bill, Delete Bills, payments) against the separate test
// database from testdb_test.go. Skipped when TEST_DB_NAME is not set; never
// touches the application database.

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"awesomeProject/config"
	"awesomeProject/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type billingEnv struct {
	t       *testing.T
	router  *gin.Engine
	company uuid.UUID
}

func newBillingEnv(t *testing.T) *billingEnv {
	t.Helper()
	requireTestDB(t)
	gin.SetMode(gin.TestMode)
	company := newTestCompany(t, "BillingFlow")

	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("companyID", company); c.Next() })
	r.POST("/admin/connections", createConnection)
	r.PUT("/admin/connections/:id", updateConnection)
	r.POST("/billing/bills/create", CreateBills)
	r.POST("/billing/bills/delete", DeleteBills)
	r.POST("/billing/payments", CreatePayment)
	r.DELETE("/billing/payments/:id", DeletePayment)

	return &billingEnv{t: t, router: r, company: company}
}

func (e *billingEnv) do(method, path string, body interface{}) (int, map[string]interface{}) {
	e.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	sep := "?"
	if bytes.ContainsRune([]byte(path), '?') {
		sep = "&"
	}
	req := httptest.NewRequest(method, path+sep+"companyId="+e.company.String(), &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	e.router.ServeHTTP(w, req)
	out := map[string]interface{}{}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

// subscriber creates a connection with the given package fees and balance.
func (e *billingEnv) subscriber(name, connType string, cable, internet, remaining float64, area string) uuid.UUID {
	e.t.Helper()
	conn := models.Connection{
		Name: name, ConnectionType: connType,
		Amount: cable, SameAmount: internet,
		RemainingAmount: remaining, Status: "active", SublocalityID: area,
	}
	if cable > 0 {
		conn.PackageCable = "Cable " + fmt.Sprint(cable)
	}
	if internet > 0 {
		conn.PackageInternet = "Internet " + fmt.Sprint(internet)
	}
	conn.CompanyID = e.company
	if err := config.DB.Create(&conn).Error; err != nil {
		e.t.Fatalf("create subscriber: %v", err)
	}
	return conn.ID
}

func (e *billingEnv) remaining(id uuid.UUID) float64 {
	e.t.Helper()
	var conn models.Connection
	if err := config.DB.First(&conn, "id = ?", id).Error; err != nil {
		e.t.Fatalf("load subscriber: %v", err)
	}
	return conn.RemainingAmount
}

func (e *billingEnv) status(id uuid.UUID) string {
	var conn models.Connection
	config.DB.First(&conn, "id = ?", id)
	return conn.PaymentStatus
}

func (e *billingEnv) activeBills(id uuid.UUID, month string) int64 {
	var n int64
	config.DB.Model(&models.BillRecord{}).
		Where("company_id = ? AND connection_id = ? AND month = ? AND year = ? AND status = 'Created'", e.company, id, month, "2026").
		Count(&n)
	return n
}

func (e *billingEnv) createBills(month string, groups map[string][]uuid.UUID) map[string]interface{} {
	e.t.Helper()
	code, out := e.do("POST", "/billing/bills/create", map[string]interface{}{
		"month": month, "year": "2026", "groupedBills": billGroups(groups),
	})
	if code != http.StatusOK {
		e.t.Fatalf("create bills: HTTP %d %v", code, out)
	}
	return out
}

func (e *billingEnv) deleteBills(month string, groups map[string][]uuid.UUID) map[string]interface{} {
	e.t.Helper()
	code, out := e.do("POST", "/billing/bills/delete", map[string]interface{}{
		"month": month, "year": "2026", "groupedBills": billGroups(groups),
	})
	if code != http.StatusOK {
		e.t.Fatalf("delete bills: HTTP %d %v", code, out)
	}
	return out
}

func (e *billingEnv) pay(id uuid.UUID, amount float64) string {
	e.t.Helper()
	code, out := e.do("POST", "/billing/payments", map[string]interface{}{
		"subscriberId": id.String(), "amount": amount, "paymentDate": "2026-11-10", "method": "cash",
	})
	if code != http.StatusCreated {
		e.t.Fatalf("payment: HTTP %d %v", code, out)
	}
	data, _ := out["data"].(map[string]interface{})
	return fmt.Sprint(data["id"])
}

func billGroups(groups map[string][]uuid.UUID) []map[string]interface{} {
	out := []map[string]interface{}{}
	for typ, ids := range groups {
		s := []string{}
		for _, id := range ids {
			s = append(s, id.String())
		}
		out = append(out, map[string]interface{}{"connectionType": typ, "connectionIds": s})
	}
	return out
}

func wantRemaining(t *testing.T, label string, got, want float64) {
	t.Helper()
	if got != want {
		t.Errorf("%s: Remaining = %v, want %v", label, got, want)
	} else {
		t.Logf("%s: Remaining = %v (as expected)", label, got)
	}
}

func TestBillingFlow(t *testing.T) {
	e := newBillingEnv(t)

	// Tests 1-4 and 13 share one subscriber: Basic 1100 -> Premium 1800.
	ahmad := e.subscriber("Ahmad", "internet", 0, 1100, 1100, "")
	internet := func(ids ...uuid.UUID) map[string][]uuid.UUID { return map[string][]uuid.UUID{"Internet": ids} }

	t.Run("01_package_change_keeps_remaining", func(t *testing.T) {
		code, out := e.do("PUT", "/admin/connections/"+ahmad.String(), map[string]interface{}{
			"connectionType": "internet", "packageInternet": "Premium", "sameAmount": 1800,
			"createBalance": false, "balanceDays": 0,
		})
		if code != http.StatusOK {
			t.Fatalf("edit: HTTP %d %v", code, out)
		}
		var conn models.Connection
		config.DB.First(&conn, "id = ?", ahmad)
		if conn.PackageInternet != "Premium" || conn.SameAmount != 1800 {
			t.Errorf("package not updated: %q %v", conn.PackageInternet, conn.SameAmount)
		}
		wantRemaining(t, "after package change", conn.RemainingAmount, 1100)
	})

	t.Run("02_first_bill_adds_new_fee", func(t *testing.T) {
		e.createBills("November", internet(ahmad))
		wantRemaining(t, "after November bill", e.remaining(ahmad), 2900)
		if s := e.status(ahmad); s != "pending" {
			t.Errorf("payment_status = %q, want pending", s)
		}
	})

	t.Run("03_delete_reverses_exact_charge", func(t *testing.T) {
		e.deleteBills("November", internet(ahmad))
		wantRemaining(t, "after deleting November bill", e.remaining(ahmad), 1100)
		if n := e.activeBills(ahmad, "November"); n != 0 {
			t.Errorf("active November bills = %d, want 0", n)
		}
	})

	t.Run("04_recreate_after_delete", func(t *testing.T) {
		e.createBills("November", internet(ahmad))
		wantRemaining(t, "after recreating November bill", e.remaining(ahmad), 2900)
		if n := e.activeBills(ahmad, "November"); n != 1 {
			t.Errorf("active November bills = %d, want exactly 1", n)
		}
	})

	t.Run("05_unpaid_months_accumulate", func(t *testing.T) {
		u := e.subscriber("Usman-acc", "internet", 0, 1100, 1100, "") // October already owed
		config.DB.Model(&models.Connection{}).Where("id = ?", u).Update("same_amount", 1800)
		e.createBills("November", internet(u))
		wantRemaining(t, "November", e.remaining(u), 2900)
		e.createBills("December", internet(u))
		wantRemaining(t, "December", e.remaining(u), 4700)
	})

	t.Run("06_partial_payment", func(t *testing.T) {
		p := e.subscriber("Partial", "internet", 0, 1800, 2900, "")
		e.pay(p, 1000)
		wantRemaining(t, "after paying 1000 of 2900", e.remaining(p), 1900)
		e.pay(p, 900)
		wantRemaining(t, "after paying another 900", e.remaining(p), 1000)
	})

	t.Run("07_full_payment", func(t *testing.T) {
		f := e.subscriber("Full", "internet", 0, 1800, 2900, "")
		e.pay(f, 2900)
		wantRemaining(t, "after paying 2900 of 2900", e.remaining(f), 0)
		if s := e.status(f); s != "" {
			t.Errorf("payment_status = %q, want empty (settled)", s)
		}
	})

	t.Run("08_advance_preserved", func(t *testing.T) {
		a := e.subscriber("Advance", "internet", 0, 1100, -2000, "") // paid 2000 in advance
		code, _ := e.do("PUT", "/admin/connections/"+a.String(), map[string]interface{}{
			"connectionType": "internet", "packageInternet": "Premium", "sameAmount": 1800,
		})
		if code != http.StatusOK {
			t.Fatalf("edit HTTP %d", code)
		}
		wantRemaining(t, "advance after package change", e.remaining(a), -2000)
		e.createBills("November", internet(a))
		wantRemaining(t, "advance after November bill (2000 - 1800)", e.remaining(a), -200)
		if s := e.status(a); s != "advance" {
			t.Errorf("payment_status = %q, want advance", s)
		}
		e.deleteBills("November", internet(a))
		wantRemaining(t, "advance after deleting the bill", e.remaining(a), -2000)
	})

	t.Run("09_subscriber_types", func(t *testing.T) {
		in := e.subscriber("InternetOnly", "internet", 300, 1500, 0, "") // stale cable fee must be ignored
		cb := e.subscriber("CableOnly", "tv_cable", 600, 900, 0, "")     // stale internet fee must be ignored
		both := e.subscriber("Both", "both", 600, 1500, 0, "")
		e.createBills("October", map[string][]uuid.UUID{"Internet": {in}, "Cable": {cb}, "Both": {both}})
		wantRemaining(t, "internet-only", e.remaining(in), 1500)
		wantRemaining(t, "cable-only", e.remaining(cb), 600)
		wantRemaining(t, "both (600 + 1500)", e.remaining(both), 2100)
		// The same subscriber listed under two groups is still billed once.
		e.createBills("September", map[string][]uuid.UUID{"Both": {both}, "Internet": {both}})
		wantRemaining(t, "both listed twice, billed once", e.remaining(both), 4200)
	})

	t.Run("10_existing_bill_skips_only_that_subscriber", func(t *testing.T) {
		a1 := e.subscriber("Area1-A", "internet", 0, 1800, 0, "11111111-1111-1111-1111-111111111111")
		b1 := e.subscriber("Area1-B", "internet", 0, 1500, 0, "11111111-1111-1111-1111-111111111111")
		c2 := e.subscriber("Area2-C", "internet", 0, 2000, 0, "22222222-2222-2222-2222-222222222222")
		e.createBills("August", internet(b1)) // Bilal already billed
		wantRemaining(t, "Bilal first bill", e.remaining(b1), 1500)
		out := e.createBills("August", internet(a1, b1, c2))
		wantRemaining(t, "Ahmad billed", e.remaining(a1), 1800)
		wantRemaining(t, "Bilal skipped (not charged twice)", e.remaining(b1), 1500)
		wantRemaining(t, "Usman billed", e.remaining(c2), 2000)
		if out["count"].(float64) != 2 || out["skipped"].(float64) != 1 {
			t.Errorf("response count/skipped = %v/%v, want 2/1", out["count"], out["skipped"])
		}
	})

	t.Run("11_repeated_and_concurrent_requests", func(t *testing.T) {
		r := e.subscriber("Repeat", "internet", 0, 1800, 1100, "")
		for i := 0; i < 3; i++ {
			e.createBills("July", internet(r))
		}
		var wg sync.WaitGroup
		for i := 0; i < 8; i++ {
			wg.Add(1)
			go func() { defer wg.Done(); e.createBills("July", internet(r)) }()
		}
		wg.Wait()
		wantRemaining(t, "after 11 Create Bill requests", e.remaining(r), 2900)
		if n := e.activeBills(r, "July"); n != 1 {
			t.Errorf("active July bills = %d, want 1", n)
		}
	})

	t.Run("12_bill_with_payment_is_protected", func(t *testing.T) {
		p := e.subscriber("PaidBill", "internet", 0, 1800, 0, "")
		e.createBills("June", internet(p))
		e.pay(p, 1000) // allocated to the June invoice
		wantRemaining(t, "after bill and payment", e.remaining(p), 800)
		out := e.deleteBills("June", internet(p))
		wantRemaining(t, "delete refused, balance unchanged", e.remaining(p), 800)
		if n := e.activeBills(p, "June"); n != 1 {
			t.Errorf("active June bills = %d, want 1 (kept)", n)
		}
		if out["skipped"] != float64(1) {
			t.Errorf("delete response skipped = %v, want 1 (bill kept)", out["skipped"])
		}
		var payments int64
		config.DB.Model(&models.Payment{}).Where("subscriber_id = ?", p).Count(&payments)
		if payments != 1 {
			t.Errorf("payments = %d, want 1 (history kept)", payments)
		}
	})

	t.Run("13_delete_and_recreate_keeps_old_dues", func(t *testing.T) {
		d := e.subscriber("Dues", "internet", 0, 1800, 1100, "") // 1100 old dues
		e.createBills("May", internet(d))
		wantRemaining(t, "after create", e.remaining(d), 2900)
		e.deleteBills("May", internet(d))
		wantRemaining(t, "after delete (old dues intact)", e.remaining(d), 1100)
		e.deleteBills("May", internet(d)) // second delete must not reverse again
		wantRemaining(t, "after a second delete", e.remaining(d), 1100)
		e.createBills("May", internet(d))
		wantRemaining(t, "after recreate", e.remaining(d), 2900)
		if n := e.activeBills(d, "May"); n != 1 {
			t.Errorf("active May bills = %d, want 1", n)
		}
		// Deleting reverses the amount the bill charged, not the current fee.
		config.DB.Model(&models.Connection{}).Where("id = ?", d).Update("same_amount", 2500)
		e.deleteBills("May", internet(d))
		wantRemaining(t, "delete after a later fee change reverses 1800, not 2500", e.remaining(d), 1100)
	})

	t.Run("extra_deleting_a_payment_restores_balance", func(t *testing.T) {
		p := e.subscriber("PayDel", "internet", 0, 1800, 2900, "")
		id := e.pay(p, 1000)
		wantRemaining(t, "after payment", e.remaining(p), 1900)
		if code, _ := e.do("DELETE", "/billing/payments/"+id, nil); code != http.StatusOK {
			t.Fatalf("delete payment HTTP %d", code)
		}
		wantRemaining(t, "after deleting the payment", e.remaining(p), 2900)
	})

}

// legacyGroupRecord inserts a bill record the way the previous Bill Creator
// saved it: one row per group, connection_id = nil, the billed subscribers'
// names joined with ", " in connection_name, subscriber_ids empty.
func (e *billingEnv) legacyGroupRecord(month, typeLabel, area string, names ...string) {
	e.t.Helper()
	rec := models.BillRecord{
		ConnectionID: uuid.Nil, ConnectionType: typeLabel, Month: month, Year: "2026",
		Amount: 0, RemainingAmount: 0, Status: "Created", BillDate: "2026-11-01", Sublocality: area,
	}
	for i, n := range names {
		if i > 0 {
			rec.ConnectionName += ", "
		}
		rec.ConnectionName += n
	}
	rec.CompanyID = e.company
	if err := config.DB.Create(&rec).Error; err != nil {
		e.t.Fatalf("legacy record: %v", err)
	}
}

func (e *billingEnv) legacyRecords(month string) int64 {
	var n int64
	config.DB.Model(&models.BillRecord{}).
		Where("company_id = ? AND connection_id = ? AND month = ? AND status = 'Created'", e.company, uuid.Nil, month).Count(&n)
	return n
}

// Fix 1: one subscriber with a bad area must not stop the others.
func TestBillingInvalidAreaDoesNotBlockOthers(t *testing.T) {
	e := newBillingEnv(t)
	good1 := e.subscriber("Good-1", "internet", 0, 1800, 1100, "")
	bad := e.subscriber("BadArea", "internet", 0, 1500, 500, "Mingora Bazar") // area name, not an id
	good2 := e.subscriber("Good-2", "tv_cable", 700, 0, 0, "33333333-3333-3333-3333-333333333333")
	out := e.createBills("November", map[string][]uuid.UUID{"Internet": {good1, bad}, "Cable": {good2}})

	wantRemaining(t, "good subscriber 1 billed", e.remaining(good1), 2900)
	wantRemaining(t, "good subscriber 2 billed", e.remaining(good2), 700)
	wantRemaining(t, "bad-area subscriber untouched", e.remaining(bad), 500)
	if n := e.activeBills(bad, "November"); n != 0 {
		t.Errorf("bad-area subscriber has %d bill(s), want 0 (no partial bill)", n)
	}
	var inv int64
	config.DB.Model(&models.Invoice{}).Where("subscriber_id = ?", bad).Count(&inv)
	if inv != 0 {
		t.Errorf("bad-area subscriber has %d invoice(s), want 0", inv)
	}
	if out["count"] != float64(2) || out["failed"] != float64(1) {
		t.Errorf("response count/failed = %v/%v, want 2/1", out["count"], out["failed"])
	}
	fails, _ := out["failures"].([]interface{})
	if len(fails) != 1 || fails[0].(map[string]interface{})["subscriberId"] != bad.String() {
		t.Errorf("failures = %v, want the bad-area subscriber", out["failures"])
	} else {
		t.Logf("reported failure: %v", fails[0])
	}

	// After fixing the area, billing again charges only that subscriber.
	config.DB.Model(&models.Connection{}).Where("id = ?", bad).Update("sublocality_id", "")
	e.createBills("November", map[string][]uuid.UUID{"Internet": {good1, bad}, "Cable": {good2}})
	wantRemaining(t, "fixed subscriber billed on retry", e.remaining(bad), 2000)
	wantRemaining(t, "good subscriber 1 not charged twice", e.remaining(good1), 2900)
	wantRemaining(t, "good subscriber 2 not charged twice", e.remaining(good2), 700)
}

// Fix 2: subscribers listed in an old grouped November record are not
// charged again; subscribers not listed are billed normally.
func TestBillingOldGroupedRecord(t *testing.T) {
	e := newBillingEnv(t)
	// November was billed by the old version: Ali and "Khan, Sons" (a name
	// containing a comma) were in the grouped Internet record and already
	// carry November's charge in their balance.
	ali := e.subscriber("Ali", "internet", 0, 1800, 2900, "")
	khan := e.subscriber("Khan, Sons", "internet", 0, 1000, 1000, "")
	zara := e.subscriber("Zara", "internet", 0, 1500, 0, "") // joined after the grouped run
	ali2 := e.subscriber("Ali Raza", "internet", 0, 1200, 0, "") // name contains "Ali" but is not "Ali"
	cable := e.subscriber("Bilal", "tv_cable", 600, 0, 600, "")
	e.legacyGroupRecord("November", "internet", "All", "Ali", "Khan, Sons", "Usman")
	e.legacyGroupRecord("November", "tv_cable", "All", "Bilal")

	out := e.createBills("November", map[string][]uuid.UUID{"Internet": {ali, khan, zara, ali2}, "Cable": {cable}})
	wantRemaining(t, "Ali in old grouped record: not charged again", e.remaining(ali), 2900)
	wantRemaining(t, "Khan, Sons in old grouped record: not charged again", e.remaining(khan), 1000)
	wantRemaining(t, "Bilal in old cable record: not charged again", e.remaining(cable), 600)
	wantRemaining(t, "Zara not in the record: billed", e.remaining(zara), 1500)
	wantRemaining(t, "Ali Raza not in the record: billed", e.remaining(ali2), 1200)
	if out["skippedGrouped"] != float64(3) || out["count"] != float64(2) {
		t.Errorf("response count/skippedGrouped = %v/%v, want 2/3", out["count"], out["skippedGrouped"])
	}

	// Delete keeps the historical grouped records and reverses nothing for
	// their subscribers; only Zara's and Ali Raza's new bills are reversed.
	del := e.deleteBills("November", map[string][]uuid.UUID{"Internet": {ali, khan, zara, ali2}, "Cable": {cable}})
	t.Logf("delete response: %v", del)
	if n := e.legacyRecords("November"); n != 2 {
		t.Errorf("old grouped records = %d, want 2 (kept)", n)
	}
	wantRemaining(t, "Ali unchanged by delete", e.remaining(ali), 2900)
	wantRemaining(t, "Zara reversed", e.remaining(zara), 0)

	// Creating again still never charges the grouped subscribers.
	e.createBills("November", map[string][]uuid.UUID{"Internet": {ali, khan, zara, ali2}, "Cable": {cable}})
	wantRemaining(t, "Ali still not charged twice", e.remaining(ali), 2900)
	wantRemaining(t, "Zara billed once again", e.remaining(zara), 1500)

	// Other months are unaffected by the November grouped record.
	e.createBills("December", map[string][]uuid.UUID{"Internet": {ali}})
	wantRemaining(t, "Ali billed for December", e.remaining(ali), 4700)
}

// Fix 3: editing a subscriber created with "Create balance" never adds the
// balance again; an explicit request during an edit adds it once.
func TestBillingCreateBalanceOnEdit(t *testing.T) {
	e := newBillingEnv(t)

	// New subscriber with Create balance: 1500 / 30 * 10 = 500.
	code, out := e.do("POST", "/admin/connections", map[string]interface{}{
		"internetId": "TB-" + uuid.NewString()[:8], "name": "NewWithBalance", "connectionType": "internet",
		"packageInternet": "Premium", "sameAmount": 1500, "status": "active",
		"createBalance": true, "balanceDays": 10,
	})
	if code != http.StatusCreated && code != http.StatusOK {
		t.Fatalf("create subscriber: HTTP %d %v", code, out)
	}
	var created models.Connection
	config.DB.Where("company_id = ? AND name = ?", e.company, "NewWithBalance").First(&created)
	wantRemaining(t, "new subscriber gets Create balance", created.RemainingAmount, 500)

	// What the edit forms send on a normal save: everything, including the
	// stored createBalance=true and balanceDays=10.
	formSave := func(changes map[string]interface{}) {
		body := map[string]interface{}{
			"internetId": created.InternetID, "name": "NewWithBalance", "connectionType": "internet",
			"packageInternet": "Premium", "sameAmount": 1500, "status": "active",
			"createBalance": true, "balanceDays": 10,
		}
		for k, v := range changes {
			body[k] = v
		}
		if code, out := e.do("PUT", "/admin/connections/"+created.ID.String(), body); code != http.StatusOK {
			t.Fatalf("edit: HTTP %d %v", code, out)
		}
	}
	formSave(map[string]interface{}{"mobile": "03001234567"})
	formSave(map[string]interface{}{"name": "New With Balance", "address": "Saidu Sharif"})
	formSave(map[string]interface{}{"packageInternet": "Gold", "sameAmount": 2400})
	formSave(map[string]interface{}{"cell": "03111111111"})
	wantRemaining(t, "after 4 edits (phone, name/address, package, cell)", e.remaining(created.ID), 500)

	var conn models.Connection
	config.DB.First(&conn, "id = ?", created.ID)
	if !conn.CreateBalance || conn.BalanceDays != 10 {
		t.Errorf("stored create_balance/balance_days = %v/%v, want true/10 (kept from creation)", conn.CreateBalance, conn.BalanceDays)
	}
	var logs int64
	config.DB.Model(&models.ConnectionLog{}).Where("connection_id = ? AND action_type = ?", created.ID, "Balance Created").Count(&logs)
	if logs != 0 {
		t.Errorf("%d 'Balance Created' log entries from plain edits, want 0", logs)
	}

	// The operator deliberately ticks Create balance during an edit: added once
	// on top of the existing balance (new fee 2400 / 30 * 5 = 400).
	formSave(map[string]interface{}{"sameAmount": 2400, "packageInternet": "Gold", "balanceDays": 5, "applyBalance": true})
	wantRemaining(t, "explicit Create balance during an edit", e.remaining(created.ID), 900)
	formSave(map[string]interface{}{"sameAmount": 2400, "packageInternet": "Gold", "balanceDays": 5})
	wantRemaining(t, "saving again afterwards adds nothing", e.remaining(created.ID), 900)

	// An advance is preserved through edits too.
	adv := e.subscriber("AdvanceEdit", "internet", 0, 1100, -1500, "")
	config.DB.Model(&models.Connection{}).Where("id = ?", adv).Updates(map[string]interface{}{"create_balance": true, "balance_days": 15})
	e.do("PUT", "/admin/connections/"+adv.String(), map[string]interface{}{
		"connectionType": "internet", "packageInternet": "Premium", "sameAmount": 1800, "createBalance": true, "balanceDays": 15,
	})
	wantRemaining(t, "advance kept through package edit", e.remaining(adv), -1500)
}

// Simultaneous Create Bill requests for many subscribers: each charged once.
func TestBillingSimultaneousCreateBill(t *testing.T) {
	e := newBillingEnv(t)
	ids := []uuid.UUID{}
	for i := 0; i < 12; i++ {
		ids = append(ids, e.subscriber(fmt.Sprintf("Par-%02d", i), "internet", 0, 1000, float64(i*100), ""))
	}
	var wg sync.WaitGroup
	for r := 0; r < 10; r++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			e.createBills("October", map[string][]uuid.UUID{"Internet": ids})
		}()
	}
	wg.Wait()
	for i, id := range ids {
		if got, want := e.remaining(id), float64(i*100)+1000; got != want {
			t.Errorf("subscriber %d: Remaining = %v, want %v", i, got, want)
		}
		if n := e.activeBills(id, "October"); n != 1 {
			t.Errorf("subscriber %d: %d October bills, want 1", i, n)
		}
	}
	t.Logf("10 simultaneous requests x 12 subscribers: every subscriber billed exactly once")
}
