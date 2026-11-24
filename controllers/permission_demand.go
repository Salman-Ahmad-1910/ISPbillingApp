package controllers

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Permission demands: a user asks the admin they work under for permissions.
//
//	POST   /demands              create (requester = logged-in user)
//	GET    /demands/mine         demands sent by the logged-in user
//	GET    /demands/received     demands addressed to the logged-in user
//	                             (company admins/owners see every demand of the company)
//	PUT    /demands/:id/respond  approve / reject with a reply
//	DELETE /demands/:id          requester cancels their own pending demand

const (
	demandStatusPending  = "pending"
	demandStatusApproved = "approved"
	demandStatusRejected = "rejected"

	demandDescriptionMax = 5000
	demandReplyMax       = 2000
	demandPagesMax       = 200
)

var demandAdminRoles = []string{"admin", "owner"}

type createDemandRequest struct {
	Pages       []models.DemandPage `json:"pages"`
	Platform    string              `json:"platform"`
	Priority    string              `json:"priority"`
	Description string              `json:"description"`
}

type respondDemandRequest struct {
	Status string `json:"status"`
	Reply  string `json:"reply"`
}

// demandContext returns the logged-in user and company from the auth context.
func demandContext(c *gin.Context) (uuid.UUID, uuid.UUID, bool) {
	uv, ok1 := c.Get("userID")
	cv, ok2 := c.Get("companyID")
	if !ok1 || !ok2 {
		return uuid.Nil, uuid.Nil, false
	}
	userID, ok3 := uv.(uuid.UUID)
	companyID, ok4 := cv.(uuid.UUID)
	return userID, companyID, ok3 && ok4
}

// roleInCompany is the user's role in the company ("" when not a member).
func roleInCompany(userID, companyID uuid.UUID) string {
	var uc models.UserCompany
	if err := config.DB.Where("user_id = ? AND company_id = ?", userID, companyID).First(&uc).Error; err != nil {
		return ""
	}
	return uc.UserRole
}

func isDemandAdmin(userID, companyID uuid.UUID) bool {
	role := strings.ToLower(roleInCompany(userID, companyID))
	for _, r := range demandAdminRoles {
		if role == r {
			return true
		}
	}
	return false
}

func userIsActive(u models.User) bool {
	return !strings.EqualFold(strings.TrimSpace(u.Status), "inactive")
}

// resolveDemandRecipient picks who receives a demand: the account that created
// the requester (if it still exists, is active and belongs to the company),
// otherwise the company's first active admin/owner.
func resolveDemandRecipient(requester models.User, companyID uuid.UUID) *models.User {
	if requester.CreatedBy != nil && *requester.CreatedBy != requester.ID {
		var creator models.User
		if err := config.DB.First(&creator, "id = ?", *requester.CreatedBy).Error; err == nil &&
			userIsActive(creator) && roleInCompany(creator.ID, companyID) != "" {
			return &creator
		}
	}

	var admins []models.UserCompany
	config.DB.Where("company_id = ? AND LOWER(role_in_company) IN ? AND user_id <> ?",
		companyID, demandAdminRoles, requester.ID).
		Order("created_at asc").Find(&admins)
	for _, uc := range admins {
		var u models.User
		if err := config.DB.First(&u, "id = ?", uc.UserID).Error; err == nil && userIsActive(u) {
			return &u
		}
	}
	return nil
}

func normalizeChoice(value, fallback string, allowed ...string) (string, bool) {
	v := strings.ToLower(strings.TrimSpace(value))
	if v == "" {
		return fallback, true
	}
	for _, a := range allowed {
		if v == a {
			return v, true
		}
	}
	return "", false
}

// CreatePermissionDemand - POST /demands
func CreatePermissionDemand(c *gin.Context) {
	userID, companyID, ok := demandContext(c)
	if !ok {
		utils.ErrorResponse(c, 401, "Not logged in", nil)
		return
	}

	var req createDemandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid demand", err.Error())
		return
	}
	description := strings.TrimSpace(req.Description)
	if len([]rune(description)) < 10 {
		utils.ErrorResponse(c, 400, "Please explain your demand (at least 10 characters)", nil)
		return
	}
	if len([]rune(description)) > demandDescriptionMax {
		utils.ErrorResponse(c, 400, "The explanation is too long", nil)
		return
	}
	platform, okP := normalizeChoice(req.Platform, "both", "web", "mobile", "both")
	priority, okR := normalizeChoice(req.Priority, "normal", "normal", "urgent")
	if !okP || !okR {
		utils.ErrorResponse(c, 400, "Invalid platform or priority", nil)
		return
	}

	// Clean the page list: trimmed, no blanks, no duplicates.
	pages := make([]models.DemandPage, 0, len(req.Pages))
	seen := map[string]bool{}
	for _, p := range req.Pages {
		id := strings.TrimSpace(p.ID)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		pages = append(pages, models.DemandPage{ID: id, Name: strings.TrimSpace(p.Name)})
	}
	if len(pages) > demandPagesMax {
		utils.ErrorResponse(c, 400, "Too many pages selected", nil)
		return
	}
	pagesJSON, _ := json.Marshal(pages)

	// Name, email and account type always come from the logged-in account.
	var requester models.User
	if err := config.DB.First(&requester, "id = ?", userID).Error; err != nil {
		utils.ErrorResponse(c, 404, "User not found", nil)
		return
	}
	accountType := roleInCompany(userID, companyID)
	if accountType == "" {
		accountType = requester.Role
	}

	demand := models.PermissionDemand{
		RequesterID:    requester.ID,
		RequesterName:  requester.Name,
		RequesterEmail: requester.Email,
		AccountType:    accountType,
		Pages:          string(pagesJSON),
		PageList:       pages,
		Platform:       platform,
		Priority:       priority,
		Description:    description,
		Status:         demandStatusPending,
	}
	demand.CompanyID = companyID
	if recipient := resolveDemandRecipient(requester, companyID); recipient != nil {
		demand.RecipientID = &recipient.ID
		demand.RecipientName = recipient.Name
	}

	if err := config.DB.Create(&demand).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to send the demand", err.Error())
		return
	}
	utils.CreatedResponse(c, "Demand sent", demand)
}

