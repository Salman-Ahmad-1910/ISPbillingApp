package controllers

import (
	"crypto/rand"
	"fmt"
	"log"
	"strings"
	"time"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const otpTTL = 10 * time.Minute
const maxOTPAttempts = 5

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Email    string `json:"email" binding:"required,email"`
	OTP      string `json:"otp" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

// generateOTP returns a cryptographically random 6-digit numeric code.
func generateOTP() (string, error) {
	const digits = "0123456789"
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = digits[int(b[i])%len(digits)]
	}
	return string(b), nil
}

// ForgotPassword looks up the user's email case-insensitively, generates a
// 6-digit OTP and emails it to them. The OTP is stored as a bcrypt hash with a
// short expiry. When no SMTP is configured the OTP is returned in the response
// (dev mode) so the flow can still be tested.
func ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Validation failed", err.Error())
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	if err := config.DB.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		// Do not reveal whether the email is registered.
		utils.SuccessResponse(c, "If this email is registered, a password reset OTP will be sent.", gin.H{})
		return
	}

	otp, err := generateOTP()
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to generate OTP", nil)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(otp), bcrypt.DefaultCost)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to secure OTP", nil)
		return
	}

	if err := config.DB.Model(&user).Updates(map[string]interface{}{
		"reset_otp":          string(hashed),
		"reset_otp_expiry":   time.Now().Add(otpTTL),
		"reset_otp_attempts": 0,
	}).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to save OTP", nil)
		return
	}

	// Email the user the OTP.
	if utils.SMTPEnabled() {
		subject := "Your Fintrack ERP Password Reset OTP"
		body := fmt.Sprintf(`
			<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
				<h2 style="color:#111827;margin:0 0 12px;">Password Reset Request</h2>
				<p style="color:#4b5563;font-size:15px;line-height:1.6;">Hello %s,<br/><br/>
				Use the OTP below to reset your password. This OTP is valid for <strong>10 minutes</strong>.</p>
				<div style="background:#f0fdf4;border:1px solid #059669;color:#065f46;font-size:28px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;border-radius:8px;margin:16px 0;">%s</div>
				<p style="color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
			</div>`, user.Name, otp)

		if err := utils.SendEmail(user.Email, subject, body); err != nil {
			log.Printf("Failed to send reset email to %s: %v", user.Email, err)
			utils.ErrorResponse(c, 500, "Failed to send reset email. Please try again.", nil)
			return
		}
		utils.SuccessResponse(c, "A password reset OTP has been sent to your email.", gin.H{})
		return
	}

	// Dev fallback without SMTP: log the OTP and echo it so the flow is testable.
	log.Printf("[DEV] Password reset OTP for %s: %s", email, otp)
	utils.SuccessResponse(c, "A password reset OTP has been sent to your email.", gin.H{
		"devMode": true,
		"otp":     otp,
	})
}

// ResetPassword verifies the OTP and sets a new password.
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Validation failed", err.Error())
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	otp := strings.TrimSpace(req.OTP)

	var user models.User
	if err := config.DB.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		utils.ErrorResponse(c, 400, "Invalid or expired OTP", nil)
		return
	}

	if user.ResetOTP == "" || user.ResetOTPExpiry.IsZero() || time.Now().After(user.ResetOTPExpiry) {
		utils.ErrorResponse(c, 400, "OTP has expired. Please request a new one.", nil)
		return
	}

	if user.ResetOTPAttempts >= maxOTPAttempts {
		config.DB.Model(&user).Updates(map[string]interface{}{
			"reset_otp":          "",
			"reset_otp_expiry":   time.Time{},
			"reset_otp_attempts": 0,
		})
		utils.ErrorResponse(c, 400, "Too many incorrect attempts. Please request a new OTP.", nil)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.ResetOTP), []byte(otp)); err != nil {
		config.DB.Model(&user).Update("reset_otp_attempts", user.ResetOTPAttempts+1)
		utils.ErrorResponse(c, 400, "Invalid OTP. Please try again.", nil)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to hash password", nil)
		return
	}

	if err := config.DB.Model(&user).Updates(map[string]interface{}{
		"password":           string(hashedPassword),
		"reset_otp":          "",
		"reset_otp_expiry":   time.Time{},
		"reset_otp_attempts": 0,
	}).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to reset password", err.Error())
		return
	}

	utils.SuccessResponse(c, "Password reset successful. You can now sign in.", gin.H{})
}