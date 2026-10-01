package migrations

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

// The child permission ids that gate the UI live in
// client/src/lib/permission-pages.ts, and the ones used by the server-side
// guards live in middleware/permissions.go. The backfill list above is a third
// copy. Three copies of the same data will drift, and a drift here is silent and
// user-visible in the worst way: the Roles page shows a checkbox, the guard
// checks a different id, and a user who was granted the button cannot use it.
//
// This test parses PAGE_PERMISSIONS straight out of the TypeScript source and
// fails when the Go list disagrees, so the copies cannot diverge unnoticed.

const permissionPagesTS = "../client/src/lib/permission-pages.ts"

var (
	// export const AREA_PERMISSION = '13309';
	stringConstRe = regexp.MustCompile(`export const (\w+)\s*=\s*'([^']+)';`)
	// const NAME: PageChildPermission[] = [ ... ]
	childrenConstRe = regexp.MustCompile(
		`(?s)(?:export\s+)?const\s+(\w+)\s*:\s*PageChildPermission\[\]\s*=\s*\[(.*?)\n\]`)
	// { key: 'create', label: 'Create' },   ...OTHER_CHILDREN,
	childTokenRe = regexp.MustCompile(`\{\s*key:\s*'([^']+)'|\.\.\.(\w+)\s*,`)
	// [AREA_PERMISSION]: { name: 'Area', children: CRUD_CHILDREN },
	pageEntryRe = regexp.MustCompile(
		`\[(?:'([^']*)'|(\w+))\]\s*:\s*\{\s*name:\s*'[^']*',\s*children:\s*(\w+)\s*\}`)
	// '13326' inside a *_PERMISSIONS id array
	stringIDRe = regexp.MustCompile(`'([^']+)'`)
)

// resolveChildren expands a *_CHILDREN const, following any spreads so a const
// defined as "...CRUD_CHILDREN" resolves to the same keys the runtime produces.
func resolveChildren(
	t *testing.T,
	name string,
	body [][]string,
	seen map[string]bool,
) []string {
	t.Helper()
	if seen[name] {
		t.Fatalf("children constant %q is defined recursively", name)
	}
	seen[name] = true
	defer delete(seen, name)

	for _, m := range body {
		if m[1] != name {
			continue
		}
		// Walk the literal and spread tokens in source order so a composed
		// constant resolves to the same sequence the runtime produces.
		keys := []string{}
		for _, token := range childTokenRe.FindAllStringSubmatch(m[2], -1) {
			if token[1] != "" {
				keys = append(keys, token[1])
				continue
			}
			keys = append(keys, resolveChildren(t, token[2], body, seen)...)
		}
		return keys
	}
	t.Fatalf("children constant %q is referenced but never defined", name)
	return nil
}

// parsePermissionPagesTS returns parent id -> ordered child keys as declared by
// PAGE_PERMISSIONS. It t.Fatal()s rather than returning an empty map when the
// source shape is not recognised, so a refactor of the TypeScript cannot turn
// this test into a silent no-op.
func parsePermissionPagesTS(t *testing.T) map[string][]string {
	t.Helper()

	raw, err := os.ReadFile(permissionPagesTS)
	if err != nil {
		t.Fatalf("read %s: %v", permissionPagesTS, err)
	}
	src := string(raw)

	pageStart := strings.Index(src, "export const PAGE_PERMISSIONS")
	if pageStart < 0 {
		t.Fatalf("%s no longer declares PAGE_PERMISSIONS; update this test", permissionPagesTS)
	}

	// Permission ids are referenced through constants, so resolve those first.
	stringConsts := map[string]string{}
	for _, m := range stringConstRe.FindAllStringSubmatch(src, -1) {
		stringConsts[m[1]] = m[2]
	}

	childrenDefs := childrenConstRe.FindAllStringSubmatch(src, -1)
	if len(childrenDefs) == 0 {
		t.Fatalf("could not parse any PageChildPermission definition from %s", permissionPagesTS)
	}

	pages := map[string][]string{}
	for _, m := range pageEntryRe.FindAllStringSubmatch(src[pageStart:], -1) {
		// The map key is either a quoted literal or a *_PERMISSION constant.
		parent := m[1]
		if parent == "" {
			resolved, ok := stringConsts[m[2]]
			if !ok {
				t.Fatalf("PAGE_PERMISSIONS key %q is neither a literal nor a known constant", m[2])
			}
			parent = resolved
		}
		if _, ok := pages[parent]; ok {
			t.Fatalf("PAGE_PERMISSIONS declares parent %s more than once", parent)
		}
		pages[parent] = resolveChildren(t, m[3], childrenDefs, map[string]bool{})
	}
	if len(pages) == 0 {
		t.Fatalf("could not parse any PAGE_PERMISSIONS entries from %s", permissionPagesTS)
	}
	return pages
}

