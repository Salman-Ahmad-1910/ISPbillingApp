'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import type { Attendance, Staff } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { attendanceSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { AttendanceForm } from './attendance-form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

type AttendanceFormValues = z.infer<typeof attendanceSchema>;

interface ClientPageProps {
    data: Attendance[];
    staff: Staff[];
}

export function ClientPage({ data, staff }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const filteredData = useMemo(() => data.filter(item =>
        item.staffName.toLowerCase().includes(filter.toLowerCase()) ||
        item.date.includes(filter)
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

    const handleSave = async (formData: AttendanceFormValues) => {
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

            if (selectedAttendance) {
                await api.put(`/hr/attendance/${selectedAttendance.id}`, payload);
                toast({ title: "Success", description: "Attendance entry updated successfully." });
            } else {
                await api.post('/hr/attendance', payload);
                toast({ title: "Success", description: "Attendance entry added successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['hr/attendance', companyId] });
            setIsFormOpen(false);
            setSelectedAttendance(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || 'Failed to save attendance entry',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (entry: Attendance) => {
        setSelectedAttendance(entry);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedAttendance) {
            try {
                await api.delete(`/hr/attendance/${selectedAttendance.id}`);
                queryClient.invalidateQueries({ queryKey: ['hr/attendance', companyId] });
                toast({ title: "Success", description: "Attendance entry deleted successfully." });
                setIsDeleteDialogOpen(false);
                setSelectedAttendance(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || 'Failed to delete attendance entry',
                });
            }
        }
    };

    const openDeleteDialog = (entry: Attendance) => {
        setSelectedAttendance(entry);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({ onEdit: handleEdit, onDelete: openDeleteDialog });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by staff name or date..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedAttendance(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Attendance Entry
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedAttendance ? 'Edit' : 'Add'} Attendance Entry</DialogTitle>
                            </DialogHeader>
                            <AttendanceForm
                                attendance={selectedAttendance}
                                staff={staff}
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
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} attendance records
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
                itemName={`attendance for ${selectedAttendance?.staffName} on ${selectedAttendance?.date}`}
            />
        </>
    )
}
