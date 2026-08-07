'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import type { Complaint } from '@/lib/types';

export const COMPLAINT_STATUSES = [
  { value: 'open', label: 'Open', dot: 'bg-green-500' },
  { value: 'done', label: 'Done', dot: 'bg-blue-500' },
  { value: 'on-hold', label: 'On Hold', dot: 'bg-yellow-500' },
  { value: 'reject', label: 'Reject', dot: 'bg-red-500' },
  { value: 'closed', label: 'Closed', dot: 'bg-gray-800' },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-green-100 text-green-800',
  'done': 'bg-blue-100 text-blue-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  'reject': 'bg-red-100 text-red-800',
  'closed': 'bg-gray-200 text-gray-800',
};

export const STATUS_LABELS: Record<string, string> = {
  'open': 'Open',
  'done': 'Done',
  'on-hold': 'On Hold',
  'reject': 'Reject',
  'closed': 'Closed',
};

export function ComplaintStatusSelect({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const current = COMPLAINT_STATUSES.find((s) => s.value === value);
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select status">
          {value ? (
            current ? (
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${current.dot}`} />
                {current.label}
              </span>
            ) : (
              <span className="capitalize">{value.replace(/-/g, ' ')}</span>
            )
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {COMPLAINT_STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ComplaintStatusDialog({ complaint, open, onOpenChange, onUpdated }: {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNewStatus(open && complaint ? complaint.status || '' : '');
  }, [open, complaint]);

  const handleStatusUpdate = async () => {
    if (!complaint || !newStatus) return;
    setIsSaving(true);
    try {
      await api.put(`/support/complaints/${complaint.id}`, {
        ...complaint,
        status: newStatus,
        assignedToId: complaint.assignedToId || null,
      });
      toast({ title: 'Success', description: `Complaint status updated to ${STATUS_LABELS[newStatus] || newStatus}.` });
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to update status' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setNewStatus(''); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Complaint Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Subscriber</Label>
            <Input value={complaint?.subscriberName || ''} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <ComplaintStatusSelect value={newStatus} onValueChange={setNewStatus} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={isSaving || !newStatus} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
