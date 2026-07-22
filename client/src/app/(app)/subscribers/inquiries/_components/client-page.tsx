'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import type { Inquiry } from '@/lib/types';
import { inquirySchema } from '@/lib/schemas';
import { z } from 'zod';
import { PlusCircle, Send, Users, Search, ChevronLeft, ChevronRight, UserPlus, UserCheck, XCircle, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { InquiryForm } from './inquiry-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type InquiryFormValues = z.infer<typeof inquirySchema>;

interface ClientPageProps {
    data: Inquiry[];
    areas: any[];
    boxes: any[];
    packages: any[];
}

export function ClientPage({ data, areas, boxes, packages }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [inquiries, setInquiries] = useState<Inquiry[]>(data);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSublocality, setFilterSublocality] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const sublocalities = useMemo(() =>
        Array.from(new Set(areas.map((a: any) => a.subLocality).filter(Boolean))) as string[],
        [areas]
    );

    useEffect(() => {
        setInquiries(data);
    }, [data]);

    const newInquiries = useMemo(() => inquiries.filter(i => i.status === 'new'), [inquiries]);
    const followUpInquiries = useMemo(() => inquiries.filter(i => i.status === 'follow-up'), [inquiries]);
    const convertedInquiries = useMemo(() => inquiries.filter(i => i.status === 'converted'), [inquiries]);
    const closedInquiries = useMemo(() => inquiries.filter(i => i.status === 'closed'), [inquiries]);

    const filteredData = useMemo(() => {
        let result = inquiries;

        if (filterSublocality !== 'all') {
            result = result.filter(i => i.subLocality === filterSublocality);
        }
        if (filterType !== 'all') {
            result = result.filter(i => i.connectionType === filterType);
        }
        if (filterMonth !== 'all') {
            result = result.filter(i => {
                const d = i.installationDate || i.createdAt;
                if (!d) return false;
                const m = new Date(d).getMonth().toString();
                return m === filterMonth;
            });
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(q) ||
                i.cell?.includes(q) ||
                i.mobile?.includes(q) ||
                i.address.toLowerCase().includes(q) ||
                i.internetId?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [inquiries, filterSublocality, filterType, filterMonth, searchQuery]);

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
    }, [filterSublocality, filterType, filterMonth, searchQuery, pageSize]);

    const handleSave = async (formData: InquiryFormValues) => {
        setIsSaving(true);
        try {
            if (selectedInquiry) {
                await api.put(`/subscribers/inquiries/${selectedInquiry.id}?companyId=${companyId}`, formData);
                toast({ title: "Success", description: "Inquiry updated successfully." });
            } else {
                await api.post(`/subscribers/inquiries?companyId=${companyId}`, { ...formData, companyId });
                toast({ title: "Success", description: "Inquiry added successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['subscribers/inquiries', companyId] });
            setIsFormOpen(false);
            setSelectedInquiry(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save inquiry"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (inquiry: Inquiry) => {
        setSelectedInquiry(inquiry);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedInquiry) {
            try {
                await api.delete(`/subscribers/inquiries/${selectedInquiry.id}?companyId=${companyId}`);
                toast({ title: "Success", description: "Inquiry deleted successfully." });
                queryClient.invalidateQueries({ queryKey: ['subscribers/inquiries', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedInquiry(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete inquiry"
                });
            }
        }
    };

    const openDeleteDialog = (inquiry: Inquiry) => {
        setSelectedInquiry(inquiry);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
    });

    const months = [
        { value: 'all', label: 'All Months' },
        { value: '0', label: 'January' },
        { value: '1', label: 'February' },
        { value: '2', label: 'March' },
        { value: '3', label: 'April' },
        { value: '4', label: 'May' },
        { value: '5', label: 'June' },
        { value: '6', label: 'July' },
        { value: '7', label: 'August' },
        { value: '8', label: 'September' },
        { value: '9', label: 'October' },
        { value: '10', label: 'November' },
        { value: '11', label: 'December' },
    ];

    return (
        <>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-violet-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">{inquiries.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">New</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{newInquiries.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <RefreshCw className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Follow-up</p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{followUpInquiries.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Converted</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{convertedInquiries.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                                <XCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Closed</p>
                                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{closedInquiries.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                        <Label>Sublocality</Label>
                        <Select value={filterSublocality} onValueChange={setFilterSublocality}>
                            <SelectTrigger className="w-[180px] border-muted-foreground/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sublocalities</SelectItem>
                                {sublocalities.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Select Type</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[150px] border-muted-foreground/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                                <SelectItem value="internet">Internet</SelectItem>
                                <SelectItem value="tv_cable">TV Cable</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Month</Label>
                        <Select value={filterMonth} onValueChange={setFilterMonth}>
                            <SelectTrigger className="w-[150px] border-muted-foreground/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="default">
                            <Send className="mr-2 h-4 w-4" />
                            Pending Referrals
                        </Button>
                        <Button variant="secondary" size="default">
                            <Users className="mr-2 h-4 w-4" />
                            Send Promotions
                        </Button>
                    </div>
                    <div className="flex-1" />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedInquiry(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Inquiry
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="rounded-md bg-gradient-to-br from-emerald-500 to-violet-600 p-1 text-white">
                                        <UserPlus className="h-4 w-4" />
                                    </div>
                                    {selectedInquiry ? 'Edit' : 'Add'} Inquiry
                                </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="pr-4 max-h-[75vh]">
                                <InquiryForm
                                    inquiry={selectedInquiry}
                                    areas={areas}
                                    boxes={boxes}
                                    packages={packages}
                                    onSave={handleSave}
                                    onCancel={() => setIsFormOpen(false)}
                                    isSaving={isSaving}
                                />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Show</span>
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
                        <span className="text-sm text-muted-foreground">entries</span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search inquiries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-[200px] pl-8"
                        />
                    </div>
                </div>

                <DataTable columns={columns} data={getPaginatedData()} />

                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} inquiries
                        </div>
                        <div className="flex items-center gap-2">
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
                )}
            </div>

            <DeleteAlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onDelete={handleDelete}
                itemName={selectedInquiry?.name}
            />
        </>
    )
}
