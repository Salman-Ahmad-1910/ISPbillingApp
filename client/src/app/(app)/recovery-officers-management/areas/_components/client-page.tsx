'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPinned, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import type { Area, RecoveryOfficer } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { AreaForm } from './area-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface ClientPageProps {
  data: Area[];
  recoveryOfficers: RecoveryOfficer[];
}

export function ClientPage({ data, recoveryOfficers }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Transfer state
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [leftSelected, setLeftSelected] = useState<string[]>([]);
  const [rightSelected, setRightSelected] = useState<string[]>([]);

  const selectedOfficer = recoveryOfficers.find(o => o.id === selectedOfficerId);

  // Areas not assigned to any officer (fully available)
  const leftAreas = useMemo(() =>
    data.filter(a => !a.recoveryOfficerId),
    [data]
  );

  // Areas assigned to the selected officer
  const rightAreas = useMemo(() =>
    data.filter(a => a.recoveryOfficerId === selectedOfficerId),
    [data, selectedOfficerId]
  );

  const handleSave = async (formData: any) => {
    if (!selectedArea) return;
    setIsSaving(true);
    try {
      await api.put(`/network/areas/${selectedArea.id}`, { ...formData, id: selectedArea.id, companyId: companyId! });
      toast({ title: 'Success', description: 'Area updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['network/areas', companyId, undefined] });
      setIsFormOpen(false);
      setSelectedArea(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to save area' });
    } finally { setIsSaving(false); }
  };

  const handleEdit = (area: Area) => {
    setSelectedArea(area);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedArea) {
      try {
        await api.delete(`/network/areas/${selectedArea.id}`);
        queryClient.invalidateQueries({ queryKey: ['network/areas', companyId] });
        toast({ title: 'Success', description: 'Area deleted successfully.' });
        setIsDeleteDialogOpen(false);
        setSelectedArea(null);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete area' });
      }
    }
  };

  const openDeleteDialog = (area: Area) => {
    setSelectedArea(area);
    setIsDeleteDialogOpen(true);
  };

  const columns = getColumns({
    recoveryOfficers,
    onEdit: handleEdit,
    onDelete: openDeleteDialog,
  });

  const moveAreas = async (areaIds: string[], targetOfficerId: string | null) => {
    if (areaIds.length === 0) return;
    setIsSaving(true);
    let count = 0;
    try {
      for (const areaId of areaIds) {
        const area = data.find(a => a.id === areaId)!;
        await api.put(`/network/areas/${areaId}`, {
          id: areaId,
          city: area.city,
          zone: area.zone,
          locality: area.locality,
          subLocality: area.subLocality || '',
          recoveryOfficerId: targetOfficerId,
          companyId: companyId,
        });
        count++;
      }
      queryClient.invalidateQueries({ queryKey: ['network/areas', companyId, undefined] });
      toast({ title: 'Success', description: `${count} area(s) updated.` });
      setLeftSelected([]);
      setRightSelected([]);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed after ${count} area(s): ${error.response?.data?.message || error.message}`,
      });
      console.error('PUT area error', error.response?.data, error);
    } finally { setIsSaving(false); }
  };

  const moveSingleToRight = () => {
    if (leftSelected.length === 0 || !selectedOfficerId) return;
    moveAreas(leftSelected, selectedOfficerId);
  };

  const moveAllToRight = () => {
    if (!selectedOfficerId) return;
    moveAreas(leftAreas.map(a => a.id), selectedOfficerId);
  };

  const moveSingleToLeft = () => {
    if (rightSelected.length === 0) return;
    moveAreas(rightSelected, null);
  };

  const moveAllToLeft = () => {
    moveAreas(rightAreas.map(a => a.id), null);
  };

  const toggleLeft = (id: string) => {
    setLeftSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleRight = (id: string) => {
    setRightSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Transfer Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MapPinned className="h-4 w-4 text-emerald-600" />
            Assign Areas to Recovery Officer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-xs">
            <Label className="text-xs text-muted-foreground">Select Recovery Officer</Label>
            <Select value={selectedOfficerId} onValueChange={setSelectedOfficerId}>
              <SelectTrigger className="w-full h-9 mt-1">
                <SelectValue placeholder="Choose a recovery officer" />
              </SelectTrigger>
              <SelectContent>
                {recoveryOfficers.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name} - {o.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOfficerId && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
              {/* Left box: unassigned / other officers */}
              <div className="border rounded-lg">
                <div className="bg-muted px-3 py-2 text-sm font-medium border-b">
                  Available Areas ({leftAreas.length})
                </div>
                <div className="max-h-80 overflow-y-auto p-1 space-y-0.5">
                  {leftAreas.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3 text-center">No areas available</p>
                  )}
                  {leftAreas.map(area => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleLeft(area.id)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        leftSelected.includes(area.id)
                          ? 'bg-emerald-100 text-emerald-800 font-medium'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {area.locality}, {area.city}
                      {area.recoveryOfficerId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({recoveryOfficers.find(o => o.id === area.recoveryOfficerId)?.name})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transfer buttons */}
              <div className="flex flex-col gap-2 justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveSingleToRight}
                  disabled={leftSelected.length === 0 || isSaving}
                  title="Move selected to assigned"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveAllToRight}
                  disabled={leftAreas.length === 0 || isSaving}
                  title="Move all to assigned"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveSingleToLeft}
                  disabled={rightSelected.length === 0 || isSaving}
                  title="Move selected back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveAllToLeft}
                  disabled={rightAreas.length === 0 || isSaving}
                  title="Move all back"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* Right box: assigned to this officer */}
              <div className="border rounded-lg">
                <div className="bg-emerald-50 px-3 py-2 text-sm font-medium border-b text-emerald-800">
                  Areas Assigned to {selectedOfficer?.name} ({rightAreas.length})
                </div>
                <div className="max-h-80 overflow-y-auto p-1 space-y-0.5">
                  {rightAreas.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3 text-center">No areas assigned</p>
                  )}
                  {rightAreas.map(area => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleRight(area.id)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        rightSelected.includes(area.id)
                          ? 'bg-emerald-100 text-emerald-800 font-medium'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {area.locality}, {area.city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!selectedOfficerId && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Select a recovery officer above to manage their area assignments.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Areas Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MapPinned className="h-4 w-4 text-blue-600" />
            All Areas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Input
                placeholder="Filter by city, zone, or locality..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <DataTable columns={columns} data={data.filter(a =>
              a.city.toLowerCase().includes(filter.toLowerCase()) ||
              a.zone.toLowerCase().includes(filter.toLowerCase()) ||
              a.locality.toLowerCase().includes(filter.toLowerCase())
            )} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                <MapPinned className="h-4 w-4" />
              </div>
              Edit Area
            </DialogTitle>
          </DialogHeader>
          <AreaForm
            area={selectedArea}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={`${selectedArea?.locality}, ${selectedArea?.city}`}
      />
    </>
  );
}
