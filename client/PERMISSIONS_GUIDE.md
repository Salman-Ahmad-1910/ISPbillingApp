# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This ERP system implements a comprehensive role-based access control (RBAC) system that restricts user access to specific pages, features, and actions based on their assigned role.

## Available Roles

1. **Admin** (`admin`) - Full system access
2. **Dealer** (`dealer`) - Can manage sales, inventory, and view business reports
3. **Recovery Officer** (`recovery_officer`) - Can manage collections and subscriber accounts
4. **Sub-Dealer** (`sub_dealer`) - Limited access to basic sales operations
5. **Staff** (`staff`) - Basic view-only access

## Permission System

### Core Components

1. **`/lib/permissions.ts`** - Defines roles, permissions, and permission checking functions
2. **`/hooks/usePermissions.ts`** - React hook for checking permissions in components
3. **`/components/PermissionGuard.tsx`** - Component to conditionally render content based on permissions

### Using the Permission System

#### 1. Import Required Modules

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PERMISSIONS, ROLES } from '@/lib/permissions';
```

#### 2. Check Permissions in Components

```typescript
function MyComponent() {
  const { hasPermission, isAdmin, isDealer } = usePermissions();

  // Check specific permission
  if (hasPermission(PERMISSIONS.ORDERS_CREATE)) {
    // Show create order button
  }

  // Check role
  if (isAdmin()) {
    // Show admin-only content
  }

  return (
    <div>
      {/* Content */}
    </div>
  );
}
```

#### 3. Protect Pages with PermissionGuard

```typescript
export function DealerPage() {
  return (
    <PermissionGuard minimumRole="admin" fallback={<AccessDenied />}>
      <DealerManagement />
    </PermissionGuard>
  );
}
```

#### 4. Protect Specific Actions

```typescript
function SaveButton() {
  return (
    <PermissionGuard permission={PERMISSIONS.DEALERS_MANAGE} fallback={<Button disabled>Save</Button>}>
      <Button>Save Dealer</Button>
    </PermissionGuard>
  );
}
```

## Available Permissions

### Dashboard & Home
- `dashboard.view` - View dashboard
- `sales_summary.view` - View sales summary
- `alerts.view` - View alerts

### Sales & Orders
- `orders.create` - Create new orders
- `orders.view` - View orders
- `orders.update` - Update existing orders
- `orders.history.view` - View order history

### Inventory
- `inventory.view` - View inventory
- `inventory.view_allocated` - View allocated stock
- `inventory.view_details` - View detailed inventory
- `inventory.request_transfer` - Request stock transfers

### Invoices & Billing
- `invoices.view` - View invoices
- `invoices.download` - Download invoices
- `payments.submit` - Submit payments

### Returns
- `returns.create` - Create return requests
- `returns.track` - Track return status

### Reports
- `reports.sales.view` - View sales reports
- `reports.stock_movement.view` - View stock movement reports
- `reports.outstanding_payments.view` - View outstanding payments
- `reports.collections.view` - View collection reports

### Profile & Account
- `profile.manage` - Manage user profile
- `password.change` - Change password
- `notifications.manage` - Manage notifications

### Admin Only
- `users.manage` - Manage users
- `dealers.manage` - Manage dealers
- `companies.manage` - Manage companies
- `system.settings` - Access system settings

## Role Permissions Matrix

| Permission | Admin | Dealer | Recovery | Sub-Dealer | Staff |
|-------------|--------|--------|-----------|-------------|--------|
| dashboard.view | ✅ | ✅ | ✅ | ✅ | ✅ |
| orders.create | ✅ | ✅ | ❌ | ❌ | ❌ |
| orders.view | ✅ | ✅ | ❌ | ✅ | ✅ |
| inventory.view | ✅ | ✅ | ❌ | ✅ | ✅ |
| invoices.view | ✅ | ✅ | ❌ | ✅ | ❌ |
| collections.view | ✅ | ❌ | ✅ | ❌ | ❌ |
| subscribers.manage | ✅ | ❌ | ✅ | ❌ | ❌ |
| dealers.manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| users.manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| system.settings | ✅ | ❌ | ❌ | ❌ | ❌ |

## Navigation Integration

The sidebar navigation (`/components/layout/sidebar-nav.tsx`) automatically filters menu items based on:
1. **Minimum Role Required** - Some items require admin or higher
2. **Specific Permissions** - Some items require specific permissions

## Best Practices

1. **Always use PermissionGuard** for UI elements that perform restricted actions
2. **Check permissions early** in component lifecycle to avoid unnecessary API calls
3. **Provide meaningful fallbacks** when access is denied
4. **Use minimumRole** for admin-only features instead of checking individual permissions
5. **Document role requirements** in component props and comments

## Example Implementation Scenarios

### Scenario 1: Dealer Dashboard
```typescript
export function DealerDashboard() {
  return (
    <PermissionGuard minimumRole="dealer">
      <RoleBasedDashboard />
    </PermissionGuard>
  );
}
```

### Scenario 2: Order Management
```typescript
function OrderActions({ order }) {
  const { hasPermission } = usePermissions();
  
  return (
    <div className="flex gap-2">
      <PermissionGuard permission={PERMISSIONS.ORDERS_VIEW}>
        <Button variant="outline">View</Button>
      </PermissionGuard>
      
      <PermissionGuard permission={PERMISSIONS.ORDERS_UPDATE}>
        <Button>Edit</Button>
      </PermissionGuard>
      
      <PermissionGuard permission={PERMISSIONS.ORDERS_CREATE}>
        <Button variant="destructive">Cancel</Button>
      </PermissionGuard>
    </div>
  );
}
```

### Scenario 3: Conditional Rendering
```typescript
function ReportSection() {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();
  
  const canViewAllReports = hasAllPermissions([
    PERMISSIONS.REPORTS_SALES_VIEW,
    PERMISSIONS.REPORTS_STOCK_MOVEMENT_VIEW,
    PERMISSIONS.REPORTS_OUTSTANDING_PAYMENTS_VIEW
  ]);
  
  const canViewSomeReports = hasAnyPermission([
    PERMISSIONS.REPORTS_SALES_VIEW,
    PERMISSIONS.REPORTS_COLLECTIONS_VIEW
  ]);

  if (!canViewSomeReports) {
    return <div>No report access available</div>;
  }

  return (
    <div>
      {canViewAllReports && <FullReportDashboard />}
      {!canViewAllReports && <LimitedReportDashboard />}
    </div>
  );
}
```

## Testing Permissions

To test different roles, you can temporarily modify the user role in the database or create test users with different roles. The permission system will automatically adapt the UI based on the user's role.

## Security Considerations

1. **Frontend permissions are for UX only** - All sensitive operations must be protected on the backend
2. **Always validate permissions server-side** before performing restricted actions
3. **Use JWT tokens** to securely transmit user role information
4. **Implement proper logging** for permission-denied attempts
5. **Regular permission audits** to ensure appropriate access levels

## Future Enhancements

1. **Fine-grained permissions** - Resource-level permissions (e.g., edit own orders only)
2. **Time-based permissions** - Temporary access grants
3. **IP-based restrictions** - Additional security layer
4. **Permission inheritance** - Parent-child role relationships
5. **Audit trail** - Complete log of permission-based actions
