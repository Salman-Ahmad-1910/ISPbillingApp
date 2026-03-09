'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import type { Staff } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { staffSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { StaffForm } from './staff-form';
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
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Area } from '@/lib/types';

type StaffFormValues = z.infer<typeof staffSchema>;

interface ClientPageProps {
    data: Staff[];
}

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: areas = [] } = useGenericQuery<Area[]>('network/areas', companyId ?? undefined);
    
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const filteredData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data.filter(
            (member) =>
                member.name.toLowerCase().includes(filter.toLowerCase()) ||
                (member.designation && member.designation.toLowerCase().includes(filter.toLowerCase())) ||
                (member.email && member.email.toLowerCase().includes(filter.toLowerCase())) ||
                (member.phone && member.phone.toLowerCase().includes(filter.toLowerCase())) ||
                (member.secondaryPhone && member.secondaryPhone.toLowerCase().includes(filter.toLowerCase())) ||
                (member.department && member.department.toLowerCase().includes(filter.toLowerCase()))
        );
    }, [data, filter]);

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

    const handleSave = async (formData: StaffFormValues) => {
        console.log('handleSave called with:', formData);
        console.log('selectedStaff:', selectedStaff);
        console.log('companyId:', companyId);
        
        setIsSaving(true);
        try {
            const payload = { 
                ...formData, 
                role: 'staff', // Add role for backend processing
                companyId: companyId! 
            };
            console.log('Sending payload:', payload);
            
            if (selectedStaff) {
                console.log('Updating staff with ID:', selectedStaff.id);
                await api.put(`/hr/staff/${selectedStaff.id}`, payload);
                toast({ title: 'Success', description: 'Staff member updated successfully.' });
            } else {
                console.log('Creating new staff member');
                await api.post('/hr/staff', payload);
                toast({ title: 'Success', description: 'Staff member added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: ['hr/staff', companyId] });
            setIsFormOpen(false);
            setSelectedStaff(null);
        } catch (error: any) {
            console.error('Save error:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save staff member',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (staffMember: Staff) => {
        setSelectedStaff(staffMember);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedStaff) {
            try {
                await api.delete(`/hr/staff/${selectedStaff.id}`);
                queryClient.invalidateQueries({ queryKey: ['hr/staff', companyId] });
                toast({ title: 'Success', description: 'Staff member deleted successfully.' });
                setIsDeleteDialogOpen(false);
                setSelectedStaff(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.response?.data?.message || 'Failed to delete staff member',
                });
            }
        }
    };

    const openDeleteDialog = (staffMember: Staff) => {
        setSelectedStaff(staffMember);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({ onEdit: handleEdit, onDelete: openDeleteDialog, areas });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by name or designation..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedStaff(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Staff Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedStaff ? 'Edit' : 'Add'} Staff Member</DialogTitle>
                            </DialogHeader>
                            <StaffForm
                                staff={selectedStaff}
                                onSave={handleSave}
                                onCancel={() => setIsFormOpen(false)}
                                isSaving={isSaving}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                <DataTable columns={columns} data={getPaginatedData()} />
                
                {/* Advanced Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} staff members
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
                itemName={selectedStaff?.name}
            />
        </>
    )
}
