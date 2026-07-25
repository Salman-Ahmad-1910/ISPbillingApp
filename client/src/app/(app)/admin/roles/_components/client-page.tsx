'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShieldCheck, Check, Settings, RefreshCw, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import type { Role } from '@/lib/types';
import { roleSchema } from '@/lib/schemas';
import { z } from 'zod';
import { EnhancedRoleForm } from './enhanced-role-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

type RoleFormValues = z.infer<typeof roleSchema>;

interface ClientPageProps {
  data: Role[];
}

interface DefaultRole {
  name: string;
  description: string;
  permissions: string[];
}

// Helper functions
const groupPermissionsByCategory = (permissions: string[]) => {
  const categories: Record<string, string[]> = {
    'Dashboard': [],
    'Users': [],
    'Companies': [],
    'Network': [],
    'Billing': [],
    'Subscribers': [],
    'Dealers': [],
    'Recovery Officers': [],
    'Transactions': [],
    'Complaints': [],
    'Messages': [],
    'Accounts': [],
    'Inventory': [],
    'Point of Sale': [],
    'HR': [],
    'Logs': [],
    'Reports': [],
    'System': [],
  };

  permissions.forEach(permission => {
    if (permission.startsWith('dashboard_')) categories['Dashboard'].push(permission);
    else if (permission.startsWith('users_')) categories['Users'].push(permission);
    else if (permission.startsWith('companies_')) categories['Companies'].push(permission);
    else if (permission.startsWith('network_')) categories['Network'].push(permission);
    else if (permission.startsWith('billing_')) categories['Billing'].push(permission);
    else if (permission.startsWith('subscribers_')) categories['Subscribers'].push(permission);
    else if (permission.startsWith('dealers_')) categories['Dealers'].push(permission);
    else if (permission.startsWith('hr_recovery_officers_allocate')) categories['Recovery Officers'].push(permission);
    else if (permission.startsWith('transactions_')) categories['Transactions'].push(permission);
    else if (permission.startsWith('complaints_')) categories['Complaints'].push(permission);
    else if (permission.startsWith('messages_')) categories['Messages'].push(permission);
    else if (permission.startsWith('accounts_')) categories['Accounts'].push(permission);
    else if (permission.startsWith('inventory_')) categories['Inventory'].push(permission);
    else if (permission.startsWith('pos_')) categories['Point of Sale'].push(permission);
    else if (permission.startsWith('hr_')) categories['HR'].push(permission);
    else if (permission.startsWith('logs_')) categories['Logs'].push(permission);
    else if (permission.startsWith('reports_')) categories['Reports'].push(permission);
    else if (permission.startsWith('system_')) categories['System'].push(permission);
  });

  return Object.entries(categories).filter(([_, perms]) => perms.length > 0);
};

