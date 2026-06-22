'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import type { OLT } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { oltSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { OLTForm } from './olt-form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type OLTFormValues = z.infer<typeof oltSchema>;

interface ClientPageProps {
    data: OLT[];
}

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [olts, setOlts] = useState<OLT[]>(data);
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedOlt, setSelectedOlt] = useState<OLT | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    useEffect(() => {
        setOlts(data);
    }, [data]);

    const filteredData = useMemo(() => olts.filter(olt =>
        olt.name.toLowerCase().includes(filter.toLowerCase()) ||
        olt.location.toLowerCase().includes(filter.toLowerCase()) ||
        olt.ipAddress.includes(filter)
    ), [olts, filter]);

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

    const handleSave = async (formData: OLTFormValues) => {
        try {
            if (selectedOlt) {
                await api.put(`/network/olts/${selectedOlt.id}?companyId=${companyId}`, formData);
                toast({ title: 'Success', description: 'OLT updated successfully.' });
            } else {
                await api.post(`/network/olts?companyId=${companyId}`, { ...formData, companyId });
                toast({ title: 'Success', description: 'OLT added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: ['network/olts', companyId] });
            setIsFormOpen(false);
            setSelectedOlt(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save OLT"
            });
        }
    };

    const handleEdit = (olt: OLT) => {
        setSelectedOlt(olt);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedOlt) {
            try {
                await api.delete(`/network/olts/${selectedOlt.id}?companyId=${companyId}`);
                toast({ title: 'Success', description: 'OLT deleted successfully.' });
                queryClient.invalidateQueries({ queryKey: ['network/olts', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedOlt(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete OLT"
                });
            }
        }
    };

    const openDeleteDialog = (olt: OLT) => {
        setSelectedOlt(olt);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
    });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by name, location, or IP..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedOlt(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add OLT
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedOlt ? 'Edit' : 'Add'} OLT</DialogTitle>
                            </DialogHeader>
                            <OLTForm
                                olt={selectedOlt}
                                onSave={handleSave}
                                onCancel={() => setIsFormOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                <DataTable columns={columns} data={getPaginatedData()} />
                
                {/* Advanced Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} OLTs
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
                itemName={selectedOlt?.name}
            />
        </>
    )
}
