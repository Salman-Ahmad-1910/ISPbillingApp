'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPinned, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Save, RotateCcw, Loader2 } from 'lucide-react';
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
  import { smartMatch } from '@/lib/search';
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
  // Staged (not yet saved) changes for the selected officer:
  // stagedRightIds = areas moved left -> right (to be assigned),
  // stagedLeftIds   = areas moved right -> left (to be unassigned).
  const [stagedRightIds, setStagedRightIds] = useState<string[]>([]);
  const [stagedLeftIds, setStagedLeftIds] = useState<string[]>([]);

  const selectedOfficer = recoveryOfficers.find(o => o.id === selectedOfficerId);

  // An area belongs to an officer if its recoveryOfficerIds contains them.
  const isAssignedToOfficer = (area: Area, officerId: string) =>
    (area.recoveryOfficerIds?.includes(officerId) ?? false);

  const officerNamesFor = (area: Area) =>
    (area.recoveryOfficerIds ?? [])
      .map(id => recoveryOfficers.find(o => o.id === id)?.name)
      .filter(Boolean)
      .join(', ');

  // Areas currently assigned to the selected officer (from the server)
  const assignedAreas = useMemo(() =>
    data.filter(a => isAssignedToOfficer(a, selectedOfficerId)),
    [data, selectedOfficerId]
  );

  // Left list: the master pool of all areas in the company.
  // Moving an area to the right does not remove it from here, so any
  // area can be assigned to multiple recovery officers.
  const leftAreas = useMemo(() => data, [data]);

  // Right list: assigned areas (minus staged unassignments) plus staged additions
  const rightAreas = useMemo(() => {
    const kept = assignedAreas.filter(a => !stagedLeftIds.includes(a.id));
    const added = data.filter(a => stagedRightIds.includes(a.id) && !isAssignedToOfficer(a, selectedOfficerId));
    return [...kept, ...added];
  }, [data, assignedAreas, stagedRightIds, stagedLeftIds, selectedOfficerId]);

  const stagedChangeCount = stagedRightIds.length + stagedLeftIds.length;

  const resetStaging = () => {
    setStagedRightIds([]);
    setStagedLeftIds([]);
    setLeftSelected([]);
    setRightSelected([]);
  };

  const handleOfficerChange = (id: string) => {
    setSelectedOfficerId(id);
    resetStaging();
  };

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

  // Stage (client-side only) areas to be assigned to the selected officer.
  const stageToRight = (ids: string[]) => {
    if (!selectedOfficerId || ids.length === 0) return;
    const nextRight = [...stagedRightIds];
    for (const id of ids) {
      const area = data.find(a => a.id === id);
      if (!area) continue;
      // Already assigned to this officer - no change needed.
      if (isAssignedToOfficer(area, selectedOfficerId)) continue;
      if (!nextRight.includes(id)) nextRight.push(id);
    }
    // Cancelling any staged unassignment prevents one area going to two officers.
    setStagedLeftIds(prev => prev.filter(id => !ids.includes(id)));
    setStagedRightIds(nextRight);
    setLeftSelected([]);
    setRightSelected([]);
  };

  // Stage (client-side only) areas to be unassigned from the selected officer.
  const stageToLeft = (ids: string[]) => {
    if (ids.length === 0) return;
    const nextLeft = [...stagedLeftIds];
    for (const id of ids) {
      if (!nextLeft.includes(id)) nextLeft.push(id);
    }
    setStagedRightIds(prev => prev.filter(id => !ids.includes(id)));
    setStagedLeftIds(nextLeft);
    setRightSelected(prev => prev.filter(id => !ids.includes(id)));
    setLeftSelected([]);
  };

  const moveSingleToRight = () => {
    const ids = leftSelected.length > 0 ? leftSelected : leftAreas.slice(0, 1).map(a => a.id);
    stageToRight(ids);
  };

  const moveAllToRight = () => {
    stageToRight(leftAreas.map(a => a.id));
  };

  const moveSingleToLeft = () => {
    const ids = rightSelected.length > 0 ? rightSelected : rightAreas.slice(0, 1).map(a => a.id);
    stageToLeft(ids);
  };

  const moveAllToLeft = () => {
    stageToLeft(rightAreas.map(a => a.id));
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

  // Persist the staged changes for the selected officer with a single Save.
  const handleSaveAssignments = async () => {
    if (!selectedOfficerId || stagedChangeCount === 0) return;
    setIsSaving(true);
    let count = 0;
    try {
      for (const id of stagedRightIds) {
        await api.post(`/network/areas/${id}/assign-officer`, { recoveryOfficerId: selectedOfficerId });
        count++;
      }
      for (const id of stagedLeftIds) {
        await api.post(`/network/areas/${id}/unassign-officer`, { recoveryOfficerId: selectedOfficerId });
        count++;
      }
      queryClient.invalidateQueries({ queryKey: ['network/areas', companyId] });
      toast({ title: 'Success', description: `${count} area(s) updated.` });
      resetStaging();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed aft-er ${count} area(s): ${error.response?.data?.message || error.message}`,
      });
      console.error('Area assignment error', error.response?.data, error);
    } finally { setIsSaving(false); }
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
            <Select value={selectedOfficerId} onValueChange={handleOfficerChange}>
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
              {/* Left box: master pool of all areas */}
              <div className="border rounded-lg">
                <div className="bg-muted px-3 py-2 text-sm font-medium border-b">
                  All Areas ({leftAreas.length})
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
                      {officerNamesFor(area) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({officerNamesFor(area)})
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
                  disabled={leftAreas.length === 0 || isSaving}
                  title="Move selected (or first) to assigned"
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
                  disabled={rightAreas.length === 0 || isSaving}
                  title="Move selected (or first) back"
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

              <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
                <p className="text-xs text-muted-foreground mr-auto">
                  {stagedChangeCount > 0
                    ? `${stagedChangeCount} pending change(s) - click Save to apply them to ${selectedOfficer?.name || 'this officer'}.`
                    : 'No pending changes. Use the arrow buttons to move areas, then press Save.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetStaging}
                  disabled={stagedChangeCount === 0 || isSaving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveAssignments}
                  disabled={stagedChangeCount === 0 || isSaving}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSaving ? 'Saving...' : 'Save Assignments'}
                </Button>
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
              smartMatch(filter, [], [a.city, a.zone, a.locality])
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
