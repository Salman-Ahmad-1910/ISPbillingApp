package controllers

import (
	"testing"

	"awesomeProject/models"
)

// manualBalanceFor mirrors what updateConnection does when the operator ticks
// "Create balance" and enters a number of days: the new package fee prorated
// over a 30 day month, for the days the operator chose.
func manualBalanceFor(fee float64, days int) float64 {
	if fee <= 0 || days <= 0 {
		return 0
	}
	return roundToTwo(fee / 30 * float64(days))
}

func TestMonthlyPackageFee(t *testing.T) {
	cases := []struct {
		connectionType string
		amount         float64
		sameAmount     float64
		want           float64
	}{
		{"tv_cable", 1000, 0, 1000},
		{"internet", 1000, 700, 700},
		{"both", 1000, 700, 1700},
		{"", 1000, 700, 1000},
	}

	for _, c := range cases {
		if got := monthlyPackageFee(c.connectionType, c.amount, c.sameAmount); got != c.want {
			t.Errorf("monthlyPackageFee(%q, %v, %v) = %v, want %v", c.connectionType, c.amount, c.sameAmount, got, c.want)
		}
	}
}

func TestPackageFeeAfterUpdate(t *testing.T) {
	old := models.Connection{ConnectionType: "both", Amount: 1000, SameAmount: 500}

	// An omitted fee keeps the stored value, so the manual balance is never
	// calculated against a field the update did not actually change.
	newAmount := 3000.0
	got := packageFeeAfterUpdate(old, connectionInput{Amount: &newAmount})
	if got != 3500 {
		t.Errorf("with only amount set = %v, want 3500", got)
	}

	// An explicit zero is honoured, which is what a downgrade to a free package
	// sends, and must not fall back to the stored fee.
	zero := 0.0
	got = packageFeeAfterUpdate(old, connectionInput{SameAmount: &zero})
	if got != 1000 {
		t.Errorf("with only sameAmount=0 = %v, want 1000", got)
	}

	if got = packageFeeAfterUpdate(old, connectionInput{}); got != 1500 {
		t.Errorf("with nothing set = %v, want the stored 1500", got)
	}
}

func TestValueOrZeroTreatsOmittedFeeAsZero(t *testing.T) {
	if got := valueOrZero(nil); got != 0 {
		t.Errorf("valueOrZero(nil) = %v, want 0", got)
	}
	amount := 1500.0
	if got := valueOrZero(&amount); got != 1500 {
		t.Errorf("valueOrZero(1500) = %v, want 1500", got)
	}
	zero := 0.0
	if got := valueOrZero(&zero); got != 0 {
		t.Errorf("valueOrZero(0) = %v, want 0", got)
	}
}

// TestManualBalanceUsesNewPackageFee covers the mid-month upgrade: the operator
// picks the days, and the amount is the NEW package fee, not the old one.
func TestManualBalanceUsesNewPackageFee(t *testing.T) {
	cases := []struct {
		name string
		fee  float64
		days int
		want float64
	}{
		{"half a month of a 1000 package", 1000, 15, 500},
		{"full month of a 1000 package", 1000, 30, 1000},
		{"upgraded 3000 package, half month", 3000, 15, 1500},
		{"upgraded 1500 package, ten days", 1500, 10, 500},
		{"zero days creates nothing", 3000, 0, 0},
		{"free package creates nothing", 0, 15, 0},
	}

	for _, c := range cases {
		if got := manualBalanceFor(c.fee, c.days); got != c.want {
			t.Errorf("%s: balance = %v, want %v", c.name, got, c.want)
		}
	}
}

// TestManualBalanceAddsToExistingBalance pins the accumulate rule: a subscriber
// who already owes money keeps owing it and the manual amount is added on top.
func TestManualBalanceAddsToExistingBalance(t *testing.T) {
	cases := []struct {
		name     string
		existing float64
		fee      float64
		days     int
		want     float64
	}{
		{"settled subscriber", 0, 3000, 15, 1500},
		{"existing dues are preserved", 300, 1000, 15, 800},
		{"existing advance is drawn down", -500, 1000, 15, 0},
		{"an advance larger than the manual amount survives", -2000, 1000, 15, -1500},
	}

	for _, c := range cases {
		got := roundToTwo(c.existing + manualBalanceFor(c.fee, c.days))
		if got != c.want {
			t.Errorf("%s: balance = %v, want %v", c.name, got, c.want)
		}
	}
}

