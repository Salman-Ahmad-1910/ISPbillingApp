package utils

func IsValidCustomerType(t string) bool {
	switch t {
	case "customer", "supplier", "personal":
		return true
	default:
		return false
	}
}
