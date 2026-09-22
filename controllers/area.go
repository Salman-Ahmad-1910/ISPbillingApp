package controllers

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// areaPayload renders an area with the ids of all assigned recovery officers.
// recoveryOfficerId is kept for backward compatibility (first assigned officer).
func areaPayload(a models.Area, officerIDs []string) gin.H {
	var legacy *string
	if len(officerIDs) > 0 {
		legacy = &officerIDs[0]
	}
	ids := officerIDs
	if ids == nil {
		ids = []string{}
	}
	return gin.H{
		"id":                a.ID,
		"companyId":         a.CompanyID,
		"city":              a.City,
		"zone":              a.Zone,
		"locality":          a.Locality,
		"subLocality":       a.SubLocality,
		"createdAt":         a.CreatedAt,
		"updatedAt":         a.UpdatedAt,
		"recoveryOfficerId": legacy,
		"recoveryOfficerIds": ids,
	}
}

func officerIDsByArea(c *gin.Context, companyID uuid.UUID) map[string][]string {
	var links []models.AreaOfficer
	if err := config.DB.Where("company_id = ?", companyID).Find(&links).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch area assignments", err.Error())
		return nil
	}
	byArea := make(map[string][]string)
	for _, l := range links {
		key := l.AreaID.String()
		byArea[key] = append(byArea[key], l.RecoveryOfficerID.String())
	}
	return byArea
}

// GetAreas returns all areas for the company with assigned officer ids.
func GetAreas(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var areas []models.Area
	if err := config.DB.Where("company_id = ?", companyID).Find(&areas).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch areas", err.Error())
		return
	}

	byArea := officerIDsByArea(c, companyID)
	if byArea == nil {
		return
	}

	payload := make([]gin.H, 0, len(areas))
	for _, a := range areas {
		payload = append(payload, areaPayload(a, byArea[a.ID.String()]))
	}

	utils.SuccessResponse(c, "Records retrieved", payload)
}

// FindArea returns a single area with its assigned officer ids.
func FindArea(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	var area models.Area
	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).First(&area).Error; err != nil {
		utils.ErrorResponse(c, 404, "Area not found", err.Error())
		return
	}

	var links []models.AreaOfficer
	if err := config.DB.Where("area_id = ? AND company_id = ?", area.ID, companyID).Find(&links).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch area assignments", err.Error())
		return
	}

	officerIDs := make([]string, 0, len(links))
	for _, l := range links {
		officerIDs = append(officerIDs, l.RecoveryOfficerID.String())
	}

	utils.SuccessResponse(c, "Record found", areaPayload(area, officerIDs))
}

// CreateArea creates a new area for the company context.
func CreateArea(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)

	var entity models.Area
	if err := c.ShouldBindJSON(&entity); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	entity.CompanyID = companyID

	if err := config.DB.Create(&entity).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create record", err.Error())
		return
	}

	utils.CreatedResponse(c, "Record created", areaPayload(entity, []string{}))
}

// UpdateArea updates the location fields of an existing area.
// Assignment changes are handled by AssignAreaOfficer / UnassignAreaOfficer.
func UpdateArea(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	var entity models.Area
	if err := c.ShouldBindJSON(&entity); err != nil {
		utils.ErrorResponse(c, 400, "Invalid update data", err.Error())
		return
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid area id", id)
		return
	}
	entity.ID = parsedID
	entity.CompanyID = companyID

	db := config.DB.Model(&models.Area{}).Where("company_id = ? AND id = ?", companyID, parsedID)
	if err := db.Session(&gorm.Session{FullSaveAssociations: true}).Save(&entity).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update record", err.Error())
		return
	}

	var links []models.AreaOfficer
	if err := config.DB.Where("area_id = ? AND company_id = ?", parsedID, companyID).Find(&links).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to fetch area assignments", err.Error())
		return
	}
	officerIDs := make([]string, 0, len(links))
	for _, l := range links {
		officerIDs = append(officerIDs, l.RecoveryOfficerID.String())
	}

	utils.SuccessResponse(c, "Record updated", areaPayload(entity, officerIDs))
}

// DeleteArea removes an area along with its officer assignments.
func DeleteArea(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	parsedID, err := uuid.Parse(id)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid area id", id)
		return
	}

	db := config.DB.Where("company_id = ? AND id = ?", companyID, parsedID)
	if err := db.Delete(&models.Area{}).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete record", err.Error())
		return
	}

	if err := config.DB.Where("area_id = ? AND company_id = ?", parsedID, companyID).Delete(&models.AreaOfficer{}).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete area assignments", err.Error())
		return
	}

	utils.SuccessResponse(c, "Record deleted", nil)
}

type assignOfficerRequest struct {
	RecoveryOfficerID uuid.UUID `json:"recoveryOfficerId"`
}

// AssignAreaOfficer adds a recovery officer to an area (idempotent).
func AssignAreaOfficer(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	areaID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid area id", c.Param("id"))
		return
	}

	var req assignOfficerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}
	if req.RecoveryOfficerID == uuid.Nil {
		utils.ErrorResponse(c, 400, "recoveryOfficerId is required", nil)
		return
	}

	var areaCount int64
	if err := config.DB.Model(&models.Area{}).Where("id = ? AND company_id = ?", areaID, companyID).Count(&areaCount).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to load area", err.Error())
		return
	}
	if areaCount == 0 {
		utils.ErrorResponse(c, 404, "Area not found", nil)
		return
	}

	var link models.AreaOfficer
	err = config.DB.Where("area_id = ? AND recovery_officer_id = ? AND company_id = ?", areaID, req.RecoveryOfficerID, companyID).First(&link).Error
	if err == gorm.ErrRecordNotFound {
		// Purge any soft-deleted leftover row so re-assigning the same
		// (area, officer) pair does not violate the unique index.
		config.DB.Unscoped().Where("area_id = ? AND recovery_officer_id = ? AND company_id = ?", areaID, req.RecoveryOfficerID, companyID).Delete(&models.AreaOfficer{})
		link = models.AreaOfficer{
			CompanyID:         companyID,
			AreaID:            areaID,
			RecoveryOfficerID: req.RecoveryOfficerID,
		}
		if err := config.DB.Create(&link).Error; err != nil {
			utils.ErrorResponse(c, 500, "Failed to assign officer", err.Error())
			return
		}
	} else if err != nil {
		utils.ErrorResponse(c, 500, "Failed to load assignment", err.Error())
		return
	}

	utils.SuccessResponse(c, "Officer assigned to area", nil)
}

// UnassignAreaOfficer removes a recovery officer from an area (idempotent).
func UnassignAreaOfficer(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	areaID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid area id", c.Param("id"))
		return
	}

	var req assignOfficerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}
	if req.RecoveryOfficerID == uuid.Nil {
		utils.ErrorResponse(c, 400, "recoveryOfficerId is required", nil)
		return
	}

	if err := config.DB.Unscoped().Where("area_id = ? AND recovery_officer_id = ? AND company_id = ?", areaID, req.RecoveryOfficerID, companyID).Delete(&models.AreaOfficer{}).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to unassign officer", err.Error())
		return
	}

	utils.SuccessResponse(c, "Officer unassigned from area", nil)
}