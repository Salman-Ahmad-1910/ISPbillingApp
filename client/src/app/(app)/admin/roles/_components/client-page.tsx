'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Eye, Save, Users, UserRound, Handshake } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { smartMatch } from '@/lib/search';
import { useQueryClient } from '@tanstack/react-query';

const PERMISSIONS = [
  { id: '13309', name: 'Country', module: 'Area' },
  { id: '13310', name: 'City', module: 'Area' },
  { id: '13311', name: 'Locality', module: 'Area' },
  { id: '13312', name: 'Sublocality', module: 'Area' },
  { id: '13313', name: 'Package', module: 'Users Profile' },
  { id: '13314', name: 'Box/Media', module: 'Users Profile' },
  { id: '13315', name: 'Users Details', module: 'Users Profile' },
  { id: '13316', name: 'New Queries', module: 'Users Profile' },
  { id: '13351', name: 'User Location', module: 'Users Profile' },
  { id: '13318', name: 'Dealers Details', module: 'Dealers Profile' },
  { id: '13317', name: 'Recovery Officer', module: 'Recovery Officer' },
  { id: '13319', name: 'Area Allocation', module: 'Recovery Officer' },
  { id: '13305', name: 'Allocated Collection', module: 'Transactions' },
  { id: '13324', name: 'Transaction Type', module: 'Transactions' },
  { id: '14079', name: 'New Collection', module: 'Transactions' },
  { id: '13308', name: 'Reprint Slip', module: 'Transactions' },
  { id: '13304', name: 'Users Collections', module: 'Transactions' },
  { id: '13320', name: 'Bills Creator', module: 'Transactions' },
  { id: '13321', name: 'Dealers Collections', module: 'Transactions' },
  { id: '13357', name: 'Baddebt Collection', module: 'Transactions' },
  { id: '15323', name: 'Subject Type', module: 'Complain' },
  { id: '15325', name: 'Complain Type', module: 'Complain' },
  { id: '15326', name: 'Complain Report', module: 'Complain' },
  { id: '13342', name: 'Users Complain', module: 'Complain' },
  { id: '13343', name: 'Allocated Complains', module: 'Complain' },
  { id: '13347', name: 'Draft Messages', module: 'Messages' },
  { id: '13348', name: 'Sent Messages', module: 'Messages' },
  { id: '13359', name: 'Whatsapp Draft Message', module: 'Messages' },
  { id: '13346', name: 'Other Messages', module: 'Messages' },
  { id: '13345', name: 'Expire Messages', module: 'Messages' },
  { id: '13344', name: 'New Messages', module: 'Messages' },
  { id: '13322', name: 'Account Heads', module: 'Accounts' },
  { id: '13323', name: 'Account Entry', module: 'Accounts' },
  { id: '13341', name: 'One Day Accounts', module: 'Accounts' },
  { id: '15313', name: 'Purchase', module: 'Inventory' },
  { id: '15312', name: 'Products', module: 'Inventory' },
  { id: '15309', name: 'Brand', module: 'Inventory' },
  { id: '15311', name: 'Unit Type', module: 'Inventory' },
  { id: '15310', name: 'Vendor', module: 'Inventory' },
  { id: '15321', name: 'Product Type', module: 'Inventory' },
  { id: '15314', name: 'Inventory Status', module: 'Inventory' },
  { id: '15315', name: 'Sales', module: 'Point Of Sale' },
  { id: '15317', name: 'Advance & Loan', module: 'HRM' },
  { id: '15318', name: 'Employee Salary', module: 'HRM' },
  { id: '15324', name: 'User Wise Attendance', module: 'HRM' },
  { id: '15322', name: 'Day Wise Attendance', module: 'HRM' },
  { id: '15316', name: 'Employee Details', module: 'HRM' },
  { id: '13334', name: 'Deleted Collection', module: 'Logs' },
  { id: '15328', name: 'Update Connections Log', module: 'Logs' },
  { id: '13335', name: 'Deleted Users', module: 'Logs' },
  { id: '13307', name: 'Allocated Defualters', module: 'Users Reports' },
  { id: '13325', name: 'Users Defaulter', module: 'Users Reports' },
  { id: '13326', name: 'New Users List', module: 'Users Reports' },
  { id: '13328', name: 'Package Wise List', module: 'Users Reports' },
  { id: '13329', name: 'Promise Date Report', module: 'Users Reports' },
  { id: '13330', name: 'Allocated Collections', module: 'Users Reports' },
  { id: '13355', name: 'Month Wise Collection', module: 'Users Reports' },
  { id: '13349', name: 'Expiry Wise Defaulter', module: 'Users Reports' },
  { id: '13356', name: 'Collection Not Generated', module: 'Users Reports' },
  { id: '13354', name: 'Monthly Collection Month Wise', module: 'Users Reports' },
  { id: '13358', name: 'Unpaid Collection', module: 'Users Reports' },
  { id: '13306', name: 'User Collections', module: 'Users Reports' },
  { id: '13353', name: 'Month Wise Defualter', module: 'Users Reports' },
  { id: '13327', name: 'Deactivate User List', module: 'Users Reports' },
  { id: '15327', name: 'User Creator Summary', module: 'Users Reports' },
  { id: '13331', name: 'Dealers Collection', module: 'Dealers Reports' },
  { id: '13333', name: 'New Dealers List', module: 'Dealers Reports' },
  { id: '13350', name: 'Dealer Invoice List', module: 'Dealers Reports' },
  { id: '13332', name: 'Dealers Defaulter', module: 'Dealers Reports' },
  { id: '13340', name: 'One Day Balance Sheet', module: 'Accounts Reports' },
  { id: '13336', name: 'Accounts Report', module: 'Accounts Reports' },
  { id: '15319', name: 'Abstract Stock', module: 'Stock Reports' },
  { id: '15320', name: 'Abstract Sales', module: 'Sales Reports' },
  { id: '13339', name: 'Change Username/Password', module: 'Settings' },
  { id: '13338', name: 'User Rights', module: 'Settings' },
  { id: '13337', name: 'Configurations', module: 'Settings' },
];

