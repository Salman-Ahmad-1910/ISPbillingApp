import { useUser } from '@/hooks/use-user';
import type { User } from '@/lib/types';
import { hasPermission, hasAnyPermission, hasAllPermissions, getUserPermissions, hasMinimumRole, ROLES } from '@/lib/permissions';

export function usePermissions(user: User | null) {
  console.log('usePermissions received user:', user);
  const userRole = user?.role || ROLES.STAFF;
  console.log('Calculated userRole:', userRole);

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
