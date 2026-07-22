'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, ChevronLeft, ChevronRight, ArrowRight, SplitSquareHorizontal, MapPin, Plug, RadioTower } from 'lucide-react';
import type { Splitter } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { splitterSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { SplitterForm } from './splitter-form';
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

type SplitterFormValues = z.infer<typeof splitterSchema>;

interface ClientPageProps {
    data: Splitter[];
}

export function ClientPage({ data }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [splitters, setSplitters] = useState<Splitter[]>(data);
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSplitter, setSelectedSplitter] = useState<Splitter | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    useEffect(() => {
        setSplitters(data);
    }, [data]);

    const filteredData = useMemo(() => splitters.filter(splitter =>
        splitter.name.toLowerCase().includes(filter.toLowerCase()) ||
        splitter.location.toLowerCase().includes(filter.toLowerCase())
    ), [splitters, filter]);

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

    const handleSave = async (formData: SplitterFormValues) => {
        try {
            if (selectedSplitter) {
                await api.put(`/network/splitters/${selectedSplitter.id}?companyId=${companyId}`, formData);
                toast({ title: 'Success', description: 'Splitter updated successfully.' });
            } else {
                await api.post(`/network/splitters?companyId=${companyId}`, { ...formData, companyId });
                toast({ title: 'Success', description: 'Splitter added successfully.' });
            }
            queryClient.invalidateQueries({ queryKey: ['network/splitters', companyId] });
            setIsFormOpen(false);
            setSelectedSplitter(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save splitter"
            });
        }
    };

    const handleEdit = (splitter: Splitter) => {
        setSelectedSplitter(splitter);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedSplitter) {
            try {
                await api.delete(`/network/splitters/${selectedSplitter.id}?companyId=${companyId}`);
                toast({ title: 'Success', description: 'Splitter deleted successfully.' });
                queryClient.invalidateQueries({ queryKey: ['network/splitters', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedSplitter(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete splitter"
                });
            }
        }
    };

    const openDeleteDialog = (splitter: Splitter) => {
        setSelectedSplitter(splitter);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
    });

    // Stats
    const totalPorts = splitters.reduce((sum, s) => sum + s.totalPorts, 0);
    const availablePorts = splitters.reduce((sum, s) => sum + s.availablePorts, 0);
    const usedPorts = totalPorts - availablePorts;

    return (
        <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 p-6 pb-0 sm:grid-cols-4">
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <SplitSquareHorizontal className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Splitters</p>
                            <p className="text-2xl font-bold">{splitters.length}</p>
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Plug className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Ports</p>
                            <p className="text-2xl font-bold">{totalPorts}</p>
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <RadioTower className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Available</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{availablePorts}</p>
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Plug className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Used</p>
                            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{usedPorts}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by name or location..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="max-w-sm pl-8"
                        />
                    </div>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => setSelectedSplitter(null)}
                                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Splitter
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedSplitter ? 'Edit' : 'Add'} Splitter</DialogTitle>
                            </DialogHeader>
                            <SplitterForm
                                splitter={selectedSplitter}
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
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} splitters
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
                            className="transition-all duration-300 hover:scale-105"
                        >
                            <ChevronLeft className="h-4 w-4" />
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
                                    className="w-8 h-8 p-0 transition-all duration-300 hover:scale-110"
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
                                        className="w-8 h-8 p-0 transition-all duration-300 hover:scale-110"
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
                                className="h-8 px-2 transition-all duration-300 hover:scale-105"
                            >
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="transition-all duration-300 hover:scale-105"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            <DeleteAlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onDelete={handleDelete}
                itemName={selectedSplitter?.name}
            />
        </>
    )
}
