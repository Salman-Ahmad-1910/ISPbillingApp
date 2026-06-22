// Define valid roles
export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner', // Add owner role
  DEALER: 'dealer',
  RECOVERY: 'recovery_officer',
  SUB_DEALER: 'sub_dealer',
  STAFF: 'staff',
} as const;

// Define permissions for different roles
export const PERMISSIONS = {
  // Dashboard & Home
  DASHBOARD_VIEW: 'dashboard.view',
  SALES_SUMMARY_VIEW: 'sales_summary.view',
  ALERTS_VIEW: 'alerts.view',

  // Sales & Orders
  ORDERS_CREATE: 'orders.create',
  ORDERS_VIEW: 'orders.view',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_HISTORY_VIEW: 'orders.history.view',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_VIEW_ALLOCATED: 'inventory.view_allocated',
  INVENTORY_VIEW_DETAILS: 'inventory.view_details',
  INVENTORY_REQUEST_TRANSFER: 'inventory.request_transfer',

  // Invoices & Billing
  INVOICES_VIEW: 'invoices.view',
  INVOICES_DOWNLOAD: 'invoices.download',
  PAYMENTS_SUBMIT: 'payments.submit',

  // Returns
  RETURNS_CREATE: 'returns.create',
  RETURNS_TRACK: 'returns.track',

  // Reports
  REPORTS_SALES_VIEW: 'reports.sales.view',
  REPORTS_STOCK_MOVEMENT_VIEW: 'reports.stock_movement.view',
  REPORTS_OUTSTANDING_PAYMENTS_VIEW: 'reports.outstanding_payments.view',
  REPORTS_COLLECTIONS_VIEW: 'reports.collections.view',

  // Profile & Account
  PROFILE_MANAGE: 'profile.manage',
  PASSWORD_CHANGE: 'password.change',
  NOTIFICATIONS_MANAGE: 'notifications.manage',

  // Subscribers (for recovery officers)
  SUBSCRIBERS_VIEW: 'subscribers.view',
  SUBSCRIBERS_MANAGE: 'subscribers.manage',

  // Collections (for recovery officers)
  COLLECTIONS_VIEW: 'collections.view',
  COLLECTIONS_MANAGE: 'collections.manage',

  // Admin specific
  USERS_MANAGE: 'users.manage',
  DEALERS_MANAGE: 'dealers.manage',
  COMPANIES_MANAGE: 'companies.manage',
  SYSTEM_SETTINGS: 'system.settings',
  SUPPORT_TICKETS_VIEW: 'support.tickets.view',
} as const;

// Role permissions mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.ADMIN]: ['*'], // Admin has all permissions
  [ROLES.OWNER]: ['*'], // Owner has all permissions (equivalent to admin)
  [ROLES.DEALER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SALES_SUMMARY_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_HISTORY_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_VIEW_ALLOCATED,
    PERMISSIONS.INVENTORY_VIEW_DETAILS,
    PERMISSIONS.INVENTORY_REQUEST_TRANSFER,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_DOWNLOAD,
    PERMISSIONS.PAYMENTS_SUBMIT,
    PERMISSIONS.RETURNS_CREATE,
    PERMISSIONS.RETURNS_TRACK,
    PERMISSIONS.REPORTS_SALES_VIEW,
    PERMISSIONS.REPORTS_STOCK_MOVEMENT_VIEW,
    PERMISSIONS.REPORTS_OUTSTANDING_PAYMENTS_VIEW,
    PERMISSIONS.PROFILE_MANAGE,
    PERMISSIONS.PASSWORD_CHANGE,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
  ],
  [ROLES.RECOVERY]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SUBSCRIBERS_VIEW,
    PERMISSIONS.SUBSCRIBERS_MANAGE,
    PERMISSIONS.COLLECTIONS_VIEW,
    PERMISSIONS.COLLECTIONS_MANAGE,
    PERMISSIONS.REPORTS_COLLECTIONS_VIEW,
    PERMISSIONS.PROFILE_MANAGE,
    PERMISSIONS.PASSWORD_CHANGE,
  ],
  [ROLES.SUB_DEALER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_HISTORY_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_VIEW_DETAILS,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.RETURNS_CREATE,
    PERMISSIONS.RETURNS_TRACK,
    PERMISSIONS.REPORTS_SALES_VIEW,
    PERMISSIONS.PROFILE_MANAGE,
    PERMISSIONS.PASSWORD_CHANGE,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.PROFILE_MANAGE,
    PERMISSIONS.PASSWORD_CHANGE,
  ],
};

// Check if user has specific permission
export function hasPermission(userRole: string, permission: string): boolean {
  if (!userRole) return false;
  
  const userPermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  if (!userPermissions) return false;
  
  // Admin has all permissions
  if (userPermissions.includes('*')) return true;
  
  return userPermissions.includes(permission);
}

// Check if user has any of the specified permissions
export function hasAnyPermission(userRole: string, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

// Check if user has all specified permissions
export function hasAllPermissions(userRole: string, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

// Get user permissions list
export function getUserPermissions(userRole: string): string[] {
  return ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
}

// Role hierarchy for access control
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 5,
  [ROLES.OWNER]: 5, // Owner has same level as admin
  [ROLES.DEALER]: 4,
  [ROLES.RECOVERY]: 3,
  [ROLES.SUB_DEALER]: 2,
  [ROLES.STAFF]: 1,
} as const;

// Check if user has minimum role level
export function hasMinimumRole(userRole: string, minimumRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole as keyof typeof ROLE_HIERARCHY] || 0;
  return userLevel >= requiredLevel;
}
