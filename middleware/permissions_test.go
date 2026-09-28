package middleware

import "testing"

// TestUserPermissionSetSemantics locks in the rules the frontend relies on, so a
// refactor cannot silently start allowing or denying the wrong operations.
func TestUserPermissionSetSemantics(t *testing.T) {
	ids := func(list ...string) map[string]bool {
		m := make(map[string]bool, len(list))
		for _, id := range list {
			m[id] = true
		}
		return m
	}

	tests := []struct {
		name string
		set  userPermissionSet
		// crud check inputs
		pageID string
		action string
		crud   bool
		// feature check inputs
		featureKey string
		feature    bool
	}{
		{
			name:       "admin bypasses everything",
			set:        userPermissionSet{isAdmin: true},
			pageID:     AreaPermission,
			action:     ActionDelete,
			crud:       true,
			featureKey: FeatureSummary,
			feature:    true,
		},
		{
			name:       "unconfigured user is permitted (no rows yet)",
			set:        userPermissionSet{},
			pageID:     AreaPermission,
			action:     ActionDelete,
			crud:       true,
			featureKey: FeatureSummary,
			feature:    true,
		},
		{
			name:        "configured user granted page child is permitted",
			set:         userPermissionSet{configured: true, granted: ids(ChildPermissionID(AreaPermission, ActionDelete))},
			pageID:      AreaPermission,
			action:      ActionDelete,
			crud:        true,
			featureKey:  FeatureSummary,
			feature:     false,
		},
		{
			name:        "configured user without the child is denied",
			set:         userPermissionSet{configured: true, granted: ids(ChildPermissionID(AreaPermission, ActionCreate))},
			pageID:      AreaPermission,
			action:      ActionDelete,
			crud:        false,
			featureKey:  FeatureSummary,
			feature:     false,
		},
		{
			name:        "global delete switch grants delete on any page",
			set:         userPermissionSet{configured: true, granted: ids(CanDeletePermission)},
			pageID:      OltPermission,
			action:      ActionDelete,
			crud:        true,
			featureKey:  FeatureSummary,
			feature:     false,
		},
		{
			name:        "global create does not grant delete",
			set:         userPermissionSet{configured: true, granted: ids(CanCreatePermission)},
			pageID:      OltPermission,
			action:      ActionDelete,
			crud:        false,
			featureKey:  FeatureSummary,
			feature:     false,
		},
		{
			name:        "granting the parent page id alone grants nothing",
			set:         userPermissionSet{configured: true, granted: ids(AreaPermission)},
			pageID:      AreaPermission,
			action:      ActionUpdate,
			crud:        false,
			featureKey:  FeatureSummary,
			feature:     false,
		},
		{
			name:        "global update grants crud but never a page feature",
			set:         userPermissionSet{configured: true, granted: ids(CanUpdatePermission)},
			pageID:      SubscriberDetailPermission,
			action:      ActionUpdate,
			crud:        true,
			featureKey:  FeatureStatus,
			feature:     false,
		},
		{
			name:        "child of one page does not unlock another page",
			set:         userPermissionSet{configured: true, granted: ids(ChildPermissionID(AreaPermission, ActionUpdate))},
			pageID:      PopPermission,
			action:      ActionUpdate,
			crud:        false,
			featureKey:  FeatureSummary,
			feature:     false,
		},
		{
			name:        "explicit status child grants the status feature",
			set:         userPermissionSet{configured: true, granted: ids(ChildPermissionID(SubscriberDetailPermission, FeatureStatus))},
			pageID:      SubscriberDetailPermission,
			action:      ActionUpdate,
			crud:        false,
			featureKey:  FeatureStatus,
			feature:     true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.set.hasCrud(tc.pageID, tc.action); got != tc.crud {
				t.Errorf("hasCrud(%q, %q) = %v, want %v", tc.pageID, tc.action, got, tc.crud)
			}
			if got := tc.set.hasPageFeature(tc.pageID, tc.featureKey); got != tc.feature {
				t.Errorf("hasPageFeature(%q, %q) = %v, want %v", tc.pageID, tc.featureKey, got, tc.feature)
			}
		})
	}
}

func TestChildPermissionIDFormat(t *testing.T) {
	if got := ChildPermissionID("13309", "create"); got != "13309:create" {
		t.Errorf("ChildPermissionID = %q, want %q", got, "13309:create")
	}
}

func TestCrudActionForMethod(t *testing.T) {
	cases := map[string]struct {
		want   string
		mapped bool
	}{
		"POST":   {ActionCreate, true},
		"PUT":    {ActionUpdate, true},
		"PATCH":  {ActionUpdate, true},
		"DELETE": {ActionDelete, true},
		"GET":    {"", false},
		"HEAD":   {"", false},
	}

	for method, want := range cases {
		got, mapped := crudActionForMethod(method)
		if got != want.want || mapped != want.mapped {
			t.Errorf("crudActionForMethod(%q) = (%q, %v), want (%q, %v)", method, got, mapped, want.want, want.mapped)
		}
	}
}