const formatPermissionLabel = (permissionId: string) => {
  const permissionMap: Record<string, string> = {
    'dashboard_view': 'View Dashboard',
    'users_view': 'View Users',
    'users_add': 'Add Users',
    'users_edit': 'Edit Users',
    'users_delete': 'Delete Users',
    'users_change_status': 'Change User Status',
    'companies_view': 'View Companies',
    'companies_add': 'Add Companies',
    'companies_edit': 'Edit Companies',
    'companies_delete': 'Delete Companies',
    'network_view': 'View Network',
    'network_areas_add': 'Add Areas',
    'network_areas_edit': 'Edit Areas',
    'network_areas_delete': 'Delete Areas',
    'network_olts_add': 'Add OLTs',
    'network_olts_edit': 'Edit OLTs',
    'network_olts_delete': 'Delete OLTs',
    'network_splitters_add': 'Add Splitters',
    'network_splitters_edit': 'Edit Splitters',
    'network_splitters_delete': 'Delete Splitters',
    'network_pops_add': 'Add POPs',
    'network_pops_edit': 'Edit POPs',
    'network_pops_delete': 'Delete POPs',
    'network_boxes_view': 'Box / Media',
    'billing_view': 'View Billing',
    'billing_packages_add': 'Add Packages',
    'billing_packages_edit': 'Edit Packages',
    'billing_packages_delete': 'Delete Packages',
    'billing_invoices_add': 'Create Invoices',
    'billing_invoices_edit': 'Edit Invoices',
    'billing_invoices_delete': 'Delete Invoices',
    'billing_payments_process': 'Process Payments',
    'subscribers_view': 'View Subscribers',
    'subscribers_add': 'Add Subscribers',
    'subscribers_edit': 'Edit Subscribers',
    'subscribers_delete': 'Delete Subscribers',
    'subscribers_packages_view': 'Packages',
    'subscribers_inquiries_view': 'New Inquiries',
    'subscribers_location_view': 'User Location',
    'dealers_view': 'View Dealers',
    'dealers_add': 'Add Dealers',
    'dealers_edit': 'Edit Dealers',
    'dealers_delete': 'Delete Dealers',
    'dealers_franchises_add': 'Add Franchises',
    'dealers_franchises_edit': 'Edit Franchises',
    'dealers_franchises_delete': 'Delete Franchises',
    'hr_recovery_officers_allocate': 'Area Allocation',
    'transactions_user_collections_view': 'User Collections',
    'transactions_dealers_collections_view': 'Dealers Collections',
    'transactions_allocated_view': 'Allocated Collection',
    'transactions_reprint': 'Reprint Slip',
    'transactions_bills_create': 'Bills Creator',
    'transactions_types_view': 'Transaction Type',
    'transactions_new_collection': 'New Collection',
    'transactions_bad_debt_view': 'Bad Debt Collection',
    'complaints_users_view': 'Users Complain',
    'complaints_allocated_view': 'Allocated Complains',
    'complaints_subjects_view': 'Subject Type',
    'complaints_types_view': 'Complain Type',
    'complaints_report_view': 'Complain Report',
    'messages_new_view': 'New Messages',
    'messages_other_view': 'Other Messages',
    'messages_draft_view': 'Draft Messages',
    'messages_sent_view': 'Sent Messages',
    'messages_expired_view': 'Expired Messages',
    'messages_whatsapp_view': 'WhatsApp Drafts',
    'accounts_heads_view': 'Account Heads',
    'accounts_entry_view': 'Account Entry',
    'accounts_one_day_view': 'One Day Balance Sheet',
    'accounts_reports_view': 'Accounts Report',
    'inventory_products_view': 'Products',
    'inventory_purchase_view': 'Purchase',
    'inventory_status_view': 'Inventory Status',
    'inventory_product_types_view': 'Product Type',
    'inventory_vendors_view': 'Vendor',
    'inventory_brands_view': 'Brand',
    'inventory_unit_types_view': 'Unit Type',
    'pos_sales_view': 'Sales (POS)',
    'hr_view': 'View HR',
    'hr_staff_add': 'Add Staff',
    'hr_staff_edit': 'Edit Staff',
    'hr_staff_delete': 'Delete Staff',
    'hr_recovery_officers_add': 'Add Recovery Officers',
    'hr_recovery_officers_edit': 'Edit Recovery Officers',
    'hr_recovery_officers_delete': 'Delete Recovery Officers',
    'hr_salary_view': 'Employee Salary',
    'hr_advances_view': 'Advances & Loans',
    'hr_attendance_day_view': 'Day Wise Attendance',
    'hr_attendance_user_view': 'User Wise Attendance',
    'logs_connections_view': 'Update Connections Log',
    'logs_deleted_collection_view': 'Deleted Collection',
    'logs_deleted_users_view': 'Deleted Users',
    'reports_view': 'View Reports',
    'reports_sales_view': 'Sales Reports',
    'reports_stock_movement_view': 'Stock Movement Reports',
    'reports_outstanding_payments_view': 'Outstanding Payments Reports',
    'reports_collections_view': 'Collections Reports',
    'reports_financial': 'Financial Reports',
    'reports_usage': 'Usage Reports',
    'reports_collections': 'Collections Reports',
    'reports_users_defaulter': 'Users Defaulter',
    'reports_allocated_defaulters': 'Allocated Defaulters',
    'reports_new_users': 'New Users List',
    'reports_monthly_collection_month_wise': 'Monthly Collection Month Wise',
    'reports_month_wise_collection': 'Month Wise Collection',
    'reports_unpaid_collection': 'Unpaid Collection',
    'reports_allocated_collections': 'Allocated Collections',
    'reports_promise_date': 'Promise Date Report',
    'reports_user_collections': 'User Collections Report',
    'reports_expiry_defaulters': 'Expiry Wise Defaulter',
    'reports_month_defaulters': 'Month Wise Defaulter',
    'reports_collection_not_generated': 'Collection Not Generated',
    'reports_creator_summary': 'User Creator Summary',
    'reports_package_wise': 'Package Wise List',
    'reports_deactivated_users': 'Deactivate User List',
    'reports_dealer_invoices': 'Dealer Invoice List',
    'reports_new_dealers': 'New Dealers List',
    'reports_dealers_collection': 'Dealers Collection',
    'reports_dealers_defaulter': 'Dealers Defaulter',
    'reports_abstract_stock': 'Abstract Stock',
    'reports_abstract_sales': 'Abstract Sales',
    'system_view': 'View System',
    'system_config': 'System Configuration',
    'system_logs': 'View System Logs',
    'system_backup': 'System Backup',
    'system_user_rights': 'User Rights',
    'system_change_password': 'Change Username/Password',
    'profile_manage': 'Manage Profile',
    'password_change': 'Change Password',
    'notifications_manage': 'Manage Notifications',
  };
  return permissionMap[permissionId] || permissionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultRoles, setDefaultRoles] = useState<DefaultRole[]>([]);
  const [showDefaultRoles, setShowDefaultRoles] = useState(false);

  const fetchDefaultRoles = async () => {
    try {
      const response = await api.get('/admin/roles/default');
      console.log('Default roles API response:', response.data);
      // Handle the wrapped response structure
      const rolesData = response.data?.data || response.data || [];
      console.log('Extracted roles data:', rolesData);
      setDefaultRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch default roles',
      });
    }
  };

  const seedDefaultRoles = async () => {
    try {
      await api.post('/admin/roles/seed');
      toast({ title: 'Success', description: 'Default roles seeded successfully' });
      // Refresh roles data
      queryClient.invalidateQueries({ queryKey: ['admin/roles', companyId] });
      fetchDefaultRoles();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to seed default roles',
      });
    }
  };

  useEffect(() => {
    fetchDefaultRoles();
  }, []);

  const handleSave = async (formData: any) => {
    setIsSaving(true);
    try {
      const payload = { ...formData, companyId: companyId! };

      if (selectedRole) {
        await api.put(`/admin/roles/${selectedRole.id}`, payload);
        toast({ title: 'Success', description: 'Role updated successfully.' });
      } else {
        await api.post('/admin/roles', payload);
        toast({ title: 'Success', description: 'Role added successfully.' });
      }
      queryClient.invalidateQueries({ queryKey: ['admin/roles', companyId] });
      setIsFormOpen(false);
      setSelectedRole(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save role',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (role: Role) => {
    // Parse permissions from string to array if needed
    const parsedRole = {
      ...role,
      permissions: typeof role.permissions === 'string' 
        ? role.permissions === 'all' 
          ? ['all'] 
          : role.permissions.split(',').map(p => p.trim()).filter(p => p)
        : role.permissions || []
    };
    setSelectedRole(parsedRole);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedRole) {
      try {
        await api.delete(`/admin/roles/${selectedRole.id}`);
        queryClient.invalidateQueries({ queryKey: ['admin/roles', companyId] });
        toast({ title: 'Success', description: 'Role deleted successfully.' });
        setIsDeleteDialogOpen(false);
        setSelectedRole(null);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.message || 'Failed to delete role',
        });
      }
    }
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const isDefaultRole = (roleName: string) => {
    return defaultRoles.some(defaultRole => defaultRole.name === roleName);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
            <p className="text-muted-foreground">
              Define user roles and manage access control permissions.
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showDefaultRoles} onOpenChange={setShowDefaultRoles}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Default Roles
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Default System Roles</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                    {(defaultRoles || []).map((role, index) => (
                      <Card key={index} className={isDefaultRole(role.name) ? 'border-blue-500 bg-blue-50' : ''}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            {role.name}
                            {isDefaultRole(role.name) && <Badge className="ml-2 bg-blue-100 text-blue-800">Active</Badge>}
                          </CardTitle>
                          <CardDescription>{role.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm">Permissions ({role.permissions?.length || 0}):</h5>
                            <div className="flex flex-wrap gap-1">
                              {(role.permissions || []).map((permission) => (
                                <Badge key={permission} variant="secondary" className="text-xs">
                                  {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Default roles provide pre-configured permission sets for common user types.
                    </p>
                    <Button onClick={seedDefaultRoles}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Seed/Update Default Roles
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedRole(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-xl shadow-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    {selectedRole ? 'Edit' : 'Add'} Role
                  </DialogTitle>
                </DialogHeader>
                <EnhancedRoleForm
                  role={selectedRole}
                  onSave={handleSave}
                  onCancel={() => setIsFormOpen(false)}
                  isSaving={isSaving}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Default Roles Management */}
        <Card>
          <CardHeader>
            <CardTitle>Default System Roles</CardTitle>
            <CardDescription>
              Pre-configured roles with standard permissions. These can be used as templates or directly assigned to users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {(defaultRoles || []).map((role, index) => (
                <Card key={index} className={isDefaultRole(role.name) ? 'border-blue-500 bg-blue-50' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      {role.name}
                      {isDefaultRole(role.name) && <Badge className="ml-2 bg-blue-100 text-blue-800">Active</Badge>}
                    </CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Permissions ({role.permissions?.length || 0}):</h5>
                      <div className="flex flex-wrap gap-1">
                        {(role.permissions || []).map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Roles</CardTitle>
            <CardDescription>
              User-defined roles with customized permissions for your specific business needs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data
                .filter(role => !isDefaultRole(role.name))
                .map((role) => (
                  <Card key={role.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="h-6 w-6 text-primary" />
                          {role.name}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(role)}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(role)}>Delete</Button>
                        </div>
                      </div>
                      <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="font-medium mb-2">Permissions</h4>
                        <div className="space-y-2">
                          {groupPermissionsByCategory(typeof role.permissions === 'string' ? role.permissions.split(',').map(p => p.trim()) : role.permissions).map(([category, permissions]) => (
                            <div key={category}>
                              <h5 className="text-sm font-medium text-muted-foreground mb-2">{category}</h5>
                              <div className="flex flex-wrap gap-1">
                                {permissions.map((permission) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {formatPermissionLabel(permission)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={selectedRole?.name}
      />
    </>
  );
}
