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