// TestPackageChangeSetsBalanceToNewFee covers the rule the operator asked for:
// a package change makes the remaining balance equal the new package fee, so
// moving a 1000 package to 1500 leaves 1500 outstanding rather than 1000.
func TestPackageChangeSetsBalanceToNewFee(t *testing.T) {
	cases := []struct {
		name        string
		old         models.Connection
		input       connectionInput
		wantFee     float64
		wantChanged bool
	}{
		{
			name:        "1000 upgraded to 1500",
			old:         models.Connection{ConnectionType: "internet", PackageInternet: "Basic", Amount: 1000, SameAmount: 1000},
			input:       connectionInput{PackageInternet: "Plus", SameAmount: ptr(1500.0)},
			wantFee:     1500,
			wantChanged: true,
		},
		{
			name:        "cable package raised from 1000 to 1500",
			old:         models.Connection{ConnectionType: "cable", PackageCable: "Basic", Amount: 1000},
			input:       connectionInput{PackageCable: "Plus", Amount: ptr(1500.0)},
			wantFee:     1500,
			wantChanged: true,
		},
		{
			name:        "both package fee is the sum",
			old:         models.Connection{ConnectionType: "both", PackageCable: "A", PackageInternet: "B", Amount: 1000, SameAmount: 500},
			input:       connectionInput{Amount: ptr(1200.0), SameAmount: ptr(700.0)},
			wantFee:     1900,
			wantChanged: true,
		},
		{
			name:        "reshuffling cable and internet at the same total is not a change",
			old:         models.Connection{ConnectionType: "both", PackageCable: "A", PackageInternet: "B", Amount: 1000, SameAmount: 500},
			input:       connectionInput{Amount: ptr(1200.0), SameAmount: ptr(300.0)},
			wantFee:     1500,
			wantChanged: false,
		},
		{
			name:        "renaming the package at the same fee still counts as a change",
			old:         models.Connection{ConnectionType: "internet", PackageInternet: "Basic", Amount: 1000, SameAmount: 1000},
			input:       connectionInput{PackageInternet: "Basic Plus"},
			wantFee:     1000,
			wantChanged: true,
		},
		{
			name:        "saving other fields leaves the package alone",
			old:         models.Connection{ConnectionType: "internet", PackageInternet: "Basic", Amount: 1000, SameAmount: 1000},
			input:       connectionInput{Status: "active"},
			wantFee:     1000,
			wantChanged: false,
		},
		{
			name:        "resaving the identical package is not a change",
			old:         models.Connection{ConnectionType: "internet", PackageInternet: "Basic", Amount: 1000, SameAmount: 1000},
			input:       connectionInput{PackageInternet: "Basic", SameAmount: ptr(1000.0)},
			wantFee:     1000,
			wantChanged: false,
		},
	}

	for _, c := range cases {
		fee, changed := packageUpdateBalance(c.old, c.input)
		if fee != c.wantFee {
			t.Errorf("%s: fee = %v, want %v", c.name, fee, c.wantFee)
		}
		if changed != c.wantChanged {
			t.Errorf("%s: changed = %v, want %v", c.name, changed, c.wantChanged)
		}
	}
}

// TestManualBalanceAccumulatesOntoPackageFee covers the two rules combined: a
// package change sets the balance to the new fee, and an operator-created
// balance for the days then lands on top of it.
func TestManualBalanceAccumulatesOntoPackageFee(t *testing.T) {
	old := models.Connection{
		ConnectionType: "internet", PackageInternet: "Basic",
		Amount: 1000, SameAmount: 1000, RemainingAmount: 1000,
	}

	fee, changed := packageUpdateBalance(old, connectionInput{
		PackageInternet: "Plus", SameAmount: ptr(1500.0),
	})
	if !changed {
		t.Fatal("package must be reported as changed")
	}

	staged := fee
	manual := roundToTwo(fee / 30 * 15)
	got := roundToTwo(staged + manual)

	if got != 2250 {
		t.Errorf("balance = %v, want 2250", got)
	}
}

func ptr(f float64) *float64 { return &f }

// TestManualBalanceResyncsStatus covers the status flag written alongside a
// manual balance, so the pending and advance pages reflect what is owed.
func TestManualBalanceResyncsStatus(t *testing.T) {
	cases := []struct {
		name     string
		existing float64
		fee      float64
		days     int
		want     float64
		status   string
	}{
		{"creates dues", 0, 3000, 15, 1500, "pending"},
		{"dues are added on top", 300, 1000, 15, 800, "pending"},
		{"a full month adds the whole fee", 300, 1000, 30, 1300, "pending"},
		{"an advance is consumed exactly", -500, 1000, 15, 0, ""},
		{"an advance is drawn down partially", -500, 1000, 10, -166.67, "advance"},
		{"an advance larger than the amount survives", -2000, 1000, 15, -1500, "advance"},
	}

	for _, c := range cases {
		balance := roundToTwo(c.existing + manualBalanceFor(c.fee, c.days))
		if balance != c.want {
			t.Errorf("%s: balance = %v, want %v", c.name, balance, c.want)
			continue
		}
		if got := paymentStatusForBalance(balance); got != c.status {
			t.Errorf("%s: status = %q, want %q", c.name, got, c.status)
		}
	}
}

func TestPaymentStatusForBalance(t *testing.T) {
	cases := []struct {
		remaining float64
		want      string
	}{
		{1500, "pending"},
		{0.01, "pending"},
		{0, ""},
		{-0.01, "advance"},
		{-354.84, "advance"},
	}

	for _, c := range cases {
		if got := paymentStatusForBalance(c.remaining); got != c.want {
			t.Errorf("paymentStatusForBalance(%v) = %q, want %q", c.remaining, got, c.want)
		}
	}
}

// TestManualBalanceAvoidsRoundingResidue keeps the calculation deterministic.
func TestManualBalanceAvoidsRoundingResidue(t *testing.T) {
	first := manualBalanceFor(1000, 15)
	second := manualBalanceFor(1000, 15)
	if first != second {
		t.Errorf("balance = %v then %v, want identical results", first, second)
	}
	if got := manualBalanceFor(999.99, 7); got != 233.33 {
		t.Errorf("balance = %v, want 233.33", got)
	}
}
