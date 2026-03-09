'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Download, ListFilter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import type { Subscriber, Package, Area, Splitter } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { subscriberSchema } from '@/lib/schemas';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';


import { DataTable } from './data-table';
import { getColumns } from './columns';
import { SubscriberForm } from './subscriber-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type SubscriberFormValues = z.infer<typeof subscriberSchema>;

interface ClientPageProps {
    data: Subscriber[];
}

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: areas = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
    const { data: packages = [] } = useGenericQuery<Package>('billing/packages', companyId ?? undefined);
    const { data: splitters = [] } = useGenericQuery<Splitter>('network/splitters', companyId ?? undefined);

    const [subscribers, setSubscribers] = useState<Subscriber[]>(data);
    const [filter, setFilter] = useState('');
    const [statusFilters, setStatusFilters] = useState<string[]>([]);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    useEffect(() => {
        setSubscribers(data);
    }, [data]);

    const filteredData = useMemo(() => subscribers
        .filter(subscriber =>
            (subscriber.name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
            subscriber.cnic.includes(filter) ||
            subscriber.phone.includes(filter)
        )
        .filter(subscriber => statusFilters.length === 0 || statusFilters.includes(subscriber.status)),
        [subscribers, filter, statusFilters]);

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

    const handleSave = async (formData: SubscriberFormValues) => {
        setIsSaving(true);
        try {
            if (selectedSubscriber) {
                await api.put(`/subscribers/${selectedSubscriber.id}?companyId=${companyId}`, formData);
                toast({ title: 'Success', description: 'Subscriber updated successfully.' });
            } else {
                await api.post(`/subscribers?companyId=${companyId}`, { ...formData, companyId });
                toast({ title: 'Success', description: 'Subscriber added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: ['subscribers', companyId] });
            setIsFormOpen(false);
            setSelectedSubscriber(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save subscriber"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (subscriber: Subscriber) => {
        setSelectedSubscriber(subscriber);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedSubscriber) {
            try {
                await api.delete(`/subscribers/${selectedSubscriber.id}?companyId=${companyId}`);
                toast({ title: 'Success', description: 'Subscriber deleted successfully.' });
                queryClient.invalidateQueries({ queryKey: ['subscribers', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedSubscriber(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete subscriber"
                });
            }
        }
    };

    const openDeleteDialog = (subscriber: Subscriber) => {
        setSelectedSubscriber(subscriber);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
    });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4 gap-2">
                    <Input
                        placeholder="Filter by name, CNIC, or phone..."
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
                                {['active', 'suspended', 'inactive', 'deactivated'].map((status) => (
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
                        {/* <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button> */}
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => setSelectedSubscriber(null)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Subscriber
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[725px]">
                                <DialogHeader>
                                    <DialogTitle>{selectedSubscriber ? 'Edit' : 'Add'} Subscriber</DialogTitle>
                                </DialogHeader>
                                <SubscriberForm
                                    subscriber={selectedSubscriber}
                                    onSave={handleSave}
                                    onCancel={() => setIsFormOpen(false)}
                                    isSaving={isSaving}
                                    packages={packages}
                                    areas={areas}
                                    splitters={splitters}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <DataTable columns={columns} data={getPaginatedData()} />

                {/* Advanced Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} subscribers
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
                itemName={selectedSubscriber?.name}
            />
        </>
    )
}
