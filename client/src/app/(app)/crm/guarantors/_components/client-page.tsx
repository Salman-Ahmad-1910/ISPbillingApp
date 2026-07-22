'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Download, Search, ChevronLeft, ChevronRight, UserCheck, Users, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';

import type { Guarantor, Customer } from '@/lib/types';
import { guarantorSchema } from '@/lib/schemas';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';


import { DataTable } from './data-table';
import { getColumns } from './columns';
import { GuarantorForm } from './guarantor-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type GuarantorFormValues = z.infer<typeof guarantorSchema>;


interface ClientPageProps {
    data: Guarantor[];
}

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [guarantors, setGuarantors] = useState<Guarantor[]>(data);
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedGuarantor, setSelectedGuarantor] = useState<Guarantor | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const { data: companyCustomers = [] } = useGenericQuery<any>('crm/customers', companyId ?? undefined);

    useEffect(() => {
        setGuarantors(data);
    }, [data]);

    const uniqueCustomers = useMemo(() => new Set(guarantors.map(g => g.customerName)).size, [guarantors]);

    const filteredData = useMemo(() => guarantors.filter(guarantor =>
        guarantor.name.toLowerCase().includes(filter.toLowerCase()) ||
        guarantor.cnic.includes(filter) ||
        guarantor.customerName.toLowerCase().includes(filter.toLowerCase())
    ), [guarantors, filter]);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const handleSave = async (formData: GuarantorFormValues) => {
        setIsSaving(true);
        try {
            const customer = companyCustomers.find((c: any) => c.id === formData.customerId);
            if (!customer) {
                toast({ variant: 'destructive', title: "Error", description: "Selected customer not found." });
                setIsSaving(false);
                return;
            }

            if (selectedGuarantor) {
                await api.put(`/crm/guarantors/${selectedGuarantor.id}?companyId=${companyId}`, formData);
                toast({ title: "Success", description: "Guarantor updated successfully." });
            } else {
                await api.post(`/crm/guarantors?companyId=${companyId}`, {
                    ...formData,
                    companyId: companyId!,
                    customerName: customer.name,
                });
                toast({ title: "Success", description: "Guarantor added successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['crm/guarantors', companyId] });
            setIsFormOpen(false);
            setSelectedGuarantor(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save guarantor'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (guarantor: Guarantor) => {
        setSelectedGuarantor(guarantor);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedGuarantor) {
            try {
                await api.delete(`/crm/guarantors/${selectedGuarantor.id}?companyId=${companyId}`);
                toast({ title: "Success", description: "Guarantor deleted successfully." });
                queryClient.invalidateQueries({ queryKey: ['crm/guarantors', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedGuarantor(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.response?.data?.message || 'Failed to delete guarantor'
                });
            }
        }
    };

    const openDeleteDialog = (guarantor: Guarantor) => {
        setSelectedGuarantor(guarantor);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
    });

    return (
        <>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Total Guarantors</p>
                                <p className="text-2xl font-bold">{guarantors.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Unique Customers</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{uniqueCustomers}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Avg per Customer</p>
                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{uniqueCustomers > 0 ? (guarantors.length / uniqueCustomers).toFixed(1) : 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by name, CNIC, or customer..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="max-w-sm pl-8"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => setSelectedGuarantor(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Guarantor
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <div className="rounded-md bg-gradient-to-br from-teal-500 to-cyan-600 p-1 text-white">
                                            <UserCheck className="h-4 w-4" />
                                        </div>
                                        {selectedGuarantor ? 'Edit' : 'Add'} Guarantor
                                    </DialogTitle>
                                </DialogHeader>
                                <GuarantorForm
                                    guarantor={selectedGuarantor}
                                    customers={companyCustomers}
                                    onSave={handleSave}
                                    onCancel={() => setIsFormOpen(false)}
                                    isSaving={isSaving}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <DataTable columns={columns} data={getPaginatedData()} />

                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} guarantors
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
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                            {getVisiblePages().map(page => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="w-8 h-8 p-0 transition-all duration-200 hover:scale-110"
                                >
                                    {page}
                                </Button>
                            ))}

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
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            <DeleteAlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onDelete={handleDelete}
                itemName={selectedGuarantor?.name}
            />
        </>
    )
}
