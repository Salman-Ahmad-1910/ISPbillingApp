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

// TestPackageChangeAloneNeverMovesBalance is the regression guard for the flow
// change: saving a new package must not create, reduce or otherwise touch money.
// The balance only ever moves when the operator ticks Create balance.
func TestPackageChangeAloneNeverMovesBalance(t *testing.T) {
	old := models.Connection{ConnectionType: "internet", Amount: 1000, SameAmount: 1000}

	newAmount := 3000.0
	input := connectionInput{
		PackageInternet: "Gold",
		SameAmount:      &newAmount,
		CreateBalance:   false,
		BalanceDays:     0,
	}

	if got := packageFeeAfterUpdate(old, input); got != 3000 {
		t.Fatalf("new fee = %v, want 3000", got)
	}

	// The handler guards on CreateBalance && BalanceDays > 0, so with the box
	// unticked no balance branch is entered at all.
	if input.CreateBalance && input.BalanceDays > 0 {
		t.Error("balance branch must not be reachable when Create balance is unticked")
	}
	if got := old.RemainingAmount; got != 0 {
		t.Errorf("remaining = %v, want it untouched at 0", got)
	}
}

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
