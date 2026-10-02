package controllers

import (
	"testing"
	"time"

	"awesomeProject/models"
)

func date(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 12, 0, 0, 0, time.UTC)
}

func TestMonthlyPackageFee(t *testing.T) {
	cases := []struct {
		connectionType string
		amount         float64
		sameAmount     float64
		want           float64
	}{
		{"tv_cable", 1000, 600, 1000},
		{"internet", 1000, 600, 600},
		{"both", 1000, 600, 1600},
		{"", 1000, 600, 1000},
		{"unexpected", 1000, 600, 1000},
	}

	for _, c := range cases {
		if got := monthlyPackageFee(c.connectionType, c.amount, c.sameAmount); got != c.want {
			t.Errorf("monthlyPackageFee(%q, %v, %v) = %v, want %v", c.connectionType, c.amount, c.sameAmount, got, c.want)
		}
	}
}

// TestPackageProrationOnFirstOfMonthChargesFullDifference covers a package change
// made on the 1st after the month has already been billed and paid: the whole
// month still carries the new rate, so the entire difference is applied. An
// upgrade returns the subscriber to the pending list, a downgrade moves them to
// the advance list.
func TestPackageProrationOnFirstOfMonthChargesFullDifference(t *testing.T) {
	cases := []struct {
		name       string
		oldFee     float64
		newFee     float64
		wantDelta  float64
		wantStatus string
	}{
		{"upgrade on paid account", 1000, 1500, 500, "pending"},
		{"downgrade on paid account", 1500, 1000, -500, "advance"},
	}

	for _, c := range cases {
		delta, applied := packageProration(date(2026, time.October, 1), c.oldFee, c.newFee)
		if !applied {
			t.Errorf("%s: expected an adjustment to apply", c.name)
			continue
		}
		if delta != c.wantDelta {
			t.Errorf("%s: delta = %v, want %v", c.name, delta, c.wantDelta)
		}

		// Paid in full at the old rate, so the balance starts at zero.
		newBalance := roundToTwo(0 + delta)
		if got := paymentStatusForBalance(newBalance); got != c.wantStatus {
			t.Errorf("%s: status = %q, want %q", c.name, got, c.wantStatus)
		}
	}
}

func TestPackageProrationSkipsWhenFeeUnchanged(t *testing.T) {
	if _, applied := packageProration(date(2026, time.August, 10), 1000, 1000); applied {
		t.Error("unchanged fee must not prorate")
	}
}

func TestPackageProrationMidMonth(t *testing.T) {
	cases := []struct {
		name      string
		effective time.Time
		oldFee    float64
		newFee    float64
		wantDelta float64
	}{
		{"upgrade 1000 to 1500 on 31 day month", date(2026, time.August, 10), 1000, 1500, 354.84},
		{"downgrade 1500 to 1000 on 31 day month", date(2026, time.August, 10), 1500, 1000, -354.84},
		{"upgrade on 30 day month", date(2026, time.April, 10), 1000, 1500, 350.00},
		{"upgrade on 28 day february", date(2027, time.February, 10), 1000, 1500, 339.29},
		{"upgrade on 29 day february", date(2028, time.February, 10), 1000, 1500, 344.83},
		{"upgrade on last day of month", date(2026, time.August, 31), 1000, 1500, 16.13},
		{"upgrade on 2nd keeps almost whole month", date(2026, time.August, 2), 1000, 1500, 483.87},
		{"downgrade to free", date(2026, time.August, 10), 1000, 0, -709.68},
	}

	for _, c := range cases {
		delta, applied := packageProration(c.effective, c.oldFee, c.newFee)
		if !applied {
			t.Errorf("%s: expected an adjustment to apply", c.name)
			continue
		}
		if delta != c.wantDelta {
			t.Errorf("%s: delta = %v, want %v", c.name, delta, c.wantDelta)
		}
	}
}

// TestPackageProrationMatchesCorrectMonth pins the adjustment to the number a
// subscriber should actually be charged: prorated old rate for the days used,
// new rate for the days left, minus the old fee that was already billed.
func TestPackageProrationMatchesCorrectMonth(t *testing.T) {
	effective := date(2026, time.August, 10)
	daysInMonth := 31
	daysUsed := effective.Day() - 1
	daysRemaining := daysInMonth - effective.Day() + 1

	cases := []struct {
		name   string
		oldFee float64
		newFee float64
	}{
		{"upgrade", 1000, 1500},
		{"downgrade", 1500, 1000},
	}

	for _, c := range cases {
		delta, applied := packageProration(effective, c.oldFee, c.newFee)
		if !applied {
			t.Errorf("%s: expected an adjustment to apply", c.name)
			continue
		}

		correctMonth := roundToTwo(c.oldFee*float64(daysUsed)/float64(daysInMonth) +
			c.newFee*float64(daysRemaining)/float64(daysInMonth))

		if got := roundToTwo(c.oldFee + delta); got != correctMonth {
			t.Errorf("%s: already billed %v plus delta %v = %v, want correct month %v",
				c.name, c.oldFee, delta, got, correctMonth)
		}
	}
}