// GetMyPermissionDemands - GET /demands/mine
func GetMyPermissionDemands(c *gin.Context) {
	userID, companyID, ok := demandContext(c)
	if !ok {
		utils.ErrorResponse(c, 401, "Not logged in", nil)
		return
	}
	demands := []models.PermissionDemand{}
	if err := config.DB.Where("company_id = ? AND requester_id = ?", companyID, userID).
		Order("created_at desc").Find(&demands).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to load demands", err.Error())
		return
	}
	utils.SuccessResponse(c, "Demands", demands)
}

// GetReceivedPermissionDemands - GET /demands/received
func GetReceivedPermissionDemands(c *gin.Context) {
	userID, companyID, ok := demandContext(c)
	if !ok {
		utils.ErrorResponse(c, 401, "Not logged in", nil)
		return
	}
	q := config.DB.Where("company_id = ?", companyID)
	if !isDemandAdmin(userID, companyID) {
		q = q.Where("recipient_id = ?", userID)
	}
	demands := []models.PermissionDemand{}
	if err := q.Order("CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at desc").
		Find(&demands).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to load demands", err.Error())
		return
	}
	utils.SuccessResponse(c, "Demands", demands)
}

// loadDemand finds a demand of the current company.
func loadDemand(c *gin.Context, companyID uuid.UUID) (*models.PermissionDemand, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid demand id", nil)
		return nil, false
	}
	var d models.PermissionDemand
	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.ErrorResponse(c, 404, "Demand not found", nil)
		} else {
			utils.ErrorResponse(c, 500, "Failed to load demand", err.Error())
		}
		return nil, false
	}
	return &d, true
}

// RespondPermissionDemand - PUT /demands/:id/respond
func RespondPermissionDemand(c *gin.Context) {
	userID, companyID, ok := demandContext(c)
	if !ok {
		utils.ErrorResponse(c, 401, "Not logged in", nil)
		return
	}
	var req respondDemandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid response", err.Error())
		return
	}
	status, okS := normalizeChoice(req.Status, "", demandStatusApproved, demandStatusRejected)
	if !okS || status == "" {
		utils.ErrorResponse(c, 400, "Status must be approved or rejected", nil)
		return
	}
	reply := strings.TrimSpace(req.Reply)
	if len([]rune(reply)) > demandReplyMax {
		utils.ErrorResponse(c, 400, "The reply is too long", nil)
		return
	}

	d, found := loadDemand(c, companyID)
	if !found {
		return
	}
	isRecipient := d.RecipientID != nil && *d.RecipientID == userID
	if !isRecipient && !isDemandAdmin(userID, companyID) {
		utils.ErrorResponse(c, 403, "This demand was not sent to you", nil)
		return
	}
	if d.Status != demandStatusPending {
		utils.ErrorResponse(c, 400, "This demand has already been answered", nil)
		return
	}

	var responder models.User
	config.DB.First(&responder, "id = ?", userID)
	now := time.Now()
	// Only a still-pending demand is updated, so two admins answering at the
	// same time cannot overwrite each other.
	res := config.DB.Model(&models.PermissionDemand{}).
		Where("id = ? AND company_id = ? AND status = ?", d.ID, companyID, demandStatusPending).
		Updates(map[string]interface{}{
			"status":            status,
			"reply":             reply,
			"responded_by_id":   userID,
			"responded_by_name": responder.Name,
			"responded_at":      now,
		})
	if res.Error != nil {
		utils.ErrorResponse(c, 500, "Failed to save the response", res.Error.Error())
		return
	}
	if res.RowsAffected == 0 {
		utils.ErrorResponse(c, 400, "This demand has already been answered", nil)
		return
	}
	d.Status = status
	d.Reply = reply
	d.RespondedByID = &userID
	d.RespondedByName = responder.Name
	d.RespondedAt = &now
	utils.SuccessResponse(c, "Response saved", d)
}

// CancelPermissionDemand - DELETE /demands/:id (requester, pending only)
func CancelPermissionDemand(c *gin.Context) {
	userID, companyID, ok := demandContext(c)
	if !ok {
		utils.ErrorResponse(c, 401, "Not logged in", nil)
		return
	}
	d, found := loadDemand(c, companyID)
	if !found {
		return
	}
	if d.RequesterID != userID {
		utils.ErrorResponse(c, 403, "You can only cancel your own demands", nil)
		return
	}
	if d.Status != demandStatusPending {
		utils.ErrorResponse(c, 400, "An answered demand cannot be cancelled", nil)
		return
	}
	if err := config.DB.Delete(&models.PermissionDemand{}, "id = ? AND company_id = ?", d.ID, companyID).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to cancel the demand", err.Error())
		return
	}
	utils.SuccessResponse(c, "Demand cancelled", gin.H{"id": d.ID})
}
