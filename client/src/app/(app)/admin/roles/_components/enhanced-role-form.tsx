'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Role } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// Define available permissions
const AVAILABLE_PERMISSIONS = [
  // Dashboard & Overview
  { id: 'dashboard_view', label: 'View Dashboard', category: 'Dashboard' },
  
  // Subscribers Management
  { id: 'users_view', label: 'View Subscribers', category: 'Subscribers' },
  { id: 'users_add', label: 'Add Subscribers', category: 'Subscribers' },
  { id: 'users_edit', label: 'Edit Subscribers', category: 'Subscribers' },
  { id: 'users_delete', label: 'Delete Subscribers', category: 'Subscribers' },
  { id: 'users_change_status', label: 'Change Subscriber Status', category: 'Subscribers' },
  
  // Network Management
  { id: 'network_view', label: 'View Network', category: 'Network' },
  { id: 'network_areas_add', label: 'Add Areas', category: 'Network' },
  { id: 'network_areas_edit', label: 'Edit Areas', category: 'Network' },
  { id: 'network_areas_delete', label: 'Delete Areas', category: 'Network' },
  { id: 'network_olts_add', label: 'Add OLTs', category: 'Network' },
  { id: 'network_olts_edit', label: 'Edit OLTs', category: 'Network' },
  { id: 'network_olts_delete', label: 'Delete OLTs', category: 'Network' },
  { id: 'network_boxes_view', label: 'Box / Media', category: 'Network' },
  
  // Billing Management
  { id: 'billing_view', label: 'View Billing', category: 'Billing' },
  { id: 'billing_packages_add', label: 'Add Packages', category: 'Billing' },
  { id: 'billing_packages_edit', label: 'Edit Packages', category: 'Billing' },
  { id: 'billing_packages_delete', label: 'Delete Packages', category: 'Billing' },
  { id: 'billing_invoices_add', label: 'Create Invoices', category: 'Billing' },
  { id: 'billing_invoices_edit', label: 'Edit Invoices', category: 'Billing' },
  { id: 'billing_invoices_delete', label: 'Delete Invoices', category: 'Billing' },
  { id: 'billing_payments_process', label: 'Process Payments', category: 'Billing' },
  
  // Subscribers Management
  { id: 'subscribers_view', label: 'View Subscribers', category: 'Subscribers' },
  { id: 'subscribers_add', label: 'Add Subscribers', category: 'Subscribers' },
  { id: 'subscribers_edit', label: 'Edit Subscribers', category: 'Subscribers' },
  { id: 'subscribers_delete', label: 'Delete Subscribers', category: 'Subscribers' },
  { id: 'subscribers_packages_view', label: 'Packages', category: 'Subscribers' },
  { id: 'subscribers_inquiries_view', label: 'New Inquiries', category: 'Subscribers' },
  { id: 'subscribers_location_view', label: 'Subscriber Location', category: 'Subscribers' },
  
  // Dealers Management
  { id: 'dealers_view', label: 'View Dealers', category: 'Dealers' },
  { id: 'dealers_add', label: 'Add Dealers', category: 'Dealers' },
  { id: 'dealers_edit', label: 'Edit Dealers', category: 'Dealers' },
  { id: 'dealers_delete', label: 'Delete Dealers', category: 'Dealers' },
  { id: 'dealers_franchises_add', label: 'Add Franchises', category: 'Dealers' },
  { id: 'dealers_franchises_edit', label: 'Edit Franchises', category: 'Dealers' },
  { id: 'dealers_franchises_delete', label: 'Delete Franchises', category: 'Dealers' },
  
  // Recovery Officers
  { id: 'hr_recovery_officers_allocate', label: 'Area Allocation', category: 'Recovery Officers' },
  
  // Transactions
  { id: 'transactions_user_collections_view', label: 'Subscriber Collections', category: 'Transactions' },
  { id: 'transactions_dealers_collections_view', label: 'Dealers Collections', category: 'Transactions' },
  { id: 'transactions_allocated_view', label: 'Allocated Collection', category: 'Transactions' },
  { id: 'transactions_reprint', label: 'Reprint Slip', category: 'Transactions' },
  { id: 'transactions_bills_create', label: 'Bills Creator', category: 'Transactions' },
  { id: 'transactions_types_view', label: 'Transaction Type', category: 'Transactions' },
  { id: 'transactions_new_collection', label: 'New Collection', category: 'Transactions' },
  { id: 'transactions_bad_debt_view', label: 'Bad Debt Collection', category: 'Transactions' },
  
  // Complaints
  { id: 'complaints_users_view', label: 'Subscribers Complain', category: 'Complaints' },
  { id: 'complaints_allocated_view', label: 'Allocated Complains', category: 'Complaints' },
  { id: 'complaints_subjects_view', label: 'Subject Type', category: 'Complaints' },
  { id: 'complaints_types_view', label: 'Complain Type', category: 'Complaints' },
  { id: 'complaints_report_view', label: 'Complain Report', category: 'Complaints' },
  
  // Messages
  { id: 'messages_new_view', label: 'New Messages', category: 'Messages' },
  { id: 'messages_other_view', label: 'Other Messages', category: 'Messages' },
  { id: 'messages_draft_view', label: 'Draft Messages', category: 'Messages' },
  { id: 'messages_sent_view', label: 'Sent Messages', category: 'Messages' },
  { id: 'messages_expired_view', label: 'Expiry Messages', category: 'Messages' },
  { id: 'messages_whatsapp_view', label: 'WhatsApp Drafts', category: 'Messages' },
  
  // Accounts
  { id: 'accounts_heads_view', label: 'Account Heads', category: 'Accounts' },
  { id: 'accounts_entry_view', label: 'Account Entry', category: 'Accounts' },
  { id: 'accounts_one_day_view', label: 'One Day Balance Sheet', category: 'Accounts' },
  { id: 'accounts_reports_view', label: 'Accounts Report', category: 'Accounts' },
  
  // Inventory
  { id: 'inventory_products_view', label: 'Products', category: 'Inventory' },
  { id: 'inventory_purchase_view', label: 'Purchase', category: 'Inventory' },
  { id: 'inventory_status_view', label: 'Inventory Status', category: 'Inventory' },
  { id: 'inventory_product_types_view', label: 'Product Type', category: 'Inventory' },
  { id: 'inventory_vendors_view', label: 'Vendor', category: 'Inventory' },
  { id: 'inventory_brands_view', label: 'Brand', category: 'Inventory' },
  { id: 'inventory_unit_types_view', label: 'Unit Type', category: 'Inventory' },
  
  // Point of Sale
  { id: 'pos_sales_view', label: 'Sales (POS)', category: 'Point of Sale' },
  
  // HR Management
  { id: 'hr_view', label: 'View HR', category: 'HR' },
  { id: 'hr_staff_add', label: 'Add Staff', category: 'HR' },
  { id: 'hr_staff_edit', label: 'Edit Staff', category: 'HR' },
  { id: 'hr_staff_delete', label: 'Delete Staff', category: 'HR' },
  { id: 'hr_recovery_officers_add', label: 'Add Recovery Officers', category: 'HR' },
  { id: 'hr_recovery_officers_edit', label: 'Edit Recovery Officers', category: 'HR' },
  { id: 'hr_recovery_officers_delete', label: 'Delete Recovery Officers', category: 'HR' },
  { id: 'hr_salary_view', label: 'Employee Salary', category: 'HR' },
  { id: 'hr_advances_view', label: 'Advances & Loans', category: 'HR' },
  { id: 'hr_attendance_day_view', label: 'Day Wise Attendance', category: 'HR' },
  { id: 'hr_attendance_user_view', label: 'Subscriber Wise Attendance', category: 'HR' },
  
  // Logs
  { id: 'logs_connections_view', label: 'Update Connections Log', category: 'Logs' },
  { id: 'logs_deleted_collection_view', label: 'Deleted Collection', category: 'Logs' },
  { id: 'logs_deleted_users_view', label: 'Deleted Subscribers', category: 'Logs' },
  
  // Reports & Analytics
  { id: 'reports_view', label: 'View Reports', category: 'Reports' },
  { id: 'reports_financial', label: 'Financial Reports', category: 'Reports' },
  { id: 'reports_usage', label: 'Usage Reports', category: 'Reports' },
  { id: 'reports_collections', label: 'Collections Reports', category: 'Reports' },
  { id: 'reports_users_defaulter', label: 'Subscribers Defaulter', category: 'Reports' },
  { id: 'reports_allocated_defaulters', label: 'Allocated Defaulters', category: 'Reports' },
  { id: 'reports_new_users', label: 'New Subscribers List', category: 'Reports' },
  { id: 'reports_monthly_collection_month_wise', label: 'Monthly Collection Month Wise', category: 'Reports' },
  { id: 'reports_month_wise_collection', label: 'Month Wise Collection', category: 'Reports' },
  { id: 'reports_unpaid_collection', label: 'Unpaid Collection', category: 'Reports' },
  { id: 'reports_allocated_collections', label: 'Allocated Collections', category: 'Reports' },
  { id: 'reports_promise_date', label: 'Promise Date Report', category: 'Reports' },
  { id: 'reports_user_collections', label: 'Subscriber Collections Report', category: 'Reports' },
  { id: 'reports_expiry_defaulters', label: 'Expiry Wise Defaulter', category: 'Reports' },
  { id: 'reports_month_defaulters', label: 'Month Wise Defaulter', category: 'Reports' },
  { id: 'reports_collection_not_generated', label: 'Collection Not Generated', category: 'Reports' },
  { id: 'reports_creator_summary', label: 'Subscribers Creator Summary', category: 'Reports' },
  { id: 'reports_new_subscribers', label: 'New Subscribers List', category: 'Reports' },
  { id: 'reports_subscribers_defaulters', label: 'Subscribers Defaulters', category: 'Reports' },
  { id: 'reports_allocated_collections', label: 'Allocated Collections', category: 'Reports' },
  { id: 'reports_monthwise_collection_monthly', label: 'Month Wise Collection Monthly', category: 'Reports' },
  { id: 'reports_package_wise', label: 'Package Wise List', category: 'Reports' },
  { id: 'reports_deactivated_users', label: 'Deactivate Subscriber List', category: 'Reports' },
  { id: 'reports_dealer_invoices', label: 'Dealer Invoice List', category: 'Reports' },
  { id: 'reports_new_dealers', label: 'New Dealers List', category: 'Reports' },
  { id: 'reports_dealers_collection', label: 'Dealers Collection', category: 'Reports' },
  { id: 'reports_dealers_defaulter', label: 'Dealers Defaulter', category: 'Reports' },
  { id: 'reports_abstract_stock', label: 'Abstract Stock', category: 'Reports' },
  { id: 'reports_abstract_sales', label: 'Abstract Sales', category: 'Reports' },
  
  // System Administration
  { id: 'system_view', label: 'View System', category: 'System' },
  { id: 'system_config', label: 'System Configuration', category: 'System' },
  { id: 'system_logs', label: 'View System Logs', category: 'System' },
  { id: 'system_backup', label: 'System Backup', category: 'System' },
  { id: 'system_user_rights', label: 'Subscriber Rights', category: 'System' },
  { id: 'system_change_password', label: 'Change Username/Password', category: 'System' },
];

