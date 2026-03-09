'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Download, ListFilter } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';

import type { Customer } from '@/lib/types';
import { customerSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { CustomerForm } from './customer-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerClientPageProps {
    data: Customer[];
}

export function CustomerClientPage({ data }: CustomerClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [customers, setCustomers] = useState<Customer[]>(data);
    const [filter, setFilter] = useState('');
    const [statusFilters, setStatusFilters] = useState<string[]>([]);

    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    console.log('companyId: ', companyId ?? '-')

    useEffect(() => {
        setCustomers(data);
    }, [data]);

    const filteredData = useMemo(() => customers
        .filter(customer =>
            customer.name.toLowerCase().includes(filter.toLowerCase()) ||
            customer.cnic.includes(filter)
        )
        .filter(customer => statusFilters.length === 0 || statusFilters.includes(customer.status)),
        [customers, filter, statusFilters]);

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
    }, [filter, statusFilters]);

    const handleSave = async (formData: CustomerFormValues) => {
        setIsSaving(true);
        try {
            if (selectedCustomer) {
                await api.put(`/crm/customers/${selectedCustomer.id}?companyId=${companyId}`, formData);
                toast({ title: 'Success', description: 'Customer updated successfully.' });
            } else {
                await api.post(`/crm/customers?companyId=${companyId}`, {
                    ...formData,
                    companyId: companyId!,
                    totalInvoices: 0,
                    outstandingBalance: 0,
                });
                toast({ title: 'Success', description: 'Customer added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: ['crm/customers', companyId] });
            setIsFormOpen(false);
            setSelectedCustomer(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save customer'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedCustomer) {
            try {
                await api.delete(`/crm/customers/${selectedCustomer.id}?companyId=${companyId}`);
                toast({ title: 'Success', description: 'Customer deleted successfully.' });
                queryClient.invalidateQueries({ queryKey: ['crm/customers', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedCustomer(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.response?.data?.message || 'Failed to delete customer'
                });
            }
        }
    };

    const openDeleteDialog = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsDeleteDialogOpen(true);
    };

    const handleExport = () => {
        toast({
            title: "Exporting Data",
            description: "Your customer data is being exported.",
        });
    }

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
    });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by name or CNIC..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto">
                                    <ListFilter className="mr-2 h-4 w-4" />
                                    Status
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {['active', 'inactive', 'blacklisted'].map((status) => (
                                    <DropdownMenuCheckboxItem
                                        key={status}
                                        className="capitalize"
                                        checked={statusFilters.includes(status)}
                                        onCheckedChange={(value) => {
                                            if (value) {
                                                setStatusFilters([...statusFilters, status]);
                                            } else {
                                                setStatusFilters(statusFilters.filter(s => s !== status));
                                            }
                                        }}
                                    >
                                        {status}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {/* <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button> */}
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => setSelectedCustomer(null)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Customer
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{selectedCustomer ? 'Edit' : 'Add'} Customer</DialogTitle>
                                </DialogHeader>
                                <CustomerForm
                                    customer={selectedCustomer}
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
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} customers
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
                itemName={selectedCustomer?.name}
            />
        </>
    )
}
