'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, MapPin, Building2, Layers, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Area } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { areaSchema } from '@/lib/schemas';
import {
  Card, CardContent,
} from '@/components/ui/card';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { AreaForm } from './area-form';
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

type AreaFormValues = z.infer<typeof areaSchema>;

interface ClientPageProps {
  data: Area[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [areas, setAreas] = useState<Area[]>(data);
  const [filter, setFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Advanced pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageInput, setPageInput] = useState<string>('');

  useEffect(() => {
    setAreas(data);
  }, [data]);

  const filteredData = useMemo(() => areas.filter(
    (area) =>
      area.city.toLowerCase().includes(filter.toLowerCase()) ||
      area.zone.toLowerCase().includes(filter.toLowerCase()) ||
      area.locality.toLowerCase().includes(filter.toLowerCase())
  ), [areas, filter]);

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

  const handleSave = async (formData: AreaFormValues) => {
    try {
      if (selectedArea) {
        await api.put(`/network/areas/${selectedArea.id}?companyId=${companyId}`, formData);
        toast({ title: "Success", description: "Area updated successfully." });
      } else {
        await api.post(`/network/areas?companyId=${companyId}`, { ...formData, companyId });
        toast({ title: "Success", description: "Area added successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ['network/areas', companyId] });
      setIsFormOpen(false);
      setSelectedArea(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: error.response?.data?.message || "Failed to save area"
      });
    }
  };

  const handleEdit = (area: Area) => {
    setSelectedArea(area);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedArea) {
      try {
        await api.delete(`/network/areas/${selectedArea.id}?companyId=${companyId}`);
        toast({ title: "Success", description: "Area deleted successfully." });
        queryClient.invalidateQueries({ queryKey: ['network/areas', companyId] });
        setIsDeleteDialogOpen(false);
        setSelectedArea(null);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: "Error",
          description: error.response?.data?.message || "Failed to delete area"
        });
      }
    }
  };

  const openDeleteDialog = (area: Area) => {
    setSelectedArea(area);
    setIsDeleteDialogOpen(true);
  };

  const uniqueCities = useMemo(() => new Set(areas.map(a => a.city)).size, [areas]);
  const uniqueZones = useMemo(() => new Set(areas.map(a => a.zone)).size, [areas]);

  const columns = getColumns({
    onEdit: handleEdit,
    onDelete: openDeleteDialog,
  });

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-emerald-500 to-green-600" />
            <CardContent className="p-4 flex items-center gap-4 relative">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Areas</p>
                <p className="text-2xl font-bold tracking-tight">{areas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-blue-500 to-cyan-500" />
            <CardContent className="p-4 flex items-center gap-4 relative">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cities</p>
                <p className="text-2xl font-bold tracking-tight">{uniqueCities}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-amber-500 to-orange-600" />
            <CardContent className="p-4 flex items-center gap-4 relative">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zones</p>
                <p className="text-2xl font-bold tracking-tight">{uniqueZones}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by city, zone, or locality..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setSelectedArea(null)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Area
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="rounded-md bg-gradient-to-br from-emerald-500 to-green-600 p-1 text-white">
                    <MapPin className="h-4 w-4" />
                  </div>
                  {selectedArea ? 'Edit' : 'Add'} Area
                </DialogTitle>
              </DialogHeader>
              <AreaForm
                area={selectedArea}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="transition-all duration-300 hover:shadow-md rounded-lg overflow-hidden">
          <DataTable columns={columns} data={getPaginatedData()} />
        </div>
        
        {/* Advanced Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{((currentPage - 1) * pageSize) + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, filteredData.length)}</span> of <span className="font-medium text-foreground">{filteredData.length}</span> areas
          </div>
          <div className="flex items-center gap-2">
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-20 h-8 text-xs">
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
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
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
                  className="w-8 h-8 p-0 transition-all duration-150"
                >
                  {page}
                </Button>
              ))}
              
              {/* Show ellipsis if there are more pages */}
              {currentPage + 3 < totalPages && (
                <>
                  <span className="px-1 text-muted-foreground">...</span>
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
                className="w-16 h-8 text-center text-xs"
                min={1}
                max={totalPages}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePageSubmit}
                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                className="h-8 px-2 text-xs"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={`${selectedArea?.locality}, ${selectedArea?.city}`}
      />
    </>
  );
}
