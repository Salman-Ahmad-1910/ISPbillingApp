package utils

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
)

// SMTP settings are loaded from environment variables:
//
//	SMTP_HOST       - e.g. smtp.gmail.com, smtp.hostinger.com
//	SMTP_PORT       - 587 (STARTTLS) or 465 (implicit TLS); defaults to 587
//	SMTP_USER       - SMTP account username (often the sender email)
//	SMTP_PASSWORD   - SMTP account password / app password
//	SMTP_FROM       - From address; defaults to SMTP_USER
func SMTPEnabled() bool {
	return os.Getenv("SMTP_HOST") != "" && os.Getenv("SMTP_USER") != "" && os.Getenv("SMTP_PASSWORD") != ""
}

// SendEmail sends an HTML email to a single recipient over SMTP.
func SendEmail(to, subject, htmlBody string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}

	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASSWORD")
	if host == "" || user == "" || pass == "" {
		return fmt.Errorf("SMTP not configured")
	}

	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = user
	}

	msg := "From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" +
		htmlBody

	auth := smtp.PlainAuth("", user, pass, host)

	if port == "465" {
		return sendImplicitTLS(host, port, auth, from, to, []byte(msg))
	}

	// 587 / default: smtp.SendMail negotiates STARTTLS automatically.
	return smtp.SendMail(net.JoinHostPort(host, port), auth, from, []string{to}, []byte(msg))
}

// sendImplicitTLS handles SMTP servers that use TLS from the first byte (port 465).
func sendImplicitTLS(host, port string, auth smtp.Auth, from, to string, msg []byte) error {
	conn, err := tls.Dial("tcp", net.JoinHostPort(host, port), &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: true, // verify via SMTP AUTH credentials
	})
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP over TLS: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP auth failed: %w", err)
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("SMTP mail-from failed: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("SMTP rcpt failed: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP data failed: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("SMTP write failed: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("SMTP close failed: %w", err)
	}
	return client.Quit()
}