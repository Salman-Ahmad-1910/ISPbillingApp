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
		// (recoveryOfficerId set); otherwise keep the earlier one.
		var existing models.Area
		if config.DB.Where("id = ?", existingID).First(&existing).Error == nil {
			if existing.RecoveryOfficerID == nil && a.RecoveryOfficerID != nil {
				keep[k] = a.ID.String()
				deleteIDs = append(deleteIDs, existingID)
				continue
			}
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

	log.Printf("DedupeAreas: removed %d duplicate area row(s)", len(deleteIDs))
	return nil
}
