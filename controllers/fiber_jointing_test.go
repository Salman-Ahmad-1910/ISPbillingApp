package controllers

import (
	"testing"

	"awesomeProject/models"
)

func TestFiberJointingTotal(t *testing.T) {
	if total := fiberJointingTotal(100, 200, 50.5); total != 350.5 {
		t.Errorf("total = %v, want 350.5", total)
	}
	if total := fiberJointingTotal(0, 0, 0); total != 0 {
		t.Errorf("total = %v, want 0 for an empty charge", total)
	}
	if total := fiberJointingTotal(99.99, 0.01, 0); total != 100 {
		t.Errorf("total = %v, want two-decimal rounding to 100", total)
	}
}

func TestFiberJointingRemaining(t *testing.T) {
	if remaining := fiberJointingRemaining(1000, 400); remaining != 600 {
		t.Errorf("remaining = %v, want 600", remaining)
	}
	if remaining := fiberJointingRemaining(1000, 1500); remaining != 0 {
		t.Errorf("remaining = %v, want 0 when paid exceeds total", remaining)
	}
	if remaining := fiberJointingRemaining(1000, 1000); remaining != 0 {
		t.Errorf("remaining = %v, want 0 when fully paid", remaining)
	}
}

func TestFiberJointingStatus(t *testing.T) {
	cases := []struct {
		name     string
		total    float64
		received float64
		promised bool
		want     string
	}{
		{"full payment", 1000, 1000, false, models.FiberPaymentStatusPaid},
		{"half payment", 1000, 500, false, models.FiberPaymentStatusPartial},
		{"small partial", 1000, 1, false, models.FiberPaymentStatusPartial},
		{"promise with due date", 1000, 0, true, models.FiberPaymentStatusPromise},
		{"unpaid", 1000, 0, false, models.FiberPaymentStatusUnpaid},
		{"over payment", 1000, 1200, false, ""},
		{"negative received", 1000, -1, false, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := fiberJointingStatus(tc.total, tc.received, tc.promised); got != tc.want {
				t.Errorf("status = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestFiberJointingStatusRounding(t *testing.T) {
	// 1/3 of a 1000 charge is not an exact decimal; the status must still be
	// derived from two-decimal money.
	if got := fiberJointingStatus(1000, 333.333, false); got != models.FiberPaymentStatusPartial {
		t.Errorf("status = %q, want partial", got)
	}
}