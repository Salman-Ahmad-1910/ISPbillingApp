package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SendMessagesRequest holds the ids of the messages to send.
type SendMessagesRequest struct {
	IDs     []string `json:"ids"`
	SentBy  string   `json:"sentBy"`
	Channel string   `json:"channel"` // optional: "whatsapp" forces WhatsApp delivery
}

// SendMessages delivers WhatsApp drafts via the Meta WhatsApp Cloud API
// and marks the given messages as sent for the current company.
func SendMessages(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var req SendMessagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	ids := make([]string, 0, len(req.IDs))
	for _, id := range req.IDs {
		if id != "" {
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		utils.ErrorResponse(c, 400, "At least one message id is required", nil)
		return
	}

	sentBy := req.SentBy
	if sentBy == "" {
		sentBy = "Admin"
	}

	var messages []models.Message
	if err := config.DB.
		Scopes(models.TenantScope(companyID)).
		Where("id IN ?", ids).
		Find(&messages).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to load messages", err.Error())
		return
	}

	if len(messages) == 0 {
		utils.SuccessResponse(c, "Messages sent", gin.H{"sent": 0, "failed": []any{}})
		return
	}

	var cfg models.SystemConfig
	config.DB.Scopes(models.TenantScope(companyID)).First(&cfg)

	sent := 0
	failed := make([]gin.H, 0)
	now := time.Now().Format(time.RFC3339)

	for i := range messages {
		msg := &messages[i]
		if msg.Status == "whatsapp_draft" || req.Channel == "whatsapp" {
			phone := utils.NormalizeWhatsAppNumber(msg.MobileNo)
			if phone == "" {
				phone = utils.NormalizeWhatsAppNumber(msg.Phone)
			}
			if phone == "" {
				failed = append(failed, gin.H{"id": msg.ID.String(), "name": msg.Name, "error": "no phone number"})
				continue
			}
			if err := utils.SendWhatsApp(phone, msg.MessageText, cfg.WhatsAppPhoneNumberID, cfg.WhatsAppGateway); err != nil {
				failed = append(failed, gin.H{"id": msg.ID.String(), "name": msg.Name, "error": err.Error()})
				continue
			}
		}

		if err := config.DB.Model(&models.Message{}).
			Where("id = ?", msg.ID).
			Updates(map[string]interface{}{
				"status":    "sent",
				"sent_by":   sentBy,
				"sended_at": now,
			}).Error; err != nil {
			failed = append(failed, gin.H{"id": msg.ID.String(), "name": msg.Name, "error": err.Error()})
			continue
		}
		sent++
	}

	utils.SuccessResponse(c, "Messages sent", gin.H{"sent": sent, "failed": failed})
}