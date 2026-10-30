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
import { smartMatch } from '@/lib/search';
import { z } from 'zod';
import { PlusCircle, Send, Users, Search, ChevronLeft, ChevronRight, UserPlus, UserCheck, XCircle, Sparkles, RefreshCw, CheckCircle2, Calendar } from 'lucide-react';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { InquiryForm } from './inquiry-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { useCrudPermissions, usePagePermissions } from '@/hooks/usePermissions';
import { INQUIRIES_PERMISSION } from '@/lib/permission-pages';

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
    const { canCreate, canUpdate, canDelete } = useCrudPermissions(INQUIRIES_PERMISSION);
    const { can } = usePagePermissions(INQUIRIES_PERMISSION);
    const canViewSummary = can('summary');
    const [inquiries, setInquiries] = useState<Inquiry[]>(data);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSublocality, setFilterSublocality] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFeasibleDialogOpen, setIsFeasibleDialogOpen] = useState(false);
    const [feasibleInquiry, setFeasibleInquiry] = useState<Inquiry | null>(null);
    const [feasibleInternetId, setFeasibleInternetId] = useState('');

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
            result = result.filter(i =>
                smartMatch(searchQuery, [i.cell, i.mobile, i.internetId], [i.name, i.address])
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
                toast({ title: "Success", description: "Request updated successfully." });
            } else {
                const response = await api.post(`/subscribers/inquiries?companyId=${companyId}`, { ...formData, companyId });
                const created = response.data?.data;
                if (created) {
                    queryClient.setQueryData<Inquiry[]>(['subscribers/inquiries', companyId], (old = []) => [created, ...old]);
                }
                toast({ title: "Success", description: "Request added successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['subscribers/inquiries', companyId] });
            setIsFormOpen(false);
            setSelectedInquiry(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save request"
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
                toast({ title: "Success", description: "Request deleted successfully." });
                queryClient.invalidateQueries({ queryKey: ['subscribers/inquiries', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedInquiry(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete request"
                });
            }
        }
    };

    const openDeleteDialog = (inquiry: Inquiry) => {
        setSelectedInquiry(inquiry);
        setIsDeleteDialogOpen(true);
    };

    const handleFeasible = (inquiry: Inquiry) => {
        setFeasibleInquiry(inquiry);
        setFeasibleInternetId(inquiry.internetId || '');
        setIsFeasibleDialogOpen(true);
    };

    const handleFeasibleSubmit = async () => {
        if (!feasibleInquiry) return;
        const internetId = feasibleInternetId.trim();
        if (!internetId) return;
        setIsSaving(true);
        try {
            // The inquiry sublocality stores the area name, while subscribers
            // store the area UUID, so resolve it before creating the subscriber.
            const normalize = (value: any) => String(value ?? '').trim().toLowerCase();
            const wanted = normalize(feasibleInquiry.subLocality);
            const area = areas.find((a: any) =>
                [a.id, a.subLocality, a.locality].some((value) => normalize(value) === wanted)
            );

            let alreadyExists = false;
            try {
                await api.post(`/admin/connections?companyId=${companyId}`, {
                    companyId,
                    internetId,
                    name: feasibleInquiry.name,
                    address: feasibleInquiry.address || '',
                    cell: feasibleInquiry.cell || '',
                    mobile: feasibleInquiry.mobile || '',
                    installationAmount: feasibleInquiry.installationAmount || 0,
                    otherAmount: feasibleInquiry.otherAmount || 0,
                    installationDate: feasibleInquiry.installationDate || '',
                    rechargeDate: feasibleInquiry.rechargeDate || '',
                    connectionType: feasibleInquiry.connectionType || 'both',
                    boxNumber: feasibleInquiry.boxNumber || '',
                    packageCable: feasibleInquiry.packageCable || '',
                    discount: feasibleInquiry.discount ? String(feasibleInquiry.discount) : '',
                    amount: feasibleInquiry.amount || 0,
                    sublocalityId: area?.id || '',
                    status: 'active',
                    comments: feasibleInquiry.comments || '',
                });
            } catch (connectionError: any) {
                // 409 means the subscriber already exists; still mark the
                // request converted instead of failing the whole action.
                if (connectionError.response?.status !== 409) {
                    throw connectionError;
                }
                alreadyExists = true;
            }

            await api.put(`/subscribers/inquiries/${feasibleInquiry.id}?companyId=${companyId}`, {
                ...feasibleInquiry,
                internetId,
                status: 'converted',
            });

            queryClient.invalidateQueries({ queryKey: ['admin/connections', companyId] });
            queryClient.invalidateQueries({ queryKey: ['subscribers/inquiries', companyId] });
            toast({
                title: "Success",
                description: alreadyExists
                    ? "Request marked as feasible. A subscriber with this Internet ID already exists in Subscriber Detail."
                    : "Request marked as feasible and added to Subscriber Detail.",
            });
            setIsFeasibleDialogOpen(false);
            setFeasibleInquiry(null);
            setFeasibleInternetId('');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to mark as feasible"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
        onFeasible: handleFeasible,
        canUpdate,
        canDelete,
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
                {canViewSummary && (
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
                )}

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
                    {canCreate && (
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedInquiry(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Request
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="rounded-md bg-gradient-to-br from-emerald-500 to-violet-600 p-1 text-white">
                                        <UserPlus className="h-4 w-4" />
                                    </div>
                                    {selectedInquiry ? 'Edit' : 'Add'} Request
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
                    )}
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
                            placeholder="Search requests..."
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
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} requests
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

            <Dialog open={isFeasibleDialogOpen} onOpenChange={setIsFeasibleDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="rounded-md bg-gradient-to-br from-emerald-500 to-green-600 p-1 text-white">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                            Feasibility - Request Details
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="pr-4 max-h-[75vh]">
                        {feasibleInquiry && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Name</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.name}</div>
                                    </div>
                                    <div>
                                        <Label>Internet ID</Label>
                                        <Input
                                            value={feasibleInternetId}
                                            onChange={(e) => setFeasibleInternetId(e.target.value)}
                                            placeholder="Enter Internet ID"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>Cell</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.cell || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>Mobile</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.mobile || '-'}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Address</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.address}</div>
                                    </div>
                                    <div>
                                        <Label>Connection Type</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.connectionType || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>Sublocality</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.subLocality || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>Package Cable</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.packageCable || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>Box Number</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.boxNumber || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>Installation Date</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.installationDate || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>Recharge Date</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.rechargeDate || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>Installation Amount</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.installationAmount || 0}</div>
                                    </div>
                                    <div>
                                        <Label>Amount</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.amount || 0}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Comments</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.comments || '-'}</div>
                                    </div>
                                    <div>
                                        <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Entry Created Date</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{feasibleInquiry.createdAt ? new Date(feasibleInquiry.createdAt).toLocaleString() : '-'}</div>
                                    </div>
                                    <div>
                                        <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Feasibility Date</Label>
                                        <div className="text-sm mt-1 p-2 bg-muted rounded">{new Date().toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setIsFeasibleDialogOpen(false)} disabled={isSaving}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleFeasibleSubmit} disabled={isSaving || !feasibleInternetId} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700">
                                        {isSaving ? 'Saving...' : 'Mark as Feasible & Add to Subscriber'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}
