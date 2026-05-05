package seed

import (
	"log"

	"awesomeProject/config"
	"awesomeProject/models"

	"github.com/google/uuid"
)

func SeedAlertTemplates(companyID uuid.UUID) {
	// Check if alert templates already exist for this company
	var count int64
	config.DB.Model(&models.AlertTemplate{}).Where("company_id = ?", companyID).Count(&count)
	if count > 0 {
		log.Printf("Alert templates already exist for company %s", companyID)
		return
	}

	// Default alert templates
	alertTemplates := []models.AlertTemplate{
		{
			TemplateID:       "invoice-generated",
			Title:            "Invoice Generated",
			Description:      "Sent when a new invoice is created.",
			SMSEnabled:       true,
			SMSTemplate:      "Dear {customer_name}, your bill of PKR {amount} for {billing_period} is due on {due_date}. Thank you, {company_name}.",
			WhatsAppEnabled:  true,
			WhatsAppTemplate: "*Invoice Alert* 🧾 %0ADear {customer_name},%0A%0AYour new invoice for *{billing_period}* is now available.%0A*Amount Due:* PKR {amount}%0A*Due Date:* {due_date}%0A%0APay now to avoid service interruption.%0A%0AThank you,%0A*{company_name}*",
		},
		{
			TemplateID:       "payment-received",
			Title:            "Payment Received",
			Description:      "Sent when a payment is successfully recorded.",
			SMSEnabled:       true,
			SMSTemplate:      "Thank you for your payment of PKR {amount}. Your account is updated. Transaction ID: {payment_id}. {company_name}.",
			WhatsAppEnabled:  false,
			WhatsAppTemplate: "*Payment Confirmation* ✅ %0ADear {customer_name},%0A%0AWe have received your payment of *PKR {amount}*.%0AThank you for being a valued customer.%0A%0A*{company_name}*",
		},
		{
			TemplateID:       "due-date-reminder",
			Title:            "Due Date Reminder",
			Description:      "Sent a few days before the invoice due date.",
			SMSEnabled:       false,
			SMSTemplate:      "Gentle Reminder: Your payment of PKR {amount} is due on {due_date}. Please pay to avoid suspension. {company_name}.",
			WhatsAppEnabled:  true,
			WhatsAppTemplate: "*Payment Reminder* ❗ %0ADear {customer_name},%0A%0AThis is a friendly reminder that your payment of *PKR {amount}* is due on *{due_date}*.%0A%0APlease make the payment to ensure uninterrupted service.%0A%0AThank you,%0A*{company_name}*",
		},
		{
			TemplateID:       "account-suspension",
			Title:            "Account Suspension",
			Description:      "Sent when a subscriber's account is suspended.",
			SMSEnabled:       true,
			SMSTemplate:      "Your account has been suspended due to non-payment. Please clear your dues of PKR {balance} to restore services. {company_name}.",
			WhatsAppEnabled:  false,
			WhatsAppTemplate: "*Account Suspended* 🚫 %0ADear {customer_name},%0A%0AYour account has been temporarily suspended due to an outstanding balance of *PKR {balance}*.%0A%0APlease clear your dues at your earliest convenience to restore your services.%0A%0AThank you,%0A*{company_name}*",
		},
	}

	// Create alert templates
	for _, template := range alertTemplates {
		if err := config.DB.Create(&template).Error; err != nil {
			log.Printf("Failed to create alert template %s: %v", template.TemplateID, err)
		} else {
			log.Printf("Created alert template: %s", template.TemplateID)
		}
	}

	log.Printf("Seeded %d alert templates for company %s", len(alertTemplates), companyID)
}
