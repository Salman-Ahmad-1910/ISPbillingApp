'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, ChevronLeft, ChevronRight, Building, Globe, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';

import type { CorporateCustomer } from '@/lib/types';
import { corporateCustomerSchema } from '@/lib/schemas';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { CorporateCustomerForm } from './corporate-customer-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';


import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';


type CorporateCustomerFormValues = z.infer<typeof corporateCustomerSchema>;

interface ClientPageProps {
    data: CorporateCustomer[];
}

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [customers, setCustomers] = useState<CorporateCustomer[]>(data);
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CorporateCustomer | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    useEffect(() => {
        setCustomers(data);
    }, [data]);

    const totalConnections = useMemo(() => customers.reduce((sum, c) => sum + c.totalConnections, 0), [customers]);

    const filteredData = useMemo(() => customers.filter(customer =>
        (customer.companyName?.toLowerCase() || '').includes(filter.toLowerCase()) ||
        (customer.contactPerson?.toLowerCase() || '').includes(filter.toLowerCase())
    ), [customers, filter]);

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

    const handleSave = async (formData: CorporateCustomerFormValues) => {
        setIsSaving(true);
        try {
            if (selectedCustomer) {
                await api.put(`/subscribers/corporate/${selectedCustomer.id}?companyId=${companyId}`, formData);
                toast({ title: "Success", description: "Corporate client updated successfully." });
            } else {
                await api.post(`/subscribers/corporate?companyId=${companyId}`, { ...formData, companyId });
                toast({ title: "Success", description: "Corporate client added successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['subscribers/corporate', companyId] });
            setIsFormOpen(false);
            setSelectedCustomer(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save corporate client"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (customer: CorporateCustomer) => {
        setSelectedCustomer(customer);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedCustomer) {
            try {
                await api.delete(`/subscribers/corporate/${selectedCustomer.id}?companyId=${companyId}`);
                toast({ title: "Success", description: "Corporate client deleted successfully." });
                queryClient.invalidateQueries({ queryKey: ['subscribers/corporate', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedCustomer(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete corporate client"
                });
            }
        }
    };

    const openDeleteDialog = (customer: CorporateCustomer) => {
        setSelectedCustomer(customer);
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
                            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <Building className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Total Clients</p>
                                <p className="text-2xl font-bold">{customers.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Total Connections</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalConnections}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Active Contracts</p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{customers.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by company or contact name..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="max-w-sm pl-8"
                        />
                    </div>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedCustomer(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Corporate Client
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1 text-white">
                                        <Building className="h-4 w-4" />
                                    </div>
                                    {selectedCustomer ? 'Edit' : 'Add'} Corporate Client
                                </DialogTitle>
                            </DialogHeader>
                            <CorporateCustomerForm
                                customer={selectedCustomer}
                                onSave={handleSave}
                                onCancel={() => setIsFormOpen(false)}
                                isSaving={isSaving}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                <DataTable columns={columns} data={getPaginatedData()} />
                
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} corporate clients
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
                itemName={selectedCustomer?.companyName}
            />
        </>
    )
}
