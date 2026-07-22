'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import type { DistributionBox } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { distributionBoxSchema } from '@/lib/schemas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { BoxForm } from './box-form';
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

type BoxFormValues = z.infer<typeof distributionBoxSchema>;

interface ClientPageProps {
  data: DistributionBox[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [boxes, setBoxes] = useState<DistributionBox[]>(data);
  const [filter, setFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<DistributionBox | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setBoxes(data);
  }, [data]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const filteredData = useMemo(() => boxes.filter(
    (box) => box.name.toLowerCase().includes(filter.toLowerCase())
  ), [boxes, filter]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSave = async (formData: BoxFormValues) => {
    try {
      if (selectedBox) {
        await api.put(`/network/boxes/${selectedBox.id}?companyId=${companyId}`, formData);
        toast({ title: "Success", description: "Box/Media updated successfully." });
      } else {
        await api.post(`/network/boxes?companyId=${companyId}`, { ...formData, companyId });
        toast({ title: "Success", description: "Box/Media added successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ['network/boxes', companyId] });
      setIsFormOpen(false);
      setSelectedBox(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: error.response?.data?.message || "Failed to save box/media"
      });
    }
  };

  const handleEdit = (box: DistributionBox) => {
    setSelectedBox(box);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedBox) {
      try {
        await api.delete(`/network/boxes/${selectedBox.id}?companyId=${companyId}`);
        toast({ title: "Success", description: "Box/Media deleted successfully." });
        queryClient.invalidateQueries({ queryKey: ['network/boxes', companyId] });
        setIsDeleteDialogOpen(false);
        setSelectedBox(null);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: "Error",
          description: error.response?.data?.message || "Failed to delete box/media"
        });
      }
    }
  };

  const openDeleteDialog = (box: DistributionBox) => {
    setSelectedBox(box);
    setIsDeleteDialogOpen(true);
  };

  const columns = getColumns({
    onEdit: handleEdit,
    onDelete: openDeleteDialog,
  });

  return (
    <>
      {/* Stat Card */}
      <div className="p-6 pb-0">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:w-1/3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Boxes / Media</p>
              <p className="text-2xl font-bold">{boxes.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by box number..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm pl-8"
            />
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setSelectedBox(null)}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Box Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedBox ? 'Edit' : 'Add'} Box / Media Number</DialogTitle>
              </DialogHeader>
              <BoxForm
                box={selectedBox}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={paginatedData} />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show entries</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="transition-all duration-300 hover:scale-105"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="transition-all duration-300 hover:scale-105"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={selectedBox?.name || ''}
      />
    </>
  );
}
