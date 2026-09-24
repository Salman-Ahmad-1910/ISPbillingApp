package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// NormalizeWhatsAppNumber converts a phone number to the E.164 format
// required by the WhatsApp Cloud API (e.g. 03001234567 -> 923001234567).
func NormalizeWhatsAppNumber(phone string) string {
	var digits strings.Builder
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	s := digits.String()
	if strings.HasPrefix(s, "0") {
		s = "92" + s[1:]
	}
	return s
}

// SendWhatsApp delivers a text message to a phone number using the
// Meta WhatsApp Cloud API.
func SendWhatsApp(phone, message, phoneNumberID, accessToken string) error {
	if phoneNumberID == "" || accessToken == "" {
		return fmt.Errorf("WhatsApp gateway is not configured. Set the WhatsApp token and phone number ID in Settings.")
	}

	payload, err := json.Marshal(map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                phone,
		"type":              "text",
		"text": map[string]interface{}{
			"body": message,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to build payload: %w", err)
	}

	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/messages", phoneNumberID)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("whatsapp request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var body map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&body)
		return fmt.Errorf("whatsapp API returned status %d: %v", resp.StatusCode, body["error"])
	}

	return nil
}