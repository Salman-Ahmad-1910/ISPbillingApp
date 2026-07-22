'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Users } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { userSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { UserForm } from './user-form';
import { UserImportExport } from './user-import-export';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';


import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import type { User, Role } from '@/lib/types';

type UserFormValues = z.infer<typeof userSchema>;

interface ClientPageProps {
    data: User[];
    roles: Role[];
    currentUser: User | null | undefined;
}

export function ClientPage({ data, roles, currentUser }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [showImportExport, setShowImportExport] = useState(false);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    // Filter roles that can be assigned based on current user's role
    const assignableRoles = useMemo(() => {
        if (!currentUser) return [];
        
        const roleHierarchy: Record<string, string[]> = {
            'owner': ['admin', 'manager', 'recovery_officer', 'dealer', 'staff'],
            'admin': ['admin', 'manager', 'recovery_officer', 'dealer', 'staff'],
            'manager': ['recovery_officer', 'dealer', 'staff'],
            'recovery_officer': [],
            'dealer': [],
            'staff': []
        };

        const allowedRoleNames = roleHierarchy[currentUser.role] || [];
        
        return roles.filter(role => allowedRoleNames.includes(role.name));
    }, [roles, currentUser]);

    // Role-based filtering
    const roleFilteredData = useMemo(() => {
        if (!currentUser) return [];
        
        // Define role hierarchy
        const roleHierarchy = {
            'owner': ['admin', 'manager', 'recovery_officer', 'dealer', 'staff'],
            'admin': ['admin', 'manager', 'recovery_officer', 'dealer', 'staff'],
            'manager': ['manager', 'recovery_officer', 'dealer', 'staff'],
            'recovery_officer': [],
            'dealer': [],
            'staff': []
        };

        const allowedRoles = roleHierarchy[currentUser.role as keyof typeof roleHierarchy] || [];
        
        // Filter users based on role hierarchy
        return data.filter(user => {
            // Don't show the current user in the list
            if (user.id === currentUser.id) return false;
            
            // Show only users with roles that the current user can manage
            return allowedRoles.includes(user.role);
        });
    }, [data, currentUser]);

    // Group users hierarchically
    const hierarchicalData = useMemo(() => {
        if (!currentUser) return [];
        
        // First, get all users that can be managed by current user (role-based filtering)
        const manageableUsers = roleFilteredData.filter(user => {
            // Don't show the current user in the list
            if (user.id === currentUser.id) return false;
            return true;
        });

        // Group users by their creator
        const userGroups: { [key: string]: User[] } = {};
        const topLevelUsers: User[] = [];

        manageableUsers.forEach(user => {
            if (user.createdBy) {
                // This user has a creator, group them under the creator
                if (!userGroups[user.createdBy]) {
                    userGroups[user.createdBy] = [];
                }
                userGroups[user.createdBy].push(user);
            } else {
                // This is a top-level user (no creator)
                topLevelUsers.push(user);
            }
        });

        // Create hierarchical structure
        const result: any[] = [];
        
        // Add top-level users and their sub-users
        topLevelUsers.forEach(parentUser => {
            result.push({
                ...parentUser,
                isParent: true,
                level: 0,
                subUsers: userGroups[parentUser.id] || []
            });
            
            // Add sub-users
            (userGroups[parentUser.id] || []).forEach(subUser => {
                result.push({
                    ...subUser,
                    isParent: false,
                    level: 1,
                    parentId: parentUser.id,
                    parent: parentUser // Include parent reference
                });
            });
        });

        // Also add users whose creators are not in the manageable list (orphaned users)
        Object.keys(userGroups).forEach(creatorId => {
            const creator = manageableUsers.find(u => u.id === creatorId);
            if (!creator) {
                // Creator is not in manageable list, but their sub-users are
                userGroups[creatorId].forEach(orphanedUser => {
                    result.push({
                        ...orphanedUser,
                        isParent: false,
                        level: 1,
                        parentId: creatorId,
                        isOrphaned: true
                    });
                });
            }
        });

        return result;
    }, [roleFilteredData, currentUser]);

    const filteredData = useMemo(() => {
        return hierarchicalData.filter(user => 
            (user.name?.toLowerCase() || '').includes(filter.toLowerCase()) || 
            (user.email?.toLowerCase() || '').includes(filter.toLowerCase())
        );
    }, [hierarchicalData, filter]);

    // Pagination helpers
    const totalPages = Math.ceil(filteredData.length / pageSize);

    const getPaginatedData = () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredData.slice(startIndex, endIndex);
    };

    const getVisiblePages = () => {
        const pages = [];
        const startPage = Math.max(1, currentPage - 3);
        const endPage = Math.min(totalPages, currentPage + 3);
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        return pages;
    };

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            setPageInput(value);
        }
    };

    const handlePageSubmit = () => {
        const page = parseInt(pageInput);
        if (page && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setPageInput('');
        }
    };

    const handlePageKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handlePageSubmit();
        }
    };

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const handleSave = async (formData: UserFormValues) => {
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                companyId: companyId || undefined,
            };

            if (selectedUser) {
                await api.put(`/admin/users/${selectedUser.id}`, payload);
                toast({ title: 'Success', description: 'User updated successfully.' });
            } else {
                await api.post('/admin/users', payload);
                toast({ title: 'Success', description: 'User added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: ['admin/users', companyId] });
            setIsFormOpen(false);
            setSelectedUser(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save user',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedUser) {
            try {
                await api.delete(`/admin/users/${selectedUser.id}`);
                queryClient.invalidateQueries({ queryKey: ['admin/users', companyId] });
                toast({ title: 'Success', description: 'User deleted successfully.' });
                setIsDeleteDialogOpen(false);
                setSelectedUser(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.response?.data?.message || 'Failed to delete user',
                });
            }
        }
    };

    const openDeleteDialog = (user: User) => {
        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
    };

    const handleChangeStatus = async (user: User) => {
        try {
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            await api.put(`/admin/users/${user.id}`, { ...user, status: newStatus });
            queryClient.invalidateQueries({ queryKey: ['admin/users', companyId] });
            toast({ title: 'Success', description: `User status changed to ${newStatus}.` });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to change status',
            });
        }
    }

    // Add summary statistics
    const userStats = useMemo(() => {
        const parentUsers = hierarchicalData.filter(u => u.isParent);
        const subUsers = hierarchicalData.filter(u => !u.isParent);
        const orphanedUsers = hierarchicalData.filter(u => u.isOrphaned);
        
        return {
            totalUsers: hierarchicalData.length,
            parentUsers: parentUsers.length,
            subUsers: subUsers.length,
            orphanedUsers: orphanedUsers.length,
            totalGroups: parentUsers.length
        };
    }, [hierarchicalData]);

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
        onChangeStatus: handleChangeStatus,
        currentUserRole: currentUser?.role
    });


    return (
        <>
            {showImportExport ? (
                <div className="p-6">
                    <div className="mb-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowImportExport(false)}
                            className="mb-4"
                        >
                            ← Back to Users
                        </Button>
                    </div>
                    <UserImportExport />
                </div>
            ) : (
                <div className="p-6">
                    {/* User Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold">{userStats.totalUsers}</div>
                            <div className="text-sm text-muted-foreground">Total Users</div>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-2xl font-bold text-blue-600">{userStats.parentUsers}</div>
                            <div className="text-sm text-muted-foreground">Parent Users</div>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-600">{userStats.subUsers}</div>
                            <div className="text-sm text-muted-foreground">Sub Users</div>
                        </div>
                        <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="text-2xl font-bold text-orange-600">{userStats.orphanedUsers}</div>
                            <div className="text-sm text-muted-foreground">Orphaned</div>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="text-2xl font-bold text-purple-600">{userStats.totalGroups}</div>
                            <div className="text-sm text-muted-foreground">User Groups</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                        <Input
                            placeholder="Filter by name or email..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="max-w-sm"
                        />
                        <div className="flex gap-2">
                            {/* Show Import/Export button only for admins and owners */}
                            {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowImportExport(true)}
                                >
                                    Import/Export
                                </Button>
                            )}
                            {/* Show Add User button only for admins and owners */}
                            {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                                    <DialogTrigger asChild>
                                        <Button onClick={() => setSelectedUser(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add User
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                {selectedUser ? 'Edit' : 'Add'} User
                                            </DialogTitle>
                                        </DialogHeader>
                                        <UserForm
                                            user={selectedUser}
                                            roles={assignableRoles}
                                            onSave={handleSave}
                                            onCancel={() => setIsFormOpen(false)}
                                            isSaving={isSaving}
                                        />
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                    <DataTable columns={columns} data={getPaginatedData()} />
                
                {/* Advanced Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} users
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        
                        {/* Page numbers - show current page ± 3 */}
                        <div className="flex items-center gap-1">
                            {getVisiblePages().map(page => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="w-8 h-8 p-0"
                                >
                                    {page}
                                </Button>
                            ))}
                            
                            {/* Show ellipsis if there are more pages */}
                            {currentPage + 3 < totalPages && (
                                <>
                                    <span className="px-2 text-muted-foreground">...</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="w-8 h-8 p-0"
                                    >
                                        {totalPages}
                                    </Button>
                                </>
                            )}
                        </div>
                        
                        {/* Page input */}
                        <div className="flex items-center gap-1">
                            <Input
                                type="text"
                                placeholder="Go to"
                                value={pageInput}
                                onChange={handlePageInputChange}
                                onKeyPress={handlePageKeyPress}
                                className="w-16 h-8 text-center"
                                min={1}
                                max={totalPages}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePageSubmit}
                                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                                className="h-8 px-2"
                            >
                                Go
                            </Button>
                        </div>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
                </div>
            )}

            <DeleteAlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onDelete={handleDelete}
                itemName={selectedUser?.name}
            />
        </>
    )
}
