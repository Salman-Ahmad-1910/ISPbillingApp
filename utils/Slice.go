package utils

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

type UintSlice []uint

// Value encodes []uint to JSON before storing in DB
func (u UintSlice) Value() (driver.Value, error) {
	return json.Marshal(u)
}

// Scan decodes JSON from DB into []uint
func (u *UintSlice) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, &u)
}
