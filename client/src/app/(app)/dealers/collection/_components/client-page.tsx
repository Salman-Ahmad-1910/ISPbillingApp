'use client'

import { DataTable } from './data-table';
import { getColumns, type CollectionActions } from './columns';
import type { DealerCollection } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SearchableSelect,
} from '@/components/ui/searchable-select';
import { useState, useCallback } from 'react';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { CollectionPrintDialog } from '@/app/(app)/transaction/dealers-collections/_components/collection-print-dialog';

const STATUS_OPTIONS = [
  { id: 'pending', name: 'Unpaid' },
  { id: 'settled', name: 'Paid' },
];

interface ClientPageProps {
  data: DealerCollection[];
  onRefetch?: () => void;
}

export default function ClientPage({ data, onRefetch }: ClientPageProps) {
  const [filter, setFilter] = useState('');
  const { companyId, companies } = useCompany();
  const currentCompany = companies.find(c => c.id === companyId);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [editCollection, setEditCollection] = useState<DealerCollection | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'settled'>('pending');

  // Print state
  const [printCollection, setPrintCollection] = useState<DealerCollection | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printFormatChoice, setPrintFormatChoice] = useState<'a4' | 'thermal'>('a4');

  const filteredData = data
    .filter(item =>
      item?.dealerName?.toLowerCase().includes(filter.toLowerCase()) ||
      item?.comment?.toLowerCase().includes(filter.toLowerCase())
    );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/dealers/collections/${id}`);
      toast({ title: 'Deleted', description: 'Collection entry deleted.' });
      onRefetch?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete entry.' });
    }
  }, [onRefetch, toast]);

  const handleEditOpen = useCallback((col: DealerCollection) => {
    setEditCollection(col);
    setEditAmount(col.amount);
    setEditComment(col.comment || '');
    setEditStatus(col.settlementStatus as 'pending' | 'settled');
    setShowEditDialog(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editCollection) return;
    setIsSaving(true);
    try {
      await api.put(`/dealers/collections/${editCollection.id}`, {
        ...editCollection,
        amount: editAmount,
        comment: editComment,
        settlementStatus: editStatus,
      });
      toast({ title: 'Updated', description: 'Collection entry updated.' });
      setShowEditDialog(false);
      setEditCollection(null);
      onRefetch?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update entry.' });
    } finally {
      setIsSaving(false);
    }
  }, [editCollection, editAmount, editComment, editStatus, onRefetch, toast]);

  const handleToggleStatus = useCallback(async (col: DealerCollection) => {
    const newStatus = col.settlementStatus === 'settled' ? 'pending' : 'settled';
    try {
      await api.put(`/dealers/collections/${col.id}`, {
        ...col,
        settlementStatus: newStatus,
      });
      toast({ title: 'Updated', description: `Status changed to ${newStatus}.` });
      onRefetch?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  }, [onRefetch, toast]);

  const handlePrint = useCallback((col: DealerCollection, format: 'a4' | 'thermal') => {
    setPrintCollection(col);
    setPrintFormatChoice(format);
    setIsPrintDialogOpen(true);
  }, []);

  const actions: CollectionActions = {
    onEdit: handleEditOpen,
    onDelete: handleDelete,
    onPrint: handlePrint,
    onToggleStatus: handleToggleStatus,
  };

  const columns = getColumns(actions);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Filter by dealer or comment..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <DataTable columns={columns} data={filteredData} />

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditCollection(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Collection Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bill #</Label>
                <Input value={editCollection?.id?.slice(0, 8).toUpperCase() || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Dealer</Label>
                <Input value={editCollection?.dealerName || ''} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <SearchableSelect
                value={editStatus}
                onValueChange={(v) => { if (v) setEditStatus(v as 'pending' | 'settled'); }}
                options={STATUS_OPTIONS}
                placeholder="Select status..."
                searchPlaceholder="Search status..."
                allowClear={false}
              />
            </div>
            <div className="space-y-1">
              <Label>Comment</Label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
            </div>
            <Button
              onClick={handleEditSave}
              disabled={isSaving || !editAmount}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <CollectionPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => { setIsPrintDialogOpen(false); setPrintCollection(null); }}
        collection={printCollection}
        company={currentCompany}
        initialTab={printFormatChoice}
      />
    </div>
  )
}
