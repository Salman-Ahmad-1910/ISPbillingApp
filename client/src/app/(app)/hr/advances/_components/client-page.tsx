'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Search, HandCoins } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import type { AdvanceLoan, Staff } from '@/lib/types';
import { advanceLoanSchema } from '@/lib/schemas';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { AdvanceLoanForm } from './advance-loan-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

type AdvanceLoanFormValues = z.infer<typeof advanceLoanSchema>;

interface ClientPageProps {
    data: AdvanceLoan[];
    staff: Staff[];
}

export function ClientPage({ data, staff }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStaffId, setFilterStaffId] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedAdvance, setSelectedAdvance] = useState<AdvanceLoan | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const filteredData = useMemo(() => {
        let result = data;

        if (filterStaffId !== 'all') {
            result = result.filter(item => item.staffId === filterStaffId);
        }

        if (filterCategory !== 'all') {
            result = result.filter(item => item.category === filterCategory);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.staffName.toLowerCase().includes(q) ||
                item.comments?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [data, filterStaffId, filterCategory, searchQuery]);

    // Summary calculations
    const totalIssue = useMemo(() =>
        filteredData
            .filter(item => item.direction === 'issue')
            .reduce((sum, item) => sum + item.amount, 0),
        [filteredData]
    );

    const totalReturn = useMemo(() =>
        filteredData
            .filter(item => item.direction === 'return')
            .reduce((sum, item) => sum + item.amount, 0),
        [filteredData]
    );

    const totalBalance = totalIssue - totalReturn;

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

    useEffect(() => {
        setCurrentPage(1);
    }, [filterStaffId, filterCategory, searchQuery, pageSize]);

    const handleSave = async (formData: AdvanceLoanFormValues) => {
        setIsSaving(true);
        try {
            const staffMember = staff.find(s => s.id === formData.staffId);
            if (!staffMember) {
                toast({ variant: 'destructive', title: "Error", description: "Selected staff member not found." });
                return;
            }

            const payload = {
                ...formData,
                companyId: companyId!,
                staffName: staffMember.name,
            };

            if (selectedAdvance) {
                await api.put(`/hr/advances/${selectedAdvance.id}`, payload);
                toast({ title: "Success", description: "Advance/Loan updated successfully." });
            } else {
                await api.post('/hr/advances', payload);
                toast({ title: "Success", description: "Advance/Loan added successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['hr/advances', companyId] });
            setIsFormOpen(false);
            setSelectedAdvance(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || 'Failed to save advance/loan',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (advance: AdvanceLoan) => {
        setSelectedAdvance(advance);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedAdvance) {
            try {
                await api.delete(`/hr/advances/${selectedAdvance.id}`);
                queryClient.invalidateQueries({ queryKey: ['hr/advances', companyId] });
                toast({ title: "Success", description: "Advance/Loan deleted successfully." });
                setIsDeleteDialogOpen(false);
                setSelectedAdvance(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || 'Failed to delete advance/loan',
                });
            }
        }
    };

    const openDeleteDialog = (advance: AdvanceLoan) => {
        setSelectedAdvance(advance);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({ onEdit: handleEdit, onDelete: openDeleteDialog });

    return (
        <>
            <div className="p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-blue-700">Total Issue</div>
                            <div className="text-2xl font-bold text-blue-900">
                                {new Intl.NumberFormat('en-US').format(totalIssue)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-green-700">Total Return</div>
                            <div className="text-2xl font-bold text-green-900">
                                {new Intl.NumberFormat('en-US').format(totalReturn)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-purple-700">Total Balance</div>
                            <div className="text-2xl font-bold text-purple-900">
                                {new Intl.NumberFormat('en-US').format(totalBalance)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                        <Label>Employee</Label>
                        <Select value={filterStaffId} onValueChange={setFilterStaffId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {staff.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="advance">Advance</SelectItem>
                                <SelectItem value="loan">Loan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="secondary" onClick={() => { setFilterStaffId('all'); setFilterCategory('all'); setSearchQuery(''); }}>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                    </Button>
                    <div className="flex-1" />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedAdvance(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Advance/Loan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                                        <HandCoins className="h-4 w-4" />
                                    </div>
                                    {selectedAdvance ? 'Edit' : 'Add'} Advance/Loan
                                </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] pr-4">
                                <AdvanceLoanForm
                                    advance={selectedAdvance}
                                    staff={staff}
                                    onSave={handleSave}
                                    onCancel={() => setIsFormOpen(false)}
                                    isSaving={isSaving}
                                />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Entries Selector and Search */}
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
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Search:</span>
                        <Input
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-[200px]"
                        />
                    </div>
                </div>

                {/* Table */}
                <DataTable columns={columns} data={getPaginatedData()} />

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>

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
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <DeleteAlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onDelete={handleDelete}
                itemName={`advance for ${selectedAdvance?.staffName}`}
            />
        </>
    )
}
