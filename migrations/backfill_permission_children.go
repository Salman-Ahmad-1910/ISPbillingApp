package migrations

import (
	"fmt"
	"log"

	"awesomeProject/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// pageChildPermission is one row of PAGE_PERMISSIONS in
// client/src/lib/permission-pages.ts, flattened to its two ids. This list is the
// authority for the backfill and must be kept in sync with that map, otherwise
// the two drift and a user's buttons stop matching the Roles page.
type pageChildPermission struct {
	parentID string
	childID  string
}

// childPermissions mirrors PAGE_PERMISSIONS. The full list is included, not just
// the most recently added pages, so the backfill stays a single idempotent pass
// that repairs any user who was configured before a given child existed.
var childPermissions = []pageChildPermission{
	// Network
	{"13309", "13309:create"}, {"13309", "13309:update"}, {"13309", "13309:delete"},
	{"15365", "15365:create"}, {"15365", "15365:update"}, {"15365", "15365:delete"},
	{"15366", "15366:create"}, {"15366", "15366:update"}, {"15366", "15366:delete"},
	{"15367", "15367:create"}, {"15367", "15367:update"}, {"15367", "15367:delete"},
	{"13314", "13314:create"}, {"13314", "13314:update"}, {"13314", "13314:delete"},

	// Subscriber Management
	{"13315", "13315:cards"}, {"13315", "13315:bulk-edit"}, {"13315", "13315:import-export"},
	{"13315", "13315:create"}, {"13315", "13315:update"}, {"13315", "13315:delete"},
	{"13315", "13315:status"},
	{"13316", "13316:summary"}, {"13316", "13316:create"}, {"13316", "13316:update"}, {"13316", "13316:delete"},
	{"15368", "15368:summary"}, {"15368", "15368:create"}, {"15368", "15368:update"}, {"15368", "15368:delete"},
	{"13313", "13313:summary"}, {"13313", "13313:create"}, {"13313", "13313:update"}, {"13313", "13313:delete"},

	// Recovery Officer
	{"13317", "13317:summary"}, {"13317", "13317:create"}, {"13317", "13317:update"}, {"13317", "13317:delete"},
	{"13319", "13319:officer-select"},

	// Transactions
	{"13304", "13304:summary"}, {"13304", "13304:search"},
	{"13304", "13304:create"}, {"13304", "13304:update"}, {"13304", "13304:delete"},
	{"13321", "13321:summary"}, {"13321", "13321:search"},
	{"13321", "13321:create"}, {"13321", "13321:update"}, {"13321", "13321:delete"},
	{"13305", "13305:summary"}, {"13305", "13305:search"}, {"13305", "13305:create"},
	{"13357", "13357:summary"}, {"13357", "13357:search"}, {"13357", "13357:create"},
	{"13324", "13324:create"}, {"13324", "13324:update"}, {"13324", "13324:delete"},
	{"13320", "13320:create"}, {"13320", "13320:delete"},

	// Dealer Management
	{"13318", "13318:create"}, {"13318", "13318:update"},
	{"13318", "13318:change-status"}, {"13318", "13318:delete"},
	{"15385", "15385:dealer-select"}, {"15385", "15385:summary"},
	{"13331", "13331:filters"}, {"13331", "13331:summary"}, {"13331", "13331:export"},
	{"13332", "13332:filters"}, {"13332", "13332:summary"}, {"13332", "13332:export"},
	{"13333", "13333:filters"}, {"13333", "13333:summary"}, {"13333", "13333:export"},
	{"13350", "13350:filters"}, {"13350", "13350:summary"}, {"13350", "13350:export"},

	// Sales
	{"15336", "15336:summary"}, {"15336", "15336:create"}, {"15336", "15336:update"}, {"15336", "15336:delete"},
	{"15370", "15370:create"}, {"15370", "15370:update"}, {"15370", "15370:delete"},
	{"15337", "15337:create"}, {"15337", "15337:update"}, {"15337", "15337:delete"},
	{"15338", "15338:products"}, {"15338", "15338:order-detail"},

	// Inventory
	{"15309", "15309:create"}, {"15309", "15309:update"}, {"15309", "15309:delete"},
	{"15310", "15310:create"}, {"15310", "15310:update"}, {"15310", "15310:delete"},
	{"15311", "15311:create"}, {"15311", "15311:update"}, {"15311", "15311:delete"},
	{"15312", "15312:create"}, {"15312", "15312:update"}, {"15312", "15312:delete"},
	{"15321", "15321:create"}, {"15321", "15321:update"}, {"15321", "15321:delete"},
	{"15372", "15372:create"}, {"15372", "15372:update"}, {"15372", "15372:delete"},
	{"15372", "15372:print"}, {"15372", "15372:summary"},
	{"15313", "15313:create"}, {"15313", "15313:update"}, {"15313", "15313:delete"},
	{"15315", "15315:update"}, {"15315", "15315:delete"},

	// Complain
	{"15323", "15323:create"}, {"15323", "15323:update"}, {"15323", "15323:delete"},
	{"15325", "15325:create"}, {"15325", "15325:update"}, {"15325", "15325:delete"},
	{"13342", "13342:create"}, {"13342", "13342:update"}, {"13342", "13342:delete"},
	{"13343", "13343:update"}, {"13343", "13343:delete"},

	// Messages
	{"13347", "13347:create"}, {"13347", "13347:delete"},
	{"13344", "13344:create"}, {"13344", "13344:update"}, {"13344", "13344:delete"},
	{"13359", "13359:delete"},
	{"13346", "13346:delete"},
	{"13345", "13345:delete"},

	// Accounts
	{"13322", "13322:create"}, {"13322", "13322:update"}, {"13322", "13322:delete"},
	{"13323", "13323:create"}, {"13323", "13323:update"}, {"13323", "13323:delete"},
	{"13341", "13341:update"}, {"13341", "13341:delete"},

	// Human Resources
	{"15316", "15316:create"}, {"15316", "15316:update"}, {"15316", "15316:delete"},
	{"15318", "15318:create"},
	{"15322", "15322:create"}, {"15322", "15322:update"},
	{"15317", "15317:create"}, {"15317", "15317:update"}, {"15317", "15317:delete"},

	// Stock Reports / Sales Reports. These are view-only pages: they gate their
	// filters, summary cards and Print / Excel pair, and never mutate a record, so
	// they declare no CRUD keys.
	{"15319", "15319:filters"}, {"15319", "15319:summary"}, {"15319", "15319:export"},
	{"15320", "15320:filters"}, {"15320", "15320:summary"}, {"15320", "15320:export"},

	// Subscriber Reports. Read-only report pages: they gate filters, summary
	// cards and the Print / Excel pair, and never mutate a record. Several ids
	// unlock the same route, so each one carries the full set and the frontend
	// resolves a page's children against all of its ids.
	{"13326", "13326:filters"}, {"13326", "13326:summary"}, {"13326", "13326:export"},
	{"13330", "13330:filters"}, {"13330", "13330:summary"}, {"13330", "13330:export"},
	{"13356", "13356:filters"}, {"13356", "13356:summary"}, {"13356", "13356:export"},
	{"13358", "13358:filters"}, {"13358", "13358:summary"}, {"13358", "13358:export"},
	{"13306", "13306:filters"}, {"13306", "13306:summary"}, {"13306", "13306:export"},
	{"13307", "13307:filters"}, {"13307", "13307:summary"}, {"13307", "13307:export"},
	{"13325", "13325:filters"}, {"13325", "13325:summary"}, {"13325", "13325:export"},
	{"13353", "13353:filters"}, {"13353", "13353:summary"}, {"13353", "13353:export"},
	{"13328", "13328:filters"}, {"13328", "13328:summary"}, {"13328", "13328:export"},
	{"13329", "13329:filters"}, {"13329", "13329:summary"}, {"13329", "13329:export"},
	{"13355", "13355:filters"}, {"13355", "13355:summary"}, {"13355", "13355:export"},
	{"13354", "13354:filters"}, {"13354", "13354:summary"}, {"13354", "13354:export"},
	{"13349", "13349:filters"}, {"13349", "13349:summary"}, {"13349", "13349:export"},
	{"13327", "13327:filters"}, {"13327", "13327:summary"}, {"13327", "13327:export"},
	{"15327", "15327:filters"}, {"15327", "15327:summary"}, {"15327", "15327:export"},
	{"15329", "15329:filters"}, {"15329", "15329:summary"}, {"15329", "15329:export"},
	{"15330", "15330:filters"}, {"15330", "15330:summary"}, {"15330", "15330:export"},
	{"15331", "15331:filters"}, {"15331", "15331:summary"}, {"15331", "15331:export"},
	{"15332", "15332:filters"}, {"15332", "15332:summary"}, {"15332", "15332:export"},
	{"15382", "15382:filters"}, {"15382", "15382:summary"}, {"15382", "15382:export"},
	{"15383", "15383:filters"}, {"15383", "15383:summary"}, {"15383", "15383:export"},
	{"15380", "15380:filters"}, {"15380", "15380:summary"}, {"15380", "15380:export"},
	{"15381", "15381:filters"}, {"15381", "15381:summary"}, {"15381", "15381:export"},
}

func permissionKey(userID, companyID uuid.UUID, permissionID string) string {
	return userID.String() + "|" + companyID.String() + "|" + permissionID
}

// BackfillUserPermissionChildren materialises the inherited child state that the
// Roles & Permissions page already displays, so introducing a new child
// permission never silently removes a button from an existing user.
//
// Why this is needed: when an admin opens a user on the Roles page, any child
// that has never been saved inherits its parent's checkbox. But a user's live
// session reads granted ids straight from user_permissions, so a child added
// after that user was configured is simply absent. Without this pass, deploying
// a new child permission would flip an inherited "on" to off.
//
// The pass is strictly additive and idempotent:
//
//   - it never updates or deletes an existing row, so a child an admin
//     deliberately switched off (stored as web_enabled = false) stays off;
//   - it only inserts a child where no row exists for that user/company/child;
//   - it copies the parent's own web/mobile flags, so the stored result is
//     exactly the state the Roles page renders for that user.
//
// A user with no rows at all is left untouched: loadUserPermissionSet treats
// them as not configured and therefore permitted, which is the intended
// behaviour for installs that have never used per-user permissions.
func BackfillUserPermissionChildren(db *gorm.DB) error {
	childIDs := make(map[string]struct{}, len(childPermissions))
	childrenByParent := make(map[string][]string, len(childPermissions))
	for _, c := range childPermissions {
		childIDs[c.childID] = struct{}{}
		childrenByParent[c.parentID] = append(childrenByParent[c.parentID], c.childID)
	}

	var existing []models.UserPermission
	if err := db.Find(&existing).Error; err != nil {
		return fmt.Errorf("load user permissions: %w", err)
	}

	// Index what is already stored. GORM excludes soft-deleted rows, so a
	// re-granted permission is repaired rather than shadowed by its tombstone.
	have := make(map[string]struct{}, len(existing))
	for _, p := range existing {
		have[permissionKey(p.UserID, p.CompanyID, p.PermissionID)] = struct{}{}
	}

	var toInsert []models.UserPermission
	for _, p := range existing {
		if _, isChild := childIDs[p.PermissionID]; isChild {
			continue
		}
		for _, childID := range childrenByParent[p.PermissionID] {
			key := permissionKey(p.UserID, p.CompanyID, childID)
			if _, already := have[key]; already {
				continue
			}
			have[key] = struct{}{}
			toInsert = append(toInsert, models.UserPermission{
				UserID:        p.UserID,
				PermissionID:  childID,
				WebEnabled:    p.WebEnabled,
				MobileEnabled: p.MobileEnabled,
				CompanyID:     p.CompanyID,
			})
		}
	}

	if len(toInsert) == 0 {
		return nil
	}

	// Chunked so a large install never builds one oversized INSERT.
	const chunk = 500
	for start := 0; start < len(toInsert); start += chunk {
		end := start + chunk
		if end > len(toInsert) {
			end = len(toInsert)
		}
		if err := db.CreateInBatches(toInsert[start:end], chunk).Error; err != nil {
			return fmt.Errorf("insert inherited child permissions: %w", err)
		}
	}

	log.Printf("Backfilled %d inherited child permission row(s)", len(toInsert))
	return nil
}
