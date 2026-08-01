'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { SerialNumberPoolEntry } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2, PlusCircle, Trash2, Layers } from 'lucide-react';

interface SnPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SnPoolDialog({ open, onOpenChange }: SnPoolDialogProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [raw, setRaw] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SerialNumberPoolEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: poolEntries = [], isLoading } = useGenericQuery<SerialNumberPoolEntry>(
    'inventory/serial-number-pool',
    companyId ?? undefined
  );

  const parsed = raw
    .split(/[\s,;_/-]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueCount = new Set(parsed).size;

  const available = poolEntries.filter((e) => e.status === 'available').length;

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory/serial-number-pool', companyId] });
  };

  const handleSave = async () => {
    if (!companyId || uniqueCount === 0) return;
    setIsSaving(true);
    try {
      await api.post(`/inventory/serial-number-pool?companyId=${companyId}`, {
        numbers: parsed,
      });
      toast({ title: 'Success', description: `${uniqueCount} serial number(s) added to pool.` });
      setRaw('');
      refetch();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add serial numbers',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !companyId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/inventory/serial-number-pool/${deleteTarget.id}?companyId=${companyId}`);
      toast({ title: 'Success', description: 'Serial number removed from pool.' });
      setDeleteTarget(null);
      refetch();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove serial number',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-1.5 text-white shadow-sm">
                <Layers className="h-4 w-4" />
              </div>
              SN Number Pool
            </DialogTitle>
            <DialogDescription>
              Add many serial numbers at once. Separate each one with a space, dash (-), comma, or new line.
              When a new product is added with an empty SN field, the next available number is assigned automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Available: <Badge variant="secondary">{available}</Badge> /{' '}
                <Badge variant="outline">{poolEntries.length}</Badge> total
              </span>
              {uniqueCount > 0 && (
                <span>
                  Parsed: <Badge variant="secondary">{uniqueCount}</Badge> unique number(s)
                </span>
              )}
            </div>

            <Textarea
              placeholder="e.g., SN-1001 SN-1002 SN-1003&#10;SN1004-SN1005, SN1006"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="min-h-[120px] font-mono"
            />

            <Button
              onClick={handleSave}
              disabled={isSaving || uniqueCount === 0}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:from-violet-600 hover:to-purple-700"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {isSaving ? 'Adding...' : `Add ${uniqueCount || ''} Serial Number${uniqueCount === 1 ? '' : 's'}`}
            </Button>

            <div className="max-h-64 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Serial Number</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                        Loading pool...
                      </td>
                    </tr>
                  ) : poolEntries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                        No serial numbers in the pool yet.
                      </td>
                    </tr>
                  ) : (
                    poolEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-3 py-2 font-mono">{entry.serialNumber}</td>
                        <td className="px-3 py-2">
                          {entry.status === 'available' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Used</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(entry)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={handleDelete}
        itemName={deleteTarget?.serialNumber}
      />
    </>
  );
}
