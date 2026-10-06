package controllers

import (
	"testing"

	"awesomeProject/models"
)

func staticListPrice(prices map[string]float64) func(posSaleItem) (float64, error) {
	return func(it posSaleItem) (float64, error) {
		return prices[it.ProductName], nil
	}
}

func TestRevaluePromiseItemsAllowsReducedPrice(t *testing.T) {
	items := []posSaleItem{
		{ProductName: "Router", Quantity: 2, Price: 4000, OriginalPrice: 5000, TaxPercent: 10},
	}

	priced, subtotal, taxTotal, err := revaluePromiseItems(items, staticListPrice(map[string]float64{"Router": 5000}))
	if err != nil {
		t.Fatalf("expected reduced price to be allowed, got %v", err)
	}

	if subtotal != 8000 {
		t.Errorf("subtotal = %v, want 8000 (2 x 4000)", subtotal)
	}
	if taxTotal != 800 {
		t.Errorf("tax = %v, want 800 (10%% of the reduced price)", taxTotal)
	}
	if priced[0].Price != 4000 {
		t.Errorf("price = %v, want the operator's 4000", priced[0].Price)
	}
	if priced[0].WthTax != 8800 {
		t.Errorf("wthTax = %v, want 8800", priced[0].WthTax)
	}
	if priced[0].OriginalPrice != 5000 {
		t.Errorf("originalPrice = %v, want the list price 5000 kept for the record", priced[0].OriginalPrice)
	}
}

func TestRevaluePromiseItemsRejectsPriceAboveList(t *testing.T) {
	items := []posSaleItem{
		{ProductName: "Router", Quantity: 1, Price: 6000},
	}

	_, _, _, err := revaluePromiseItems(items, staticListPrice(map[string]float64{"Router": 5000}))
	if err == nil {
		t.Fatal("expected an error for a price above the list price")
	}
	if _, ok := err.(*posPromiseError); !ok {
		t.Fatalf("expected a validation error, got %T", err)
	}
}

func TestRevaluePromiseItemsAcceptsFullListPrice(t *testing.T) {
	items := []posSaleItem{
		{ProductName: "Router", Quantity: 1, Price: 5000},
	}

	_, subtotal, _, err := revaluePromiseItems(items, staticListPrice(map[string]float64{"Router": 5000}))
	if err != nil {
		t.Fatalf("expected the list price itself to be allowed, got %v", err)
	}
	if subtotal != 5000 {
		t.Errorf("subtotal = %v, want 5000", subtotal)
	}
}

func TestRevaluePromiseItemsRejectsBadQuantity(t *testing.T) {
	items := []posSaleItem{
		{ProductName: "Router", Quantity: 0, Price: 100},
	}

	if _, _, _, err := revaluePromiseItems(items, staticListPrice(map[string]float64{"Router": 5000})); err == nil {
		t.Fatal("expected an error for zero quantity")
	}
}

func TestPromiseTotalAppliesDiscountAndNeverGoesNegative(t *testing.T) {
	if got := promiseTotal(1000, 0, 100); got != 900 {
		t.Errorf("with discount = %v, want 900", got)
	}
	if got := promiseTotal(1000, 0, 5000); got != 0 {
		t.Errorf("with an oversized discount = %v, want 0 rather than negative", got)
	}
}

func TestSplitPromisePayment(t *testing.T) {
	paid, pending, err := splitPromisePayment(10000, 4000)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if paid != 4000 || pending != 6000 {
		t.Errorf("paid/pending = %v/%v, want 4000/6000", paid, pending)
	}
}

func TestSplitPromisePaymentAllowsNothingPaidNow(t *testing.T) {
	paid, pending, err := splitPromisePayment(7500, 0)
	if err != nil {
		t.Fatalf("paying nothing now must be allowed, got %v", err)
	}
	if paid != 0 || pending != 7500 {
		t.Errorf("paid/pending = %v/%v, want 0/7500", paid, pending)
	}
}