// Group permissions by category
const PERMISSIONS_BY_CATEGORY = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
  if (!acc[permission.category]) {
    acc[permission.category] = [];
  }
  acc[permission.category].push(permission);
  return acc;
}, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

const enhancedRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().min(1, 'Description is required'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

type EnhancedRoleFormValues = z.infer<typeof enhancedRoleSchema>;

interface EnhancedRoleFormProps {
  role: Role | null;
  onSave: (data: EnhancedRoleFormValues) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function EnhancedRoleForm({ role, onSave, onCancel, isSaving }: EnhancedRoleFormProps) {
  const form = useForm<EnhancedRoleFormValues>({
    resolver: zodResolver(enhancedRoleSchema),
    defaultValues: {
      name: role?.name || '',
      description: role?.description || '',
      permissions: role?.permissions || [],
    },
  });

  const selectedPermissions = form.watch('permissions');

  function onSubmit(values: EnhancedRoleFormValues) {
    onSave(values);
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const currentPermissions = form.getValues('permissions');
    if (checked) {
      form.setValue('permissions', [...currentPermissions, permissionId]);
    } else {
      form.setValue('permissions', currentPermissions.filter(p => p !== permissionId));
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const categoryPermissions = PERMISSIONS_BY_CATEGORY[category].map(p => p.id);
    const currentPermissions = form.getValues('permissions');
    
    if (checked) {
      // Add all permissions in this category
      const newPermissions = [...new Set([...currentPermissions, ...categoryPermissions])];
      form.setValue('permissions', newPermissions);
    } else {
      // Remove all permissions in this category
      const newPermissions = currentPermissions.filter(p => !categoryPermissions.includes(p));
      form.setValue('permissions', newPermissions);
    }
  };

  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions = PERMISSIONS_BY_CATEGORY[category].map(p => p.id);
    return categoryPermissions.every(p => selectedPermissions.includes(p));
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPermissions = PERMISSIONS_BY_CATEGORY[category].map(p => p.id);
    const selectedCount = categoryPermissions.filter(p => selectedPermissions.includes(p)).length;
    return selectedCount > 0 && selectedCount < categoryPermissions.length;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the purpose of this role..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel className="text-base font-medium">Permissions</FormLabel>
              <Badge variant="outline">
                {selectedPermissions.length} selected
              </Badge>
            </div>

            {Object.entries(PERMISSIONS_BY_CATEGORY).map(([category, permissions]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={isCategoryFullySelected(category)}
                      onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                    />
                    <CardTitle className="text-sm">{category}</CardTitle>
                    {isCategoryPartiallySelected(category) && (
                      <Badge variant="secondary" className="text-xs">
                        Partial
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(permission.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
