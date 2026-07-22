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
  
  // Users Management
  { id: 'users_view', label: 'View Users', category: 'Users' },
  { id: 'users_add', label: 'Add Users', category: 'Users' },
  { id: 'users_edit', label: 'Edit Users', category: 'Users' },
  { id: 'users_delete', label: 'Delete Users', category: 'Users' },
  { id: 'users_change_status', label: 'Change User Status', category: 'Users' },
  
  // Companies Management
  { id: 'companies_view', label: 'View Companies', category: 'Companies' },
  { id: 'companies_add', label: 'Add Companies', category: 'Companies' },
  { id: 'companies_edit', label: 'Edit Companies', category: 'Companies' },
  { id: 'companies_delete', label: 'Delete Companies', category: 'Companies' },
  
  // Network Management
  { id: 'network_view', label: 'View Network', category: 'Network' },
  { id: 'network_areas_add', label: 'Add Areas', category: 'Network' },
  { id: 'network_areas_edit', label: 'Edit Areas', category: 'Network' },
  { id: 'network_areas_delete', label: 'Delete Areas', category: 'Network' },
  { id: 'network_olts_add', label: 'Add OLTs', category: 'Network' },
  { id: 'network_olts_edit', label: 'Edit OLTs', category: 'Network' },
  { id: 'network_olts_delete', label: 'Delete OLTs', category: 'Network' },
  
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
  
  // Dealers Management
  { id: 'dealers_view', label: 'View Dealers', category: 'Dealers' },
  { id: 'dealers_add', label: 'Add Dealers', category: 'Dealers' },
  { id: 'dealers_edit', label: 'Edit Dealers', category: 'Dealers' },
  { id: 'dealers_delete', label: 'Delete Dealers', category: 'Dealers' },
  { id: 'dealers_franchises_add', label: 'Add Franchises', category: 'Dealers' },
  { id: 'dealers_franchises_edit', label: 'Edit Franchises', category: 'Dealers' },
  { id: 'dealers_franchises_delete', label: 'Delete Franchises', category: 'Dealers' },
  
  // HR Management
  { id: 'hr_view', label: 'View HR', category: 'HR' },
  { id: 'hr_staff_add', label: 'Add Staff', category: 'HR' },
  { id: 'hr_staff_edit', label: 'Edit Staff', category: 'HR' },
  { id: 'hr_staff_delete', label: 'Delete Staff', category: 'HR' },
  { id: 'hr_recovery_officers_add', label: 'Add Recovery Officers', category: 'HR' },
  { id: 'hr_recovery_officers_edit', label: 'Edit Recovery Officers', category: 'HR' },
  { id: 'hr_recovery_officers_delete', label: 'Delete Recovery Officers', category: 'HR' },
  
  // Reports & Analytics
  { id: 'reports_view', label: 'View Reports', category: 'Reports' },
  { id: 'reports_financial', label: 'Financial Reports', category: 'Reports' },
  { id: 'reports_usage', label: 'Usage Reports', category: 'Reports' },
  { id: 'reports_collections', label: 'Collections Reports', category: 'Reports' },
  
  // System Administration
  { id: 'system_view', label: 'View System', category: 'System' },
  { id: 'system_config', label: 'System Configuration', category: 'System' },
  { id: 'system_logs', label: 'View System Logs', category: 'System' },
  { id: 'system_backup', label: 'System Backup', category: 'System' },
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
