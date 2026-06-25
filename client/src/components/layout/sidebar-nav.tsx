'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  GitFork,
  Network,
  TowerControl,
  UserCheck,
  UserPlus,
  Building,
  Building2,
  HandCoins,
  Wallet,
  Receipt,
  CircleDollarSign,
  Ticket,
  BellRing,
  Briefcase,
  Fingerprint,
  HelpingHand,
  Warehouse,
  ShoppingCart,
  ShieldCheck,
  FileCog,
  FileClock,
  FileText,
  Headphones,
  Settings,
  LogOut,
  LifeBuoy,
  BarChartBig,
  AreaChart,
  Box,
  UserRound,
  Handshake,
  UserSearch,
  Map,
  ClipboardPen,
} from 'lucide-react';
import type { NavItem, NavItemGroup } from '@/lib/types';
import { CircleDollarSign as AppIcon } from 'lucide-react';
import { LogoutButton } from '@/components/shared/logout-button';
import { useUserPermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

const navItems: NavItemGroup[] = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Network Operations',
    items: [
      { title: 'Areas', href: '/network/areas', icon: Network, allowedRoles: ['admin', 'manager'] },
      { title: 'POPs', href: '/network/pop', icon: TowerControl, allowedRoles: ['admin', 'manager'] },
      { title: 'OLTs', href: '/network/olt', icon: GitFork, allowedRoles: ['admin', 'manager'] },
      { title: 'Splitters', href: '/network/splitters', icon: Box, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Subscriber Management',
    items: [
      { title: 'All Subscribers', href: '/subscribers/all', icon: Users, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'New Inquiries', href: '/subscribers/inquiries', icon: UserPlus, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Corporate Clients', href: '/subscribers/corporate', icon: Building, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Franchise & Dealer',
    items: [
      { title: 'Franchise Dashboard', href: '/franchise/dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'manager'] },
      { title: 'My Dealers', href: '/franchise/my-dealers', icon: Users, allowedRoles: ['admin', 'manager'] },
      { title: 'Dealer Dashboard', href: '/dealer/dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'manager', 'dealer'] },
      { title: 'Sub-Dealers', href: '/dealer/sub-dealers', icon: Users, allowedRoles: ['admin', 'manager', 'dealer'] },
      { title: 'Bill Creator', href: '/dealer/bill-creator', icon: ClipboardPen, allowedRoles: ['admin', 'manager', 'dealer'] },
      { title: 'Collections Today', href: '/dealer/collections-today', icon: Wallet, allowedRoles: ['admin', 'manager', 'dealer'] },
    ]
  },
  {
    title: 'Recovery',
    items: [
      { title: 'Recovery Dashboard', href: '/recovery/dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
      { title: 'My Collections', href: '/recovery/my-collections', icon: HandCoins, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
      { title: 'Assigned Area', href: '/recovery/assigned-area', icon: Map, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
      { title: 'Transactions', href: '/recovery/transactions', icon: FileClock, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
    ]
  },
  {
    title: 'Billing & Recharge',
    items: [
      { title: 'Packages', href: '/billing/packages', icon: Receipt, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
    ],
  },
  {
    title: 'CRM',
    items: [
      { title: 'Customers', href: '/crm/customers', icon: Users, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Guarantors', href: '/crm/guarantors', icon: UserRound, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Vendors', href: '/vendors', icon: Building2, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Vendor Invoices', href: '/vendor-invoices', icon: FileText, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
    ],
  },
  {
    title: 'Sales',
    items: [
      { title: 'Sales', href: '/sales', icon: ShoppingCart, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Invoices', href: '/sales/invoices', icon: Receipt, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Payments', href: '/sales/payments', icon: HandCoins, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Installment Plans', href: '/sales/installment-plans', icon: FileCog, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { title: 'Products', href: '/inventory/products', icon: Box, allowedRoles: ['admin', 'manager'] },
      { title: 'Plans', href: '/inventory/plans', icon: Receipt, allowedRoles: ['admin', 'manager'] },
      { title: 'Stock', href: '/inventory/stock', icon: Warehouse, allowedRoles: ['admin', 'manager'] },
      { title: 'Point of Sale', href: '/inventory/pos', icon: ShoppingCart, allowedRoles: ['admin', 'manager', 'dealer'] },
    ]
  },
  {
    title: 'Accounts',
    items: [
      { title: 'Customer Ledger', href: '/accounts/customer-ledger', icon: UserSearch, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Cash/Bank Ledger', href: '/accounts/cash-bank-ledger', icon: Wallet, allowedRoles: ['admin', 'manager'] },
      { title: 'Expenses', href: '/accounts/expenses', icon: CircleDollarSign, allowedRoles: ['admin', 'manager'] },
    ]
  },
  {
    title: 'Support',
    items: [
      { title: 'Complaints', href: '/support/complaints', icon: Ticket, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Alerts', href: '/support/alerts', icon: BellRing, allowedRoles: ['admin', 'manager', 'staff'] },
    ],
  },
  {
    title: 'HR & Staff',
    items: [
      { title: 'Staff', href: '/hr/staff', icon: Briefcase, allowedRoles: ['admin', 'manager'] },
      { title: 'Attendance', href: '/hr/attendance', icon: Fingerprint, allowedRoles: ['admin', 'manager'] },
      { title: 'Advances & Loans', href: '/hr/advances', icon: HelpingHand, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { title: 'My Company Profile', href: '/admin/company-profile', icon: Building, allowedRoles: ['admin', 'manager'] },
      { title: 'Area Management', href: '/admin/area-management', icon: Map, allowedRoles: ['admin', 'manager'] },
      { title: 'Dealer Franchises', href: '/admin/dealer-franchises', icon: Building2, allowedRoles: ['admin', 'manager'] },
      { title: 'Dealers', href: '/admin/dealers', icon: Handshake, allowedRoles: ['admin', 'manager'] },
      { title: 'Recovery Officers', href: '/admin/recovery-officers', icon: UserCheck, allowedRoles: ['admin', 'manager'] },
      { title: 'Users', href: '/admin/users', icon: Users, allowedRoles: ['admin', 'manager'] },
      { title: 'Support Tickets', href: '/admin/support-tickets', icon: Headphones, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Companies', href: '/admin/companies', icon: Building2, allowedRoles: ['admin'] },
      { title: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck, allowedRoles: ['admin'] },
      { title: 'System Config', href: '/admin/settings', icon: Settings, allowedRoles: ['admin'] },
      { title: 'System Logs', href: '/admin/logs', icon: FileClock, allowedRoles: ['admin'] },
    ],
  },
  {
    title: 'Reports',
    items: [
      { title: 'Reports', href: '/admin/reports', icon: AreaChart, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
    ],
  },
];

function filterNavItems(items: NavItem[], hasPermission: (perm: string) => boolean, hasMinimumRole: (role: string) => boolean, userRole: string): NavItem[] {
  return items.filter(item => {
    // Hide items marked as hidden
    if (item.hidden) {
      return false;
    }
    
    // Check if user has allowed role for this item
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
      return false;
    }
    
    // Legacy support for minimumRole
    if (item.minimumRole) {
      if (item.minimumRole === 'admin') {
        if (!hasMinimumRole('admin')) {
          return false;
        }
      } else {
        if (!hasMinimumRole(item.minimumRole)) {
          return false;
        }
      }
    }
    
    // Legacy support for permission
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    
    return true;
  });
}

export function SidebarNav() {
  const pathname = usePathname();
  const { hasPermission, hasMinimumRole, userRole, user } = useUserPermissions();

  // Show loading state while user data is being fetched
  if (!user) {
    return (
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="bg-primary text-primary-foreground rounded-md p-1.5">
              <AppIcon className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">FinTrack ERP</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Debug logs to see current user and role
  console.log('=== DEBUG INFO ===');
  console.log('Current user:', user);
  console.log('User role:', userRole);
  console.log('Is admin?', hasMinimumRole('admin'));
  console.log('Has dashboard permission?', hasPermission('dashboard.view'));
  console.log('==================');

  const filteredNavItems = navItems.map(group => ({
    ...group,
    items: filterNavItems(group.items, hasPermission, hasMinimumRole, userRole)
  })).filter(group => group.items.length > 0);

  // Debug: Show what navigation items are being filtered
  console.log('Filtered navigation items:', JSON.stringify(filteredNavItems, null, 2));

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <div className="bg-primary text-primary-foreground rounded-md p-1.5">
                <AppIcon className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">FinTrack ERP</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {filteredNavItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{ children: item.title }}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: 'Support' }}>
              <Link href="/support">
                <LifeBuoy />
                <span>Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <LogoutButton>
                <SidebarMenuButton asChild={false} tooltip={{ children: 'Logout' }}>
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </LogoutButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
