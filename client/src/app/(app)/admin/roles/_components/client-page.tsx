'use client';

import { useState, useMemo, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { Loader2, Search, Eye, Save, Users, UserRound, Handshake, ChevronRight, ChevronDown } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { smartMatch } from '@/lib/search';
import { useQueryClient } from '@tanstack/react-query';
import {
  PERMISSION_DEFS,
  PERMISSION_FOLDERS,
  PERMISSION_CHILD_DEFS,
  CHILDREN_BY_PARENT,
  ALL_PERMISSION_IDS,
  ALL_FOLDERS_ID,
} from '@/lib/permission-pages';

const PERMISSIONS = PERMISSION_DEFS;

const MODULES = [...new Set(PERMISSIONS.map(p => p.module))];

const FOLDER_OPTIONS = PERMISSION_FOLDERS.map(folder => ({
  id: folder.id,
  name: folder.name,
  secondary: `${folder.modules.length === 0
    ? PERMISSIONS.length
    : PERMISSIONS.filter(p => folder.modules.includes(p.module)).length} permissions`,
}));

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
  const [selectedFolder, setSelectedFolder] = useState<string>(ALL_FOLDERS_ID);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (permId: string) => {
    setExpanded(prev => ({ ...prev, [permId]: !prev[permId] }));
  };

  // Only the modules owned by the selected sidebar folder are listed.
  const visibleModules = useMemo(() => {
    if (selectedFolder === ALL_FOLDERS_ID) return MODULES;
    const folder = PERMISSION_FOLDERS.find(f => f.id === selectedFolder);
    if (!folder) return MODULES;
    return MODULES.filter(module => folder.modules.includes(module));
  }, [selectedFolder]);

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
      const res = await api.get(`/admin/roles/users/${selectedUserId}/permissions`, { params: { companyId } });
      const data = res.data?.data || [];
      const permMap: Record<string, { web: boolean; mobile: boolean }> = {};
      ALL_PERMISSION_IDS.forEach(id => { permMap[id] = { web: false, mobile: false }; });
      const saved = new Set<string>();
      (Array.isArray(data) ? data : []).forEach((p: any) => {
        permMap[p.permissionId] = { web: p.webEnabled ?? true, mobile: p.mobileEnabled ?? true };
        saved.add(p.permissionId);
      });
      // Per-page CRUD children inherit their parent's state when the parent was
      // saved before these children existed, so existing users keep their
      // buttons instead of silently losing them.
      PERMISSION_CHILD_DEFS.forEach(child => {
        if (!saved.has(child.id)) permMap[child.id] = { ...(permMap[child.parentId] ?? { web: false, mobile: false }) };
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
    setPermissions(prev => {
      const web = !prev[permId]?.web;
      return setWithChildren(prev, permId, 'web', web);
    });
  };

  const handleToggleMobile = (permId: string) => {
    setPermissions(prev => {
      const mobile = !prev[permId]?.mobile;
      return setWithChildren(prev, permId, 'mobile', mobile);
    });
  };

  // Toggling a parent page permission cascades down to its Create / Update /
  // Delete children, so granting a page grants its actions by default and an
  // admin can then switch individual actions back off.
  const setWithChildren = (
    prev: Record<string, { web: boolean; mobile: boolean }>,
    permId: string,
    platform: 'web' | 'mobile',
    value: boolean,
  ) => {
    const next = { ...prev };
    next[permId] = { ...next[permId], [platform]: value };
    (CHILDREN_BY_PARENT[permId] || []).forEach(child => {
      next[child.id] = { ...next[child.id], [platform]: value };
    });
    return next;
  };

  // Toggling a child switches the parent on when any child is enabled, so the
  // page itself is never hidden while one of its actions is granted.
  const setParentFromChild = (
    prev: Record<string, { web: boolean; mobile: boolean }>,
    parentId: string,
    platform: 'web' | 'mobile',
    anyChildOn: boolean,
  ) => {
    if (!prev[parentId]?.[platform] && !anyChildOn) return prev;
    const next = { ...prev };
    next[parentId] = { ...next[parentId], [platform]: true };
    return next;
  };

  const handleToggleChildWeb = (parentId: string, childId: string) => {
    setPermissions(prev => {
      const web = !prev[childId]?.web;
      const next = { ...prev, [childId]: { ...prev[childId], web } };
      return setParentFromChild(next, parentId, 'web', web);
    });
  };

  const handleToggleChildMobile = (parentId: string, childId: string) => {
    setPermissions(prev => {
      const mobile = !prev[childId]?.mobile;
      const next = { ...prev, [childId]: { ...prev[childId], mobile } };
      return setParentFromChild(next, parentId, 'mobile', mobile);
    });
  };

  // Bulk "select all" for a module also covers the module's per-page CRUD
  // children, otherwise the header checkbox could never read as fully checked.
  const modulePermissionIds = (module: string) => [
    ...PERMISSIONS.filter(p => p.module === module).map(p => p.id),
    ...PERMISSION_CHILD_DEFS.filter(p => p.module === module).map(p => p.id),
  ];

  const handleToggleModuleWeb = (module: string, checked: boolean) => {
    const ids = modulePermissionIds(module);
    setPermissions(prev => {
      const next = { ...prev };
      ids.forEach(id => { if (next[id]) next[id] = { ...next[id], web: checked }; });
      return next;
    });
  };

  const handleToggleModuleMobile = (module: string, checked: boolean) => {
    const ids = modulePermissionIds(module);
    setPermissions(prev => {
      const next = { ...prev };
      ids.forEach(id => { if (next[id]) next[id] = { ...next[id], mobile: checked }; });
      return next;
    });
  };

  const moduleWebAllSelected = (module: string) => {
    const ids = modulePermissionIds(module);
    return ids.every(id => permissions[id]?.web);
  };

  const moduleMobileAllSelected = (module: string) => {
    const ids = modulePermissionIds(module);
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
      await api.put(`/admin/roles/users/${selectedUserId}/permissions`, { permissions: permList, companyId });
      toast({ title: 'Success', description: 'Permissions saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['admin/roles/users', selectedUserId, 'permissions'] });
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
          <CardTitle className="text-base">Select Subscriber</CardTitle>
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
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Permissions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{selectedCount} permissions enabled</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchableDropdown
                items={FOLDER_OPTIONS}
                value={selectedFolder}
                onValueChange={setSelectedFolder}
                placeholder="Search folder..."
                allowClear={false}
                matchContainsOnly
                className="sm:w-72"
              />
              <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
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
                  {visibleModules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-3 text-center text-sm text-muted-foreground">
                        No permissions found for this folder.
                      </td>
                    </tr>
                  ) : (
                    visibleModules.map(module => {
                      const modulePerms = PERMISSIONS.filter(p => p.module === module);
                      const webAll = moduleWebAllSelected(module);
                      const mobileAll = moduleMobileAllSelected(module);
                      return (
                        <Fragment key={module}>
                          <tr className="border-b bg-accent/30">
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
                          {modulePerms.map(p => {
                            const children = CHILDREN_BY_PARENT[p.id] || [];
                            const isOpen = !!expanded[p.id];
                            return (
                              <Fragment key={p.id}>
                                <tr
                                  className={`border-b hover:bg-muted/30 ${children.length ? 'cursor-pointer' : ''}`}
                                  onClick={() => children.length && toggleExpanded(p.id)}
                                >
                                  <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{p.id}</td>
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-1.5">
                                      {children.length > 0 && (
                                        <span className="text-muted-foreground shrink-0">
                                          {isOpen
                                            ? <ChevronDown className="h-4 w-4" />
                                            : <ChevronRight className="h-4 w-4" />}
                                        </span>
                                      )}
                                      <span className={children.length ? 'font-medium' : undefined}>{p.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground">{p.module}</td>
                                  <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                                    <Checkbox
                                      checked={permissions[p.id]?.web ?? false}
                                      onCheckedChange={() => handleToggleWeb(p.id)}
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                                    <Checkbox
                                      checked={permissions[p.id]?.mobile ?? false}
                                      onCheckedChange={() => handleToggleMobile(p.id)}
                                    />
                                  </td>
                                </tr>
                                {isOpen && children.map(child => (
                                  <tr key={child.id} className="border-b bg-muted/20 hover:bg-muted/30">
                                    <td className="py-1.5 pl-10 pr-3 font-mono text-xs text-muted-foreground/70">{child.id}</td>
                                    <td className="py-1.5 pr-3 text-sm">
                                      <div className="flex items-center gap-1.5 pl-10">
                                        <span className="text-muted-foreground select-none">↳</span>
                                        <span>{child.label}</span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 pl-10 pr-3 text-xs text-muted-foreground">{p.name}</td>
                                    <td className="py-1.5 px-3 text-center">
                                      <Checkbox
                                        checked={permissions[child.id]?.web ?? false}
                                        onCheckedChange={() => handleToggleChildWeb(p.id, child.id)}
                                      />
                                    </td>
                                    <td className="py-1.5 px-3 text-center">
                                      <Checkbox
                                        checked={permissions[child.id]?.mobile ?? false}
                                        onCheckedChange={() => handleToggleChildMobile(p.id, child.id)}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </Fragment>
                            );
                          })}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
