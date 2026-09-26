import { useUser } from '@/hooks/use-user';
import type { User } from '@/lib/types';
import { hasPermission, hasAnyPermission, hasAllPermissions, getUserPermissions, hasMinimumRole, ROLES } from '@/lib/permissions';
import { hasFeaturePermission, hasCrudPermission, hasPagePermission } from '@/lib/permission-pages';

export function usePermissions(user: User | null) {
  const userRole = user?.role || ROLES.STAFF;

  return {
    // Permission checking functions
    hasPermission: (permission: string) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: string[]) => hasAllPermissions(userRole, permissions),
    
    // Role checking functions
    hasMinimumRole: (minimumRole: string) => hasMinimumRole(userRole, minimumRole),
    isAdmin: () => userRole === ROLES.ADMIN, // Admin role only
    isDealer: () => userRole === ROLES.DEALER,
    isRecovery: () => userRole === ROLES.RECOVERY,
    isSubDealer: () => userRole === ROLES.SUB_DEALER,
    isStaff: () => userRole === ROLES.STAFF,
    
    // Get user info
    userRole,
    userPermissions: getUserPermissions(userRole),
    // Per-user permissions granted on the Roles & Permissions page
    grantedPermissions: user?.permissions || [],
    permissionsConfigured: user?.permissionsConfigured || false,
    user,
  };
}

// Wrapper hook that automatically gets user data
export function useUserPermissions() {
  const { user } = useUser();
  // Handle nested user structure - extract actual user data
  let actualUser: User | null = null;
  if (user && typeof user === 'object' && 'user' in user) {
    actualUser = (user as any).user;
  } else {
    actualUser = user as User | null;
  }
  return usePermissions(actualUser);
}

// CRUD (Add/Create, Update, Delete) operation permissions.
//
// Pass the page's own permission id (e.g. AREA_PERMISSION) to gate the buttons
// with that page's own Create / Update / Delete children; the global "CRUD"
// checkboxes on the Roles & Permissions page act as an app-wide fallback.
// Admin and Owner roles always bypass, exactly like hasFeaturePermission.
export function useCrudPermissions(pagePermissionId?: string) {
  const perms = useUserPermissions();
  const isAdmin = perms.isAdmin() || perms.userRole === ROLES.OWNER;
  const granted = perms.grantedPermissions || [];
  const configured = perms.permissionsConfigured;

  const check = (action: 'create' | 'update' | 'delete') =>
    hasCrudPermission(granted, configured, isAdmin, pagePermissionId, action);

  return {
    canCreate: check('create'),
    canUpdate: check('update'),
    canDelete: check('delete'),
  };
}

// Per-page feature permissions (cards, bulk edit, import/export, status, ...).
//
// Unlike the CRUD actions above, these exist on a single page only, so they are
// governed purely by that page's own child permission - there is no global
// fallback. Pass the page permission id (e.g. SUBSCRIBER_DETAIL_PERMISSION) and
// call `can` with the child key declared in PAGE_PERMISSIONS.
export function usePagePermissions(pagePermissionId: string) {
  const perms = useUserPermissions();
  const isAdmin = perms.isAdmin() || perms.userRole === ROLES.OWNER;
  const granted = perms.grantedPermissions || [];
  const configured = perms.permissionsConfigured;

  return {
    can: (key: string) => hasPagePermission(granted, configured, isAdmin, pagePermissionId, key),
  };
}