// TestChildPermissionsMatchFrontend is the drift guard described above.
func TestChildPermissionsMatchFrontend(t *testing.T) {
	frontend := parsePermissionPagesTS(t)

	// Flatten the Go list, rejecting a duplicate entry, which would otherwise
	// cause a second insert attempt for the same row.
	goList := map[string][]string{}
	for _, c := range childPermissions {
		if seen := goList[c.parentID]; len(seen) > 0 {
			for _, existing := range seen {
				if existing == c.childID {
					t.Errorf("childPermissions lists %q twice", c.childID)
				}
			}
		}
		goList[c.parentID] = append(goList[c.parentID], c.childID)
		if !strings.HasPrefix(c.childID, c.parentID+":") {
			t.Errorf("child %q does not use the %q: prefix", c.childID, c.parentID)
		}
	}

	for parent, want := range frontend {
		got := goList[parent]
		if len(got) != len(want) {
			t.Errorf("parent %s: backend has %d children, frontend has %d", parent, len(got), len(want))
			continue
		}
		for i := range want {
			if got[i] != parent+":"+want[i] {
				t.Errorf("parent %s child %d: backend %q, frontend %q", parent, i, got[i], parent+":"+want[i])
			}
		}
	}

	for parent := range goList {
		if _, ok := frontend[parent]; !ok {
			t.Errorf("backend has children for parent %s but PAGE_PERMISSIONS does not", parent)
		}
	}
}

// TestChildPermissionsAreUnique guards the insert loop: a duplicated child id
// would otherwise be inserted twice, since user_permissions has no unique
// constraint to catch it.
func TestChildPermissionsAreUnique(t *testing.T) {
	seen := map[string]bool{}
	for _, c := range childPermissions {
		if seen[c.childID] {
			t.Errorf("duplicate child permission id %q", c.childID)
		}
		seen[c.childID] = true
	}
}

// TestPagePermissionArraysResolve guards the SUBSCRIBER_REPORT_*_PERMISSIONS
// arrays that the pages pass to usePagePermissions. PERMISSION_PAGES maps several
// ids onto one route, so each page resolves its children against a list of ids
// declared separately from PAGE_PERMISSIONS. If one of those ids lost its
// PAGE_PERMISSIONS entry, usePagePermissions would quietly resolve every `can`
// call to false and the page would render with no controls at all - no error, no
// failing build, just an empty report. Fail here instead.
func TestPagePermissionArraysResolve(t *testing.T) {
	frontend := parsePermissionPagesTS(t)

	raw, err := os.ReadFile(permissionPagesTS)
	if err != nil {
		t.Fatalf("read %s: %v", permissionPagesTS, err)
	}

	// export const SUBSCRIBER_REPORT_*_PERMISSIONS = ['13326', '13330', ...];
	arr := regexp.MustCompile(`export const (\w+_PERMISSIONS)\s*=\s*\[([^\]]*)\]`)
	found := 0
	for _, m := range arr.FindAllStringSubmatch(string(raw), -1) {
		ids := stringIDRe.FindAllStringSubmatch(m[2], -1)
		if len(ids) == 0 {
			t.Errorf("%s declares no permission ids; it cannot be a page id list", m[1])
			continue
		}
		found++
		for _, id := range ids {
			if _, ok := frontend[id[1]]; !ok {
				t.Errorf("%s lists %q but PAGE_PERMISSIONS declares no children for it, "+
					"so can() would be permanently false on the page", m[1], id[1])
			}
		}
	}
	if found == 0 {
		t.Errorf("no *_PERMISSIONS id arrays found in %s; update this test", permissionPagesTS)
	}
}