func TestPackageProrationRoundsToZeroOnFinalDay(t *testing.T) {
	// A one-cent difference on the last day of a 28 day month prorates to a
	// fraction of a cent. It must land on a clean zero instead of noise.
	delta, applied := packageProration(date(2027, time.February, 28), 1000, 1000.01)
	if !applied {
		t.Fatal("expected an adjustment to apply")
	}
	if delta != 0 {
		t.Errorf("delta = %v, want 0", delta)
	}
}

func TestPackageProrationKeepsGenuineCentDifferences(t *testing.T) {
	// A real one-cent fee change must still be collected rather than dropped.
	delta, applied := packageProration(date(2026, time.August, 15), 1000, 1000.01)
	if !applied {
		t.Fatal("expected an adjustment to apply")
	}
	if delta != 0.01 {
		t.Errorf("delta = %v, want 0.01", delta)
	}
}

func ptr(v float64) *float64 { return &v }

func TestPackageFeeAfterUpdate(t *testing.T) {
	cable := models.Connection{ConnectionType: "tv_cable", Amount: 1000}
	internet := models.Connection{ConnectionType: "internet", Amount: 1000, SameAmount: 600}
	both := models.Connection{ConnectionType: "both", Amount: 1000, SameAmount: 600}

	cases := []struct {
		name  string
		old   models.Connection
		input connectionInput
		want  float64
	}{
		{"cable fee raised", cable, connectionInput{Amount: ptr(1500)}, 1500},
		{"omitted fee keeps previous value", cable, connectionInput{}, 1000},
		{"explicit zero fee is honoured", cable, connectionInput{Amount: ptr(0)}, 0},
		{"cable untouched", cable, connectionInput{Name: "Ali"}, 1000},
		{"internet fee raised", internet, connectionInput{SameAmount: ptr(800)}, 800},
		{"internet ignores cable amount", internet, connectionInput{Amount: ptr(1500)}, 600},
		{"both components raised", both, connectionInput{Amount: ptr(1500), SameAmount: ptr(800)}, 2300},
		{"both with only cable raised", both, connectionInput{Amount: ptr(1500)}, 2100},
		{"both with only internet raised", both, connectionInput{SameAmount: ptr(800)}, 1800},
		{"switching to internet keeps old cable amount", cable, connectionInput{ConnectionType: "internet"}, 0},
	}

	for _, c := range cases {
		if got := packageFeeAfterUpdate(c.old, c.input); got != c.want {
			t.Errorf("%s: packageFeeAfterUpdate = %v, want %v", c.name, got, c.want)
		}
	}
}

// TestDowngradeToFreePackageCreatesAdvance covers a subscriber moving to a
// fully discounted (zero fee) package: the refund must reach the balance and
// move them to the advance list.
func TestDowngradeToFreePackageCreatesAdvance(t *testing.T) {
	old := models.Connection{ConnectionType: "tv_cable", Amount: 1000}
	paidInFull := models.Connection{ConnectionType: "tv_cable", Amount: 1000, RemainingAmount: 0}

	input := connectionInput{Amount: ptr(0), Discount: "full_free"}

	delta, applied := packageProration(date(2026, time.October, 1), monthlyPackageFee(old.ConnectionType, old.Amount, old.SameAmount), packageFeeAfterUpdate(old, input))
	if !applied {
		t.Fatal("expected an adjustment to apply")
	}
	if delta != -1000 {
		t.Errorf("delta = %v, want -1000", delta)
	}

	newBalance := roundToTwo(paidInFull.RemainingAmount + delta)
	if got := paymentStatusForBalance(newBalance); got != "advance" {
		t.Errorf("status = %q, want advance", got)
	}
}

// TestResavingSamePackageIsNotChargedTwice guards the main idempotency risk:
// once the new fee is stored, saving the same form again must not prorate a
// second time.
func TestResavingSamePackageIsNotChargedTwice(t *testing.T) {
	old := models.Connection{ConnectionType: "tv_cable", Amount: 1500}
	input := connectionInput{Amount: ptr(1500), PackageCable: "New Package"}

	if delta, applied := packageProration(date(2026, time.August, 10), packageFeeAfterUpdate(old, input), packageFeeAfterUpdate(old, input)); applied {
		t.Errorf("re-saving the same fee must not adjust the balance, got %v", delta)
	}
}

// TestRenamingPackageWithoutPriceChangeIsFree makes sure an admin editing only
// the package name never moves the subscriber's balance.
func TestRenamingPackageWithoutPriceChangeIsFree(t *testing.T) {
	old := models.Connection{ConnectionType: "tv_cable", Amount: 1000}
	input := connectionInput{PackageCable: "Renamed Package"}

	oldFee := monthlyPackageFee(old.ConnectionType, old.Amount, old.SameAmount)
	if delta, applied := packageProration(date(2026, time.August, 10), oldFee, packageFeeAfterUpdate(old, input)); applied {
		t.Errorf("renaming a package must not adjust the balance, got %v", delta)
	}
}

