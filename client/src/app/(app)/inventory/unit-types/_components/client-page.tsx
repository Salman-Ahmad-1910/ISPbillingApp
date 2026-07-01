'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import type { UnitType } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

import { z } from 'zod';
import { unitTypeSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { UnitTypeForm } from './unit-type-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

type UnitTypeFormValues = z.infer<typeof unitTypeSchema>;

interface ClientPageProps {
  data: UnitType[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredUnitTypes = useMemo(() => {
    if (!searchTerm) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(unitType =>
      unitType.name.toLowerCase().includes(lowerSearch)
    );
  }, [data, searchTerm]);

  const unitTypeMutation = useMutation({
    mutationFn: async (values: UnitTypeFormValues) => {
      if (selectedUnitType) {
        const response = await api.put(`/inventory/unit-types/${selectedUnitType.id}`, values);
        return response.data;
      } else {
        const response = await api.post('/inventory/unit-types', values);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/unit-types', companyId] });
      setIsFormOpen(false);
      setSelectedUnitType(null);
      toast({
        title: "Success",
        description: selectedUnitType ? "Unit type updated successfully" : "Unit type created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save unit type",
        variant: "destructive",
      });
    },
  });

  const deleteUnitTypeMutation = useMutation({
    mutationFn: async (unitTypeId: string) => {
      await api.delete(`/inventory/unit-types/${unitTypeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory/unit-types', companyId] });
      setIsDeleteDialogOpen(false);
      setSelectedUnitType(null);
      toast({
        title: "Success",
        description: "Unit type deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete unit type",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (values: UnitTypeFormValues) => {
    setIsSaving(true);
    try {
      await unitTypeMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (unitType: UnitType) => {
    setSelectedUnitType(unitType);
    setIsFormOpen(true);
  };

  const handleDelete = (unitType: UnitType) => {
    setSelectedUnitType(unitType);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedUnitType) {
      await deleteUnitTypeMutation.mutateAsync(selectedUnitType.id);
    }
  };

  const handleAddNew = () => {
    setSelectedUnitType(null);
    setIsFormOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search unit types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Unit Type
        </Button>
      </div>

      <DataTable columns={columns} data={filteredUnitTypes} />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUnitType ? 'Edit Unit Type' : 'Add New Unit Type'}
            </DialogTitle>
          </DialogHeader>
          <UnitTypeForm
            unitType={selectedUnitType}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={confirmDelete}
        itemName={selectedUnitType?.name}
      />
    </div>
  );
}
