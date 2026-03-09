'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { userSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { UserForm } from './user-form';
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
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    // Filter roles that can be assigned based on current user's role
    const assignableRoles = useMemo(() => {
        if (!currentUser) return [];
        
        const roleHierarchy = {
            'owner': ['admin', 'manager', 'recovery_officer', 'dealer', 'staff'],
            'admin': ['admin', 'manager', 'recovery_officer', 'dealer', 'staff'],
            'manager': ['recovery_officer', 'dealer', 'staff'],
            'recovery_officer': [],
            'dealer': [],
            'staff': []
        };

        const allowedRoleNames = roleHierarchy[currentUser.role as keyof typeof roleHierarchy] || [];
        
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

    const filteredData = useMemo(() => {
        return roleFilteredData.filter(user => 
            (user.name?.toLowerCase() || '').includes(filter.toLowerCase()) || 
            (user.email?.toLowerCase() || '').includes(filter.toLowerCase())
        );
    }, [roleFilteredData, filter]);

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

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
        onChangeStatus: handleChangeStatus,
        currentUserRole: currentUser?.role
    });


    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by name or email..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    {/* Show Add User button only for admins and owners */}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => setSelectedUser(null)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add User
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{selectedUser ? 'Edit' : 'Add'} User</DialogTitle>
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

            <DeleteAlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onDelete={handleDelete}
                itemName={selectedUser?.name}
            />
        </>
    )
}