func TestSplitPromisePaymentRejectsOverpay(t *testing.T) {
	if _, _, err := splitPromisePayment(1000, 1500); err == nil {
		t.Fatal("expected an error when the amount paid exceeds the total")
	}
}

func TestSplitPromisePaymentRejectsFullyPaidSale(t *testing.T) {
	_, _, err := splitPromisePayment(1000, 1000)
	if err == nil {
		t.Fatal("a fully paid sale is not a promise and must be rejected")
	}
}

func TestPosPromiseRemaining(t *testing.T) {
	cases := []struct {
		pending, collected, want float64
	}{
		{10000, 0, 10000},
		{10000, 2500, 7500},
		{10000, 10000, 0},
		{10000, 12000, 0}, // never report a negative debt
	}
	for _, c := range cases {
		p := models.POSPromise{PendingAmount: c.pending, CollectedAmount: c.collected}
		if got := posPromiseRemaining(p); got != c.want {
			t.Errorf("remaining(%v, %v) = %v, want %v", c.pending, c.collected, got, c.want)
		}
	}
}

func TestPromiseStatusAfterCollection(t *testing.T) {
	if got := promiseStatusAfterCollection(0); got != "completed" {
		t.Errorf("status = %v, want completed", got)
	}
	if got := promiseStatusAfterCollection(500); got != "partial" {
		t.Errorf("status = %v, want partial", got)
	}
}

func TestSummedPendingAcrossMultiplePromises(t *testing.T) {
	// The subscriber view relies on summing each open promise separately.
	promises := []models.POSPromise{
		{PendingAmount: 10000, CollectedAmount: 0, Status: "pending"},
		{PendingAmount: 5000, CollectedAmount: 2000, Status: "partial"},
		{PendingAmount: 3000, CollectedAmount: 3000, Status: "completed"},
	}

	sum := 0.0
	for _, p := range promises {
		if p.Status == "completed" || p.Status == "cancelled" {
			continue
		}
		sum += posPromiseRemaining(p)
	}

	if sum != 13000 {
		t.Errorf("summed pending = %v, want 13000", sum)
	}
}

func TestPosPaymentSplitSettlesOldestFirst(t *testing.T) {
	open := []models.POSPromise{
		{PendingAmount: 10000, CollectedAmount: 0},
		{PendingAmount: 5000, CollectedAmount: 2000, Status: "partial"},
	}

	parts := posPaymentSplit(open, 8000)
	if parts[0] != 8000 || parts[1] != 0 {
		t.Errorf("parts = %v, want [8000 0] (oldest promise absorbs the whole payment)", parts)
	}
}

func TestPosPaymentSplitSpansPromises(t *testing.T) {
	open := []models.POSPromise{
		{PendingAmount: 10000, CollectedAmount: 0},
		{PendingAmount: 5000, CollectedAmount: 2000, Status: "partial"},
		{PendingAmount: 4000, CollectedAmount: 0},
	}

	// Remaining per promise: 10000, 3000, 4000. Pay 12500: fills the first two
	// and takes the rest from the third.
	parts := posPaymentSplit(open, 12500)
	if parts[0] != 10000 || parts[1] != 2500 || parts[2] != 0 {
		t.Errorf("parts = %v, want [10000 2500 0]", parts)
	}
}

func TestPosPaymentSplitFullySettles(t *testing.T) {
	open := []models.POSPromise{
		{PendingAmount: 10000, CollectedAmount: 0},
		{PendingAmount: 5000, CollectedAmount: 2000, Status: "partial"},
	}

	parts := posPaymentSplit(open, 13000)
	if parts[0] != 10000 || parts[1] != 3000 {
		t.Errorf("parts = %v, want [10000 3000]", parts)
	}
}

func TestPosPaymentSplitNeverOverpaysOnePromise(t *testing.T) {
	open := []models.POSPromise{
		{PendingAmount: 5000, CollectedAmount: 0},
		{PendingAmount: 5000, CollectedAmount: 0},
	}

	parts := posPaymentSplit(open, 7000)
	if parts[0] != 5000 || parts[1] != 2000 {
		t.Errorf("parts = %v, want [5000 2000]", parts)
	}
}
