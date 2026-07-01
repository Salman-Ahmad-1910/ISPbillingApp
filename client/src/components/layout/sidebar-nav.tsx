'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
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
  FolderClosed,
  TriangleAlert,
  Tag,
  Ruler,
  Shapes,
  Activity,
  ArrowLeftRight,
} from 'lucide-react';
import type { NavItem, NavItemGroup } from '@/lib/types';
import { CircleDollarSign as AppIcon } from 'lucide-react';
import { LogoutButton } from '@/components/shared/logout-button';
import { useUserPermissions } from '@/hooks/usePermissions';

const navItems: NavItemGroup[] = [
  {
    title: 'Dashboard',
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Network',
    items: [
      { title: 'Areas', href: '/network/areas', icon: Network, allowedRoles: ['admin', 'manager'] },
      { title: 'POPs', href: '/network/pop', icon: TowerControl, allowedRoles: ['admin', 'manager'] },
      { title: 'OLTs', href: '/network/olt', icon: GitFork, allowedRoles: ['admin', 'manager'] },
      { title: 'Splitters', href: '/network/splitters', icon: Box, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Customer Management',
    items: [
      { title: 'All Subscribers', href: '/subscribers/all', icon: Users, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'New Inquiries', href: '/subscribers/inquiries', icon: UserPlus, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Corporate Clients', href: '/subscribers/corporate', icon: Building, allowedRoles: ['admin', 'manager'] },
      { title: 'Customers', href: '/crm/customers', icon: UserRound, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Guarantors', href: '/crm/guarantors', icon: UserCheck, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
    ],
  },
  {
    title: 'Sales',
    items: [
      { title: 'Sales', href: '/sales', icon: ShoppingCart, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Invoices', href: '/sales/invoices', icon: Receipt, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Payments', href: '/sales/payments', icon: HandCoins, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Installment Plans', href: '/sales/installment-plans', icon: FileCog, allowedRoles: ['admin', 'manager'] },
      { title: 'Point of Sale', href: '/inventory/pos', icon: ShoppingCart, allowedRoles: ['admin', 'manager', 'dealer'] },
    ],
  },
  {
    title: 'Collections',
    items: [
      { title: 'Recovery Dashboard', href: '/recovery/dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
      { title: 'My Collections', href: '/recovery/my-collections', icon: HandCoins, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
      { title: 'Assigned Area', href: '/recovery/assigned-area', icon: Map, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
      { title: 'Transactions', href: '/recovery/transactions', icon: FileClock, allowedRoles: ['admin', 'manager', 'recovery_officer'] },
      { title: 'Packages', href: '/billing/packages', icon: Receipt, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Bill Creator', href: '/dealer/bill-creator', icon: ClipboardPen, allowedRoles: ['admin', 'manager', 'dealer'] },
      { title: 'Collections Today', href: '/dealer/collections-today', icon: Wallet, allowedRoles: ['admin', 'manager', 'dealer'] },
    ],
  },
  {
    title: 'Partners',
    items: [
      { title: 'Franchise Dashboard', href: '/franchise/dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'manager'] },
      { title: 'My Dealers', href: '/franchise/my-dealers', icon: Users, allowedRoles: ['admin', 'manager'] },
      { title: 'Dealer Dashboard', href: '/dealer/dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'manager', 'dealer'] },
      { title: 'Sub-Dealers', href: '/dealer/sub-dealers', icon: Users, allowedRoles: ['admin', 'manager', 'dealer'] },
      {
        title: 'Reports',
        icon: FolderClosed,
        allowedRoles: ['admin', 'manager', 'dealer'],
        items: [
          { title: 'Collections', href: '/dealer/reports/collections', icon: Wallet, allowedRoles: ['admin', 'manager', 'dealer'] },
          { title: 'Defaulters', href: '/dealer/reports/defaulters', icon: TriangleAlert, allowedRoles: ['admin', 'manager', 'dealer'] },
          { title: 'New Dealers', href: '/dealer/reports/new-dealers', icon: UserPlus, allowedRoles: ['admin', 'manager', 'dealer'] },
          { title: 'Invoices', href: '/dealer/reports/invoices', icon: FileText, allowedRoles: ['admin', 'manager', 'dealer'] },
        ],
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { title: 'Products', href: '/inventory/products', icon: Box, allowedRoles: ['admin', 'manager'] },
      { title: 'Plans', href: '/inventory/plans', icon: Receipt, allowedRoles: ['admin', 'manager'] },
      { title: 'Stock', href: '/inventory/stock', icon: Warehouse, allowedRoles: ['admin', 'manager'] },
      { title: 'Brands', href: '/inventory/brands', icon: Tag, allowedRoles: ['admin', 'manager'] },
      { title: 'Unit Type', href: '/inventory/unit-types', icon: Ruler, allowedRoles: ['admin', 'manager'] },
      { title: 'Product Type', href: '/inventory/product-types', icon: Shapes, allowedRoles: ['admin', 'manager'] },
      { title: 'Inventory Status', href: '/inventory/statuses', icon: Activity, allowedRoles: ['admin', 'manager'] },
      { title: 'Purchase', href: '/inventory/purchases', icon: ArrowLeftRight, allowedRoles: ['admin', 'manager'] },
      { title: 'Vendors', href: '/inventory/vendors', icon: Building2, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
      { title: 'Vendor Invoices', href: '/inventory/vendor-invoices', icon: FileText, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { title: 'Customer Ledger', href: '/accounts/customer-ledger', icon: UserSearch, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Cash/Bank Ledger', href: '/accounts/cash-bank-ledger', icon: Wallet, allowedRoles: ['admin', 'manager'] },
      { title: 'Expenses', href: '/accounts/expenses', icon: CircleDollarSign, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Service Desk',
    items: [
      { title: 'Complaints', href: '/support/complaints', icon: Ticket, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Alerts', href: '/support/alerts', icon: BellRing, allowedRoles: ['admin', 'manager', 'staff'] },
      { title: 'Support Tickets', href: '/admin/support-tickets', icon: Headphones, allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Human Resources',
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
      { title: 'Companies', href: '/admin/companies', icon: Building2, allowedRoles: ['admin'] },
      { title: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck, allowedRoles: ['admin'] },
      { title: 'System Config', href: '/admin/settings', icon: Settings, allowedRoles: ['admin'] },
      { title: 'System Logs', href: '/admin/logs', icon: FileClock, allowedRoles: ['admin'] },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { title: 'Reports', href: '/admin/reports', icon: AreaChart, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
    ],
  },
  {
    title: 'User Reports',
    items: [
      { title: 'User Collection', href: '/user-reports/collections', icon: Wallet, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Deactivate Users List', href: '/user-reports/deactivated-users', icon: UserSearch, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Package Wise List', href: '/user-reports/package-wise', icon: Box, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Promise Date Reports', href: '/user-reports/promise-dates', icon: FileClock, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Allocated Defaulters', href: '/user-reports/allocated-defaulters', icon: TriangleAlert, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Expiry Wise Defaulters', href: '/user-reports/expiry-defaulters', icon: BarChartBig, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Month Wise Defaulters', href: '/user-reports/month-defaulters', icon: FileText, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'Monthly Collections', href: '/user-reports/monthly-collections', icon: HandCoins, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
      { title: 'User Creator Summary', href: '/user-reports/creator-summary', icon: UserPlus, allowedRoles: ['admin', 'manager', 'dealer', 'sub_dealer', 'staff', 'recovery_officer'] },
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
  return items
    .filter(item => {
      if (item.hidden) {
        return false;
      }
      if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
        return false;
      }
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
      if (item.permission && !hasPermission(item.permission)) {
        return false;
      }
      return true;
    })
    .map(item => {
      if (item.items) {
        return {
          ...item,
          items: filterNavItems(item.items, hasPermission, hasMinimumRole, userRole),
        };
      }
      return item;
    })
    .filter(item => {
      if (item.items && item.items.length === 0 && !item.href) {
        return false;
      }
      return true;
    });
}

function NavTreeItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const hasSubItems = item.items && item.items.length > 0;

  if (hasSubItems) {
    const [open, setOpen] = useState(false);

    return (
      <SidebarMenuItem>
        <Collapsible open={open} onOpenChange={setOpen} className="group/tree">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="w-full justify-start gap-2">
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.title}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/tree:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items!.map((child) => (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === child.href}
                  >
                    <Link href={child.href!}>
                      <child.icon />
                      <span>{child.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === item.href}
        tooltip={{ children: item.title }}
      >
        <Link href={item.href!}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavCollapsibleGroup({
  group,
  pathname,
  openGroup,
  onOpenChange,
}: {
  group: NavItemGroup;
  pathname: string;
  openGroup: string | null;
  onOpenChange: (title: string | null) => void;
}) {
  return (
    <SidebarGroup>
      <Collapsible open={openGroup === group.title} onOpenChange={(val) => onOpenChange(val ? group.title : null)} className="group/collapsible">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium uppercase text-sidebar-foreground/70 outline-none transition-colors hover:text-sidebar-foreground"
            aria-expanded={openGroup === group.title}
          >
            <span>{group.title}</span>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu>
            {group.items.map((item) => (
              <NavTreeItem key={item.title + String(openGroup === group.title)} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const { hasPermission, hasMinimumRole, userRole, user } = useUserPermissions();
  const [openGroup, setOpenGroup] = useState<string | null>(null);



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

  const filteredNavItems = navItems.map(group => ({
    ...group,
    items: filterNavItems(group.items, hasPermission, hasMinimumRole, userRole)
  })).filter(group => group.items.length > 0);

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
        {filteredNavItems.map((group) => {
          if (group.title === 'Dashboard') {
            return (
              <SidebarGroup key={group.title}>
                <div className="px-2 py-1.5 text-xs font-medium uppercase text-sidebar-foreground/70">
                  {group.title}
                </div>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={!!item.href && pathname === item.href}
                        tooltip={{ children: item.title }}
                      >
                        <Link href={item.href!}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            );
          }

          return (
            <NavCollapsibleGroup key={group.title} group={group} pathname={pathname} openGroup={openGroup} onOpenChange={setOpenGroup} />
          );
        })}
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
