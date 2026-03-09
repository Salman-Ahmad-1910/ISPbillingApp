import React from 'react';
import { useUserPermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  minimumRole?: string;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ 
  children, 
  permission, 
  permissions, 
  requireAll = false,
  minimumRole,
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasMinimumRole } = useUserPermissions();

  // Check minimum role requirement
  if (minimumRole && !hasMinimumRole(minimumRole)) {
    return <>{fallback}</>;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasPermissionAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasPermissionAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Higher-order component for permission checking
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGuard permission={permission}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

// Higher-order component for role checking
export function withMinimumRole<P extends object>(
  Component: React.ComponentType<P>,
  minimumRole: string
) {
  return function RoleWrapper(props: P) {
    return (
      <PermissionGuard minimumRole={minimumRole}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
