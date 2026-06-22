'use client'

import { DataTable } from './data-table';
import { getColumns } from './columns';
import type { DealerFranchise } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { dealerFranchiseSchema } from '@/lib/schemas';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { DealerFranchiseForm } from './dealer-franchise-form';


import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface ClientPageProps {
    data: DealerFranchise[];
}

type FranchiseFormValues = z.infer<typeof dealerFranchiseSchema>;

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedFranchise, setSelectedFranchise] = useState<DealerFranchise | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const filteredData = useMemo(() => data.filter(franchise =>
        franchise.name.toLowerCase().includes(filter.toLowerCase()) ||
        franchise.contactPerson.toLowerCase().includes(filter.toLowerCase())
    ), [data, filter]);

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

    const handleSave = async (formData: FranchiseFormValues) => {
        setIsSaving(true);
        try {
            const payload = { ...formData, companyId: companyId! };
            if (selectedFranchise) {
                await api.put(`/dealers/franchises/${selectedFranchise.id}`, payload);
                toast({ title: 'Success', description: 'Franchise updated successfully.' });
            } else {
                await api.post('/dealers/franchises', payload);
                toast({ title: 'Success', description: 'Franchise added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: ['dealers/franchises', companyId] });
            setIsFormOpen(false);
            setSelectedFranchise(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save franchise',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (franchise: DealerFranchise) => {
        setSelectedFranchise(franchise);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedFranchise) {
            try {
                await api.delete(`/dealers/franchises/${selectedFranchise.id}`);
                queryClient.invalidateQueries({ queryKey: ['dealers/franchises', companyId] });
                toast({ title: 'Success', description: 'Franchise deleted successfully.' });
                setIsDeleteDialogOpen(false);
                setSelectedFranchise(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.response?.data?.message || 'Failed to delete franchise',
                });
            }
        }
    };

    const openDeleteDialog = (franchise: DealerFranchise) => {
        setSelectedFranchise(franchise);
        setIsDeleteDialogOpen(true);
    };

    const handleApprove = async (franchise: DealerFranchise) => {
        try {
            await api.put(`/dealers/franchises/${franchise.id}`, { ...franchise, status: 'approved' });
            queryClient.invalidateQueries({ queryKey: ['dealers/franchises', companyId] });
            toast({ title: 'Success', description: 'Franchise approved.' });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to approve franchise',
            });
        }
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
        onApprove: handleApprove,
    });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by name or contact person..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedFranchise(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Franchise
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedFranchise ? 'Edit' : 'Add'} Franchise</DialogTitle>
                            </DialogHeader>
                            <DealerFranchiseForm
                                franchise={selectedFranchise}
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
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} franchises
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
                itemName={selectedFranchise?.name}
            />
        </>
    )
}
