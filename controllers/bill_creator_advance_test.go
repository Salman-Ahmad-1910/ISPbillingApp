package controllers

import "testing"

// TestBalanceAfterMonthlyFeeCoversSpecEdgeCases walks the monthly billing
// examples from the change-package requirement: an advance must offset the
// package fee, and any part of the advance the fee does not cover has to
// survive as an advance for the next period instead of disappearing.
func TestBalanceAfterMonthlyFeeCoversSpecEdgeCases(t *testing.T) {
	cases := []struct {
		name        string
		remaining   float64
		fee         float64
		wantBalance float64
		wantStatus  string
	}{
		{"no advance, full fee payable", 0, 1000, 1000, "pending"},
		{"no advance, fee free package", 0, 0, 0, ""},
		{"advance smaller than fee leaves the rest payable", -500, 1000, 500, "pending"},
		{"advance exactly covers the fee", -1000, 1000, 0, ""},
		{"advance larger than fee carries the rest forward", -1500, 1000, -500, "advance"},
		{"advance far larger than fee carries most of it forward", -5000, 1000, -4000, "advance"},
		{"existing dues are added on top of the fee", 300, 1000, 1300, "pending"},
		{"existing dues are cleared by a larger advance", 300, -200, 100, "pending"},
		{"existing dues flip to an advance when the credit is bigger", 300, -500, -200, "advance"},
		{"a leftover advance still reduces next month's dues", 2000, 0, 2000, "pending"},
	}

	for _, c := range cases {
		balance, status := balanceAfterMonthlyFee(c.remaining, c.fee)
		if balance != c.wantBalance {
			t.Errorf("%s: balance = %v, want %v", c.name, balance, c.wantBalance)
		}
		if status != c.wantStatus {
			t.Errorf("%s: status = %q, want %q", c.name, status, c.wantStatus)
		}
	}
}

// TestBalanceAfterMonthlyFeeIsDeterministic guards the money requirement: the
// same inputs must always produce the same result, with no drift from
// repeated application and no sub-cent residue accumulating.
func TestBalanceAfterMonthlyFeeIsDeterministic(t *testing.T) {
	first, _ := balanceAfterMonthlyFee(-333.33, 1000)
	second, _ := balanceAfterMonthlyFee(-333.33, 1000)
	if first != second {
		t.Errorf("balance = %v then %v, want identical results", first, second)
	}

	// A third of 1000 split over three months must land exactly on zero
	// rather than leaving a rounding residue behind.
	balance, status := balanceAfterMonthlyFee(0, 1000)
	for i := 0; i < 3; i++ {
		balance, status = balanceAfterMonthlyFee(balance, -333.33)
	}
	if balance != 0.01 || status != "pending" {
		t.Errorf("after three thirds: balance = %v (%q), want 0.01 pending", balance, status)
	}
}
