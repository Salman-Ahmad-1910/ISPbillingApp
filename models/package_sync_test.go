package models

import "testing"

func TestEffectivePackagePrice(t *testing.T) {
	tests := []struct {
		name string
		pkg  Package
		want float64
	}{
		{"sale price wins", Package{SalePrice: 1800, Price: 1100}, 1800},
		{"list price fallback", Package{SalePrice: 0, Price: 1100}, 1100},
		{"both empty", Package{}, 0},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := effectivePackagePrice(test.pkg); got != test.want {
				t.Fatalf("effectivePackagePrice() = %v, want %v", got, test.want)
			}
		})
	}
}

func TestDiscountedPackageAmount(t *testing.T) {
	tests := []struct {
		discount string
		want     float64
	}{
		{"", 1800},
		{"no_discount", 1800},
		{"quarter", 1350},
		{"half", 900},
		{"full_free", 0},
		{"custom", 1800},
	}
	for _, test := range tests {
		t.Run(test.discount, func(t *testing.T) {
			if got := discountedPackageAmount(1800, test.discount); got != test.want {
				t.Fatalf("discountedPackageAmount(1800, %q) = %v, want %v", test.discount, got, test.want)
			}
		})
	}
}

func TestIsCustomDiscount(t *testing.T) {
	if !isCustomDiscount(" Custom ") {
		t.Fatal("custom discount not detected")
	}
	if isCustomDiscount("half") {
		t.Fatal("regular discount treated as custom")
	}
}

func TestPackageSides(t *testing.T) {
	tests := []struct {
		packageType string
		internet    bool
		cable       bool
	}{
		{"Internet", true, false},
		{"TV Cable", false, true},
		{"Both", true, true},
		{"", true, true},
	}
	for _, test := range tests {
		t.Run(test.packageType, func(t *testing.T) {
			internet, cable := packageSides(test.packageType)
			if internet != test.internet || cable != test.cable {
				t.Fatalf("packageSides(%q) = (%v, %v), want (%v, %v)", test.packageType, internet, cable, test.internet, test.cable)
			}
		})
	}
}

func TestConnectionMonthlyFee(t *testing.T) {
	if got := connectionMonthlyFee("internet", 500, 1800); got != 1800 {
		t.Fatalf("internet fee = %v, want 1800", got)
	}
	if got := connectionMonthlyFee("tv_cable", 500, 1800); got != 500 {
		t.Fatalf("tv_cable fee = %v, want 500", got)
	}
	if got := connectionMonthlyFee("both", 500, 1800); got != 2300 {
		t.Fatalf("both fee = %v, want 2300", got)
	}
}

func TestPackageBalanceStatus(t *testing.T) {
	if got := packageBalanceStatus(1800); got != "pending" {
		t.Fatalf("positive balance status = %q, want pending", got)
	}
	if got := packageBalanceStatus(-100); got != "advance" {
		t.Fatalf("negative balance status = %q, want advance", got)
	}
	if got := packageBalanceStatus(0); got != "" {
		t.Fatalf("zero balance status = %q, want empty", got)
	}
}

func TestReconciledPackageBalance(t *testing.T) {
	tests := []struct {
		name            string
		remaining       float64
		storedFee       float64
		previousCatalog float64
		newFee          float64
		wantRemaining   float64
		wantChanged     bool
	}{
		{
			name:      "one month at the stored fee moves to the new fee",
			remaining: 1100, storedFee: 1100, previousCatalog: 1100, newFee: 1800,
			wantRemaining: 1800, wantChanged: true,
		},
		{
			name:      "connection already re-priced, balance still at previous catalog fee",
			remaining: 1100, storedFee: 1800, previousCatalog: 1100, newFee: 1800,
			wantRemaining: 1800, wantChanged: true,
		},
		{
			name:      "older dues are preserved",
			remaining: 2200, storedFee: 1100, previousCatalog: 1100, newFee: 1800,
			wantChanged: false,
		},
		{
			name:      "partial payment is preserved",
			remaining: 700, storedFee: 1100, previousCatalog: 1100, newFee: 1800,
			wantChanged: false,
		},
		{
			name:      "advance is preserved",
			remaining: -500, storedFee: 1100, previousCatalog: 1100, newFee: 1800,
			wantChanged: false,
		},
		{
			name:      "paid balance is preserved",
			remaining: 0, storedFee: 1100, previousCatalog: 1100, newFee: 1800,
			wantChanged: false,
		},
		{
			name:      "already at the new fee",
			remaining: 1800, storedFee: 1800, previousCatalog: 1100, newFee: 1800,
			wantChanged: false,
		},
		{
			name:      "downgrade moves one month down",
			remaining: 1800, storedFee: 1800, previousCatalog: 1800, newFee: 1100,
			wantRemaining: 1100, wantChanged: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, changed := reconciledPackageBalance(test.remaining, test.storedFee, test.previousCatalog, test.newFee)
			if changed != test.wantChanged {
				t.Fatalf("changed = %v, want %v", changed, test.wantChanged)
			}
			if changed && got != test.wantRemaining {
				t.Fatalf("remaining = %v, want %v", got, test.wantRemaining)
			}
		})
	}
}

func TestConnectionCatalogFee(t *testing.T) {
	internet := Connection{ConnectionType: "internet", SameAmount: 1100}
	if got := connectionCatalogFee(1800, internet, true, false); got != 1800 {
		t.Fatalf("internet catalog fee = %v, want 1800", got)
	}

	discounted := Connection{ConnectionType: "internet", SameAmount: 1100, SameDiscount: "half"}
	if got := connectionCatalogFee(1800, discounted, true, false); got != 900 {
		t.Fatalf("discounted catalog fee = %v, want 900", got)
	}

	custom := Connection{ConnectionType: "internet", SameAmount: 1100, SameDiscount: "custom"}
	if got := connectionCatalogFee(1800, custom, true, false); got != 1100 {
		t.Fatalf("custom catalog fee = %v, want 1100", got)
	}

	both := Connection{ConnectionType: "both", Amount: 500, SameAmount: 1100}
	if got := connectionCatalogFee(1800, both, true, false); got != 2300 {
		t.Fatalf("both catalog fee = %v, want 2300", got)
	}
}
