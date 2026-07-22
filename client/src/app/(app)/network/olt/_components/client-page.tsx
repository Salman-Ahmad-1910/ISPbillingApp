'use client'

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, ChevronLeft, ChevronRight, ArrowRight, Server, Globe, Layers } from 'lucide-react';
import type { OLT, POP } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
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

    const { data: pops = [] } = useGenericQuery<POP[]>('network/pops', companyId ?? undefined);

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

    // Stats
    const totalPorts = olts.reduce((sum, o) => sum + o.ports, 0);

    return (
        <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 p-6 pb-0 sm:grid-cols-3">
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Server className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Total OLTs</p>
                            <p className="text-2xl font-bold">{olts.length}</p>
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Ports</p>
                            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{totalPorts}</p>
                        </div>
                    </div>
                </div>
                <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <Globe className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Locations</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{new Set(olts.map(o => o.location)).size}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by name, location, or IP..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="max-w-sm pl-8"
                        />
                    </div>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => setSelectedOlt(null)}
                                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105"
                            >
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
                                pops={pops}
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
                itemName={selectedOlt?.name}
            />
        </>
    )
}