const MODULES = [...new Set(PERMISSIONS.map(p => p.module))];

const USER_CATEGORIES = [
  { key: 'staff', label: 'Staff', icon: Users, endpoint: 'hr/staff' },
  { key: 'recovery', label: 'Recovery Officer', icon: UserRound, endpoint: 'admin/recovery-officers' },
  { key: 'dealer', label: 'Dealer', icon: Handshake, endpoint: 'dealers' },
] as const;

export default function ClientPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [userCategory, setUserCategory] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, { web: boolean; mobile: boolean }>>({});
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const { data: staff = [] } = useGenericQuery<any>(userCategory === 'staff' ? 'hr/staff' : null, companyId ?? undefined);
  const { data: recoveryOfficers = [] } = useGenericQuery<any>(userCategory === 'recovery' ? 'admin/recovery-officers' : null, companyId ?? undefined);
  const { data: dealers = [] } = useGenericQuery<any>(userCategory === 'dealer' ? 'dealers' : null, companyId ?? undefined);

  const userList = useMemo(() => {
    let items: any[] = [];
    if (userCategory === 'staff') items = Array.isArray(staff) ? staff : [];
    else if (userCategory === 'recovery') items = Array.isArray(recoveryOfficers) ? recoveryOfficers : [];
    else if (userCategory === 'dealer') items = Array.isArray(dealers) ? dealers : [];
    return items;
  }, [userCategory, staff, recoveryOfficers, dealers]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return userList.slice(0, 20);
    return userList.filter((u: any) =>
      smartMatch(userSearch, [u.id], [u.name, u.email])
    ).slice(0, 20);
  }, [userList, userSearch]);

  const handleSelectUser = (user: any) => {
    setSelectedUserId(user.id);
    setSelectedUserName(user.name || user.email || '');
    setUserSearch(user.name || user.email || '');
    setShowDropdown(false);
    setPermissionsLoaded(false);
    setPermissions({});
  };

  const handleShowPermissions = async () => {
    if (!selectedUserId || !companyId) return;
    setIsLoadingPerms(true);
    try {
      const res = await api.get(`/admin/roles/user-permissions/${selectedUserId}`, { params: { companyId } });
      const data = res.data?.data || [];
      const permMap: Record<string, { web: boolean; mobile: boolean }> = {};
      PERMISSIONS.forEach(p => { permMap[p.id] = { web: false, mobile: false }; });
      (Array.isArray(data) ? data : []).forEach((p: any) => {
        permMap[p.permissionId] = { web: p.webEnabled ?? true, mobile: p.mobileEnabled ?? true };
      });
      setPermissions(permMap);
      setPermissionsLoaded(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load permissions' });
    } finally {
      setIsLoadingPerms(false);
    }
  };

  const handleToggleWeb = (permId: string) => {
    setPermissions(prev => ({
      ...prev,
      [permId]: { ...prev[permId], web: !prev[permId]?.web },
    }));
  };

  const handleToggleMobile = (permId: string) => {
    setPermissions(prev => ({
      ...prev,
      [permId]: { ...prev[permId], mobile: !prev[permId]?.mobile },
    }));
  };

  const handleToggleModuleWeb = (module: string, checked: boolean) => {
    const ids = PERMISSIONS.filter(p => p.module === module).map(p => p.id);
    setPermissions(prev => {
      const next = { ...prev };
      ids.forEach(id => { if (next[id]) next[id] = { ...next[id], web: checked }; });
      return next;
    });
  };

  const handleToggleModuleMobile = (module: string, checked: boolean) => {
    const ids = PERMISSIONS.filter(p => p.module === module).map(p => p.id);
    setPermissions(prev => {
      const next = { ...prev };
      ids.forEach(id => { if (next[id]) next[id] = { ...next[id], mobile: checked }; });
      return next;
    });
  };

  const moduleWebAllSelected = (module: string) => {
    const ids = PERMISSIONS.filter(p => p.module === module).map(p => p.id);
    return ids.every(id => permissions[id]?.web);
  };

  const moduleMobileAllSelected = (module: string) => {
    const ids = PERMISSIONS.filter(p => p.module === module).map(p => p.id);
    return ids.every(id => permissions[id]?.mobile);
  };

  const handleSave = async () => {
    if (!selectedUserId || !companyId) return;
    setIsSaving(true);
    try {
      const permList = Object.entries(permissions).map(([permissionId, val]) => ({
        permissionId,
        webEnabled: val.web,
        mobileEnabled: val.mobile,
      }));
      await api.put(`/admin/roles/user-permissions/${selectedUserId}`, { permissions: permList, companyId });
      toast({ title: 'Success', description: 'Permissions saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['admin/roles/user-permissions'] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to save permissions' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = Object.values(permissions).filter(p => p?.web || p?.mobile).length;

  return (
    <div className="space-y-6">
      {/* User Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* User Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {USER_CATEGORIES.map(cat => (
                <Button
                  key={cat.key}
                  variant={userCategory === cat.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setUserCategory(cat.key); setSelectedUserId(null); setSelectedUserName(''); setUserSearch(''); setPermissionsLoaded(false); setPermissions({}); }}
                >
                  <cat.icon className="mr-1.5 h-4 w-4" />
                  {cat.label}
                </Button>
              ))}
            </div>

            {userCategory && (
              <div className="flex gap-3 items-end">
                <div className="relative flex-1 max-w-sm">
                  <Label className="text-xs mb-1 block">Search by name or ID</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={e => { setUserSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Type name or ID..."
                      className="pl-8"
                    />
                  </div>
                  {showDropdown && filteredUsers.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                      {filteredUsers.map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm border-b last:border-b-0"
                          onClick={() => handleSelectUser(u)}
                        >
                          <span className="font-mono font-medium text-xs">{u.id?.slice(0, 8)}</span>
                          <span className="ml-2">{u.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{u.email || u.phone || ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleShowPermissions}
                  disabled={!selectedUserId || isLoadingPerms}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                >
                  {isLoadingPerms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  Show
                </Button>
              </div>
            )}

            {selectedUserId && (
              <Badge variant="secondary" className="w-fit gap-1">
                <span className="font-mono text-xs">{selectedUserId?.slice(0, 8)}</span>
                <span>•</span>
                <span>{selectedUserName}</span>
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      {permissionsLoaded && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Permissions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{selectedCount} permissions enabled</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2.5 px-3 font-medium">ID</th>
                    <th className="text-left py-2.5 px-3 font-medium">Name</th>
                    <th className="text-left py-2.5 px-3 font-medium">Module Name</th>
                    <th className="text-center py-2.5 px-3 font-medium">Website</th>
                    <th className="text-center py-2.5 px-3 font-medium">Mobile</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(module => {
                    const modulePerms = PERMISSIONS.filter(p => p.module === module);
                    const webAll = moduleWebAllSelected(module);
                    const mobileAll = moduleMobileAllSelected(module);
                    return (
                      <>
                        <tr key={module} className="border-b bg-accent/30">
                          <td colSpan={5} className="py-2 px-3">
                            <div className="flex items-center gap-4">
                              <span className="font-semibold text-sm">{module}</span>
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <Checkbox
                                  checked={webAll}
                                  onCheckedChange={c => handleToggleModuleWeb(module, !!c)}
                                />
                                Web
                              </label>
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <Checkbox
                                  checked={mobileAll}
                                  onCheckedChange={c => handleToggleModuleMobile(module, !!c)}
                                />
                                Mobile
                              </label>
                            </div>
                          </td>
                        </tr>
                        {modulePerms.map(p => (
                          <tr key={p.id} className="border-b hover:bg-muted/30">
                            <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{p.id}</td>
                            <td className="py-2 px-3">{p.name}</td>
                            <td className="py-2 px-3 text-muted-foreground">{p.module}</td>
                            <td className="py-2 px-3 text-center">
                              <Checkbox
                                checked={permissions[p.id]?.web ?? false}
                                onCheckedChange={() => handleToggleWeb(p.id)}
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Checkbox
                                checked={permissions[p.id]?.mobile ?? false}
                                onCheckedChange={() => handleToggleMobile(p.id)}
                              />
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
