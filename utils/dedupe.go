package utils

import (
	"log"

	"awesomeProject/config"
	"awesomeProject/models"
)

// DedupeAreas removes duplicate area rows that share the same
// (company, city, zone, locality, subLocality) identity, keeping a single row.
// This is a safety net for data that was duplicated by a previous area-assignment
// bug (each assignment inserted a brand new row with a new id).
func DedupeAreas() error {
	var areas []models.Area
	if err := config.DB.Order("created_at asc").Find(&areas).Error; err != nil {
		return err
	}

	type areaKey struct {
		company, city, zone, locality, sub string
	}

	keep := map[areaKey]string{}
	var deleteIDs []string

	// officerAssigned reports whether an area has any recovery officer assigned
	// via the area_officers join table.
	officerAssigned := func(areaID string) bool {
		var count int64
		config.DB.Model(&models.AreaOfficer{}).Where("area_id = ?", areaID).Count(&count)
		return count > 0
	}

	for _, a := range areas {
		k := areaKey{
			company:  a.CompanyID.String(),
			city:     a.City,
			zone:     a.Zone,
			locality: a.Locality,
			sub:      a.SubLocality,
		}

		existingID, ok := keep[k]
		if !ok {
			keep[k] = a.ID.String()
			continue
		}

		// Duplicate found. Prefer keeping the row that is assigned to an officer
		// (has rows in area_officers); otherwise keep the earlier one.
		if !officerAssigned(existingID) && officerAssigned(a.ID.String()) {
			keep[k] = a.ID.String()
			deleteIDs = append(deleteIDs, existingID)
			continue
		}
		deleteIDs = append(deleteIDs, a.ID.String())
	}

	if len(deleteIDs) == 0 {
		return nil
	}

	// Hard-delete the duplicate rows so they are fully removed, not just soft-deleted.
	if err := config.DB.Unscoped().Where("id IN ?", deleteIDs).Delete(&models.Area{}).Error; err != nil {
		return err
	}

	// Remove any officer assignments pointing at the deleted duplicate rows.
	if err := config.DB.Where("area_id IN ?", deleteIDs).Delete(&models.AreaOfficer{}).Error; err != nil {
		return err
	}

	log.Printf("DedupeAreas: removed %d duplicate area row(s)", len(deleteIDs))
	return nil
}