// TestUpgradeBecomesPendingEvenWithExistingAdvance pins the direction rule: an
// upgrade always leaves dues for the subscriber, so a pre-existing advance is
// replaced by the prorated difference rather than silently absorbing it. Without
// this the subscriber stayed on the advance page and the upgrade vanished into
// the old credit.
// TestUpgradeNetsIntoRunningBalance pins the upgrade side of the running
// balance rule. An upgrade is a credit against a balance the subscriber already
// holds, so it consumes an advance rather than wiping it, and only produces dues
// once it overshoots into positive territory.
func TestUpgradeNetsIntoRunningBalance(t *testing.T) {
	delta, applied := packageProration(date(2026, time.October, 1), 1000, 3000)
	if !applied {
		t.Fatal("expected an adjustment to apply")
	}
	if delta != 2000 {
		t.Fatalf("delta = %v, want 2000", delta)
	}

	cases := []struct {
		name        string
		starting    float64
		wantBalance float64
		wantStatus  string
	}{
		{"settled subscriber becomes pending", 0, 2000, "pending"},
		{"small advance is consumed into dues", -500, 1500, "pending"},
		{"advance is drawn down but still held", -4000, -2000, "advance"},
	}

	for _, c := range cases {
		newBalance := roundToTwo(c.starting + delta)
		if newBalance != c.wantBalance {
			t.Errorf("%s: balance = %v, want %v", c.name, newBalance, c.wantBalance)
		}
		if got := paymentStatusForBalance(newBalance); got != c.wantStatus {
			t.Errorf("%s: status = %q, want %q", c.name, got, c.wantStatus)
		}
	}
}

// TestDowngradeNetsIntoRunningBalance pins the downgrade side. A downgrade is a
// credit against the running balance, so it reduces dues the subscriber already
// owes and only turns into an advance once it exceeds them. This is the case the
// old replace-the-balance behaviour got wrong by discarding the outstanding
// dues entirely.
func TestDowngradeNetsIntoRunningBalance(t *testing.T) {
	delta, applied := packageProration(date(2026, time.October, 1), 3000, 1000)
	if !applied {
		t.Fatal("expected an adjustment to apply")
	}
	if delta != -2000 {
		t.Fatalf("delta = %v, want -2000", delta)
	}

	cases := []struct {
		name        string
		starting    float64
		wantBalance float64
		wantStatus  string
	}{
		{"settled subscriber gets an advance", 0, -2000, "advance"},
		{"dues larger than the credit stay pending", 5000, 3000, "pending"},
		{"dues smaller than the credit tip into advance", 500, -1500, "advance"},
		{"existing advance grows by the credit", -2000, -4000, "advance"},
	}

	for _, c := range cases {
		newBalance := roundToTwo(c.starting + delta)
		if newBalance != c.wantBalance {
			t.Errorf("%s: balance = %v, want %v", c.name, newBalance, c.wantBalance)
		}
		if got := paymentStatusForBalance(newBalance); got != c.wantStatus {
			t.Errorf("%s: status = %q, want %q", c.name, got, c.wantStatus)
		}
	}
}

// TestPackageChangePreservesOutstandingDues is the regression guard for the
// exact bug: a package change must never silently forgive money the subscriber
// already owed.
func TestPackageChangePreservesOutstandingDues(t *testing.T) {
	previousBalance := 5000.0
	delta, _ := packageProration(date(2026, time.October, 16), 3000, 1000)

	newBalance := roundToTwo(previousBalance + delta)
	if newBalance == delta {
		t.Errorf("balance = %v, which means the outstanding dues were discarded", newBalance)
	}
	if newBalance >= previousBalance {
		t.Errorf("balance = %v, want less than the starting %v for a downgrade", newBalance, previousBalance)
	}
}

// TestProrationResyncsStatusFromBalance guards against a stale payment_status
// keeping the subscriber on the advance page after an upgrade.
func TestProrationResyncsStatusFromBalance(t *testing.T) {
	for _, remaining := range []float64{2000, -2000, 0, 354.84, -354.84} {
		got := paymentStatusForBalance(remaining)
		switch {
		case remaining > 0 && got != "pending":
			t.Errorf("balance %v: status = %q, want pending", remaining, got)
		case remaining < 0 && got != "advance":
			t.Errorf("balance %v: status = %q, want advance", remaining, got)
		case remaining == 0 && got != "":
			t.Errorf("balance %v: status = %q, want empty", remaining, got)
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

// TestProrationFoldsDowngradeIntoAdvance mirrors the chosen behaviour: a
// downgrade credit drives the balance negative instead of creating a separate
// advance record, and the status flips accordingly.
func TestProrationFoldsDowngradeIntoAdvance(t *testing.T) {
	startingBalance := 200.0
	delta, applied := packageProration(date(2026, time.August, 10), 1500, 1000)
	if !applied {
		t.Fatal("expected an adjustment to apply")
	}

	newBalance := roundToTwo(startingBalance + delta)
	if newBalance != -154.84 {
		t.Errorf("balance = %v, want -154.84", newBalance)
	}
	if got := paymentStatusForBalance(newBalance); got != "advance" {
		t.Errorf("status = %q, want advance", got)
	}
}
