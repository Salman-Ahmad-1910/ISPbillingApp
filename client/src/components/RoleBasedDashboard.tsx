'use client';

import React from 'react';
import { useUserPermissions } from '@/hooks/usePermissions';
import { PERMISSIONS, ROLES } from '@/lib/permissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Wallet, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function DashboardCard({ title, value, icon, description, trend }: DashboardCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
          {trend && (
            <div className={`flex items-center text-xs mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend.isPositive ? '+' : ''}{trend.value}%
            </div>
          )}
        </div>
        <div className="bg-blue-50 p-3 rounded-full">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function RoleBasedDashboard() {
  const { userRole, hasPermission, isDealer, isRecovery, isSubDealer, isAdmin } = useUserPermissions();

  // Common dashboard cards for all roles
  const commonCards = (
    <>
      <DashboardCard
        title="Total Users"
        value="1,234"
        icon={<Users className="w-6 h-6 text-blue-600" />}
        description="Active users this month"
        trend={{ value: 12, isPositive: true }}
      />
      <DashboardCard
        title="Revenue"
        value="$45,678"
        icon={<Wallet className="w-6 h-6 text-green-600" />}
        description="Total revenue this month"
        trend={{ value: 8, isPositive: true }}
      />
    </>
  );

  // Dealer specific cards
  const dealerCards = (
    <PermissionGuard permission={PERMISSIONS.ORDERS_VIEW}>
      <DashboardCard
        title="Pending Orders"
        value="23"
        icon={<ShoppingCart className="w-6 h-6 text-orange-600" />}
        description="Orders awaiting processing"
      />
      <DashboardCard
        title="Low Stock Items"
        value="5"
        icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
        description="Items below minimum stock"
      />
    </PermissionGuard>
  );

  // Recovery officer specific cards
  const recoveryCards = (
    <PermissionGuard permission={PERMISSIONS.COLLECTIONS_VIEW}>
      <DashboardCard
        title="Collections Today"
        value="$2,345"
        icon={<Wallet className="w-6 h-6 text-green-600" />}
        description="Amount collected today"
      />
      <DashboardCard
        title="Pending Collections"
        value="18"
        icon={<FileText className="w-6 h-6 text-orange-600" />}
        description="Overdue payments"
      />
    </PermissionGuard>
  );

  // Admin specific cards
  const adminCards = (
    <PermissionGuard minimumRole={ROLES.ADMIN}>
      <DashboardCard
        title="Total Companies"
        value="12"
        icon={<LayoutDashboard className="w-6 h-6 text-purple-600" />}
        description="Active companies"
      />
      <DashboardCard
        title="System Health"
        value="Good"
        icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        description="All systems operational"
      />
    </PermissionGuard>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userRole === ROLES.ADMIN ? 'Administrator' : 
                     userRole === ROLES.DEALER ? 'Dealer' : 
                     userRole === ROLES.RECOVERY ? 'Recovery Officer' : 
                     userRole === ROLES.SUB_DEALER ? 'Sub-Dealer' : 'User'}!
        </h1>
        <p className="text-gray-600 mt-2">
          {userRole === ROLES.ADMIN && 'You have full system access and can manage all aspects of the ERP.'}
          {userRole === ROLES.DEALER && 'You can manage your sales, inventory, and view your business reports.'}
          {userRole === ROLES.RECOVERY && 'You can manage collections and subscriber accounts in your assigned area.'}
          {userRole === ROLES.SUB_DEALER && 'You can view your inventory and manage basic sales operations.'}
          {userRole === ROLES.STAFF && 'You have limited access to view basic information.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {commonCards}
        {isDealer() && dealerCards}
        {isRecovery() && recoveryCards}
        {isAdmin() && adminCards}
      </div>

      {/* Role-specific quick actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PermissionGuard permission={PERMISSIONS.ORDERS_CREATE}>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Create New Order
            </button>
          </PermissionGuard>
          
          <PermissionGuard permission={PERMISSIONS.INVENTORY_REQUEST_TRANSFER}>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Request Stock Transfer
            </button>
          </PermissionGuard>
          
          <PermissionGuard permission={PERMISSIONS.REPORTS_SALES_VIEW}>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              View Sales Report
            </button>
          </PermissionGuard>
          
          <PermissionGuard permission={PERMISSIONS.COLLECTIONS_MANAGE}>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
              Record Collection
            </button>
          </PermissionGuard>
          
          <PermissionGuard minimumRole={ROLES.ADMIN}>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
              System Settings
            </button>
          </PermissionGuard>
        </div>
      </div>
    </div>
  );
}
