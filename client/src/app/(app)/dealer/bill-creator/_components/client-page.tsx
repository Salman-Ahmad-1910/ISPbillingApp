'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';

import type { CustomBill } from '@/lib/types';
import { customBillSchema } from '@/lib/schemas';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';


import { DataTable } from './data-table';
import { getColumns } from './columns';
import { BillForm } from './bill-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type BillFormValues = z.infer<typeof customBillSchema>;

interface ClientPageProps {
    data: CustomBill[];
}

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [bills, setBills] = useState<CustomBill[]>(data);
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<CustomBill | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const currentDealerId = 'DLR-001'; // This would be dynamic based on logged in user

    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const { data: companySubscribers = [] } = useGenericQuery<any>('subscribers', companyId ?? undefined);

    useEffect(() => {
        setBills(data);
    }, [data]);

    const filteredData = useMemo(() => bills.filter(bill =>
        (bill.subscriberName?.toLowerCase() || '').includes(filter.toLowerCase()) ||
        (bill.description?.toLowerCase() || '').includes(filter.toLowerCase())
    ), [bills, filter]);

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

    const handleSave = async (formData: BillFormValues) => {
        setIsSaving(true);
        try {
            const subscriber = companySubscribers.find(s => s.id === formData.subscriberId);
            if (!subscriber) {
                toast({ variant: 'destructive', title: "Error", description: "Selected subscriber not found." });
                setIsSaving(false);
                return;
            }

            if (selectedBill) {
                await api.put(`/billing/custom-bills/${selectedBill.id}?companyId=${companyId}`, formData);
                toast({ title: "Success", description: "Bill updated successfully." });
            } else {
                await api.post(`/billing/custom-bills?companyId=${companyId}`, {
                    ...formData,
                    companyId,
                    // Remove dealerId or use proper UUID from user context
                    status: 'pending'
                });
                toast({ title: "Success", description: "Bill created successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['billing/custom-bills', companyId] });
            setIsFormOpen(false);
            setSelectedBill(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save bill"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (bill: CustomBill) => {
        setSelectedBill(bill);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedBill) {
            try {
                await api.delete(`/billing/custom-bills/${selectedBill.id}?companyId=${companyId}`);
                toast({ title: "Success", description: "Bill deleted successfully." });
                queryClient.invalidateQueries({ queryKey: ['billing/custom-bills', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedBill(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete bill"
                });
            }
        }
    };

    const openDeleteDialog = (bill: CustomBill) => {
        setSelectedBill(bill);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
        subscribers: companySubscribers,
    });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by subscriber or description..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedBill(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create Bill
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedBill ? 'Edit' : 'Create'} Bill</DialogTitle>
                            </DialogHeader>
                            <BillForm
                                bill={selectedBill}
                                onSave={handleSave}
                                onCancel={() => setIsFormOpen(false)}
                                isSaving={isSaving}
                                subscribers={companySubscribers}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                <DataTable columns={columns} data={getPaginatedData()} />

                {/* Advanced Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} bills
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
                itemName={`Bill for ${selectedBill?.subscriberName}`}
            />
        </>
    )
}
