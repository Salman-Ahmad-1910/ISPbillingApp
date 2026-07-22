'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import type { LedgerEntry } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { ledgerEntrySchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { LedgerEntryForm } from '../../_components/ledger-entry-form';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

type LedgerEntryFormValues = z.infer<typeof ledgerEntrySchema>;

interface ClientPageProps {
    initialData: LedgerEntry[];
    customerId: string | null;
}

export function ClientPage({ initialData, customerId }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');
    const [filter, setFilter] = useState<string>('');

    const entries = useMemo(() => {
        let currentBalance = 0;
        return initialData
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(entry => {
                currentBalance = currentBalance + (entry.debit || 0) - (entry.credit || 0);
                return { ...entry, balance: currentBalance };
            });
    }, [initialData]);

    const filteredData = useMemo(() => entries.filter(entry =>
        entry.description?.toLowerCase().includes(filter.toLowerCase())
    ), [entries, filter]);

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

    const handleSave = async (formData: LedgerEntryFormValues) => {
        setIsSaving(true);
        try {
            if (selectedEntry) {
                await api.put(`/accounts/ledger/${selectedEntry.id}?companyId=${companyId}`, {
                    ...formData,
                    companyId: companyId!,
                    subscriberId: customerId!,
                    accountType: 'customer'
                });
                toast({ title: 'Success', description: 'Ledger entry updated successfully.' });
            } else {
                await api.post(`/accounts/ledger?companyId=${companyId}`, {
                    ...formData,
                    companyId: companyId!,
                    subscriberId: customerId!,
                    accountType: 'customer'
                });
                toast({ title: 'Success', description: 'Ledger entry added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: [`accounts/ledger?subscriber_id=${customerId}`, companyId] });
            setIsFormOpen(false);
            setSelectedEntry(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save ledger entry',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (entry: LedgerEntry) => {
        setSelectedEntry(entry);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedEntry) {
            try {
                await api.delete(`/accounts/ledger/${selectedEntry.id}?companyId=${companyId}`);
                queryClient.invalidateQueries({ queryKey: [`accounts/ledger?subscriber_id=${customerId}`, companyId] });
                toast({ title: 'Success', description: 'Ledger entry deleted successfully.' });
                setIsDeleteDialogOpen(false);
                setSelectedEntry(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.response?.data?.message || 'Failed to delete ledger entry',
                });
            }
        }
    };

    const openDeleteDialog = (entry: LedgerEntry) => {
        setSelectedEntry(entry);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({ onEdit: handleEdit, onDelete: openDeleteDialog });

    const recalculateBalances = (currentEntries: Omit<LedgerEntry, 'balance'>[] | LedgerEntry[]): LedgerEntry[] => {
        let currentBalance = 0;
        return currentEntries
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(entry => {
                currentBalance = currentBalance + (entry.debit || 0) - (entry.credit || 0);
                return { ...entry, balance: currentBalance };
            });
    };

    if (!customerId) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                Please select a customer to view their ledger.
            </div>
        )
    }

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by description or type..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <div className="flex justify-end p-4 border-b">
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => setSelectedEntry(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Entry
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-1.5 text-white shadow-sm">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
                                        </div>
                                        <span>{selectedEntry ? 'Edit' : 'Add'} Ledger Entry</span>
                                    </DialogTitle>
                                </DialogHeader>
                                <LedgerEntryForm
                                    entry={selectedEntry}
                                    onSave={handleSave}
                                    onCancel={() => setIsFormOpen(false)}
                                    isSaving={isSaving}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <DataTable columns={columns} data={getPaginatedData()} />
                
                {/* Advanced Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
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
                itemName={`Entry: ${selectedEntry?.description}`}
            />
        </>
    )
}
