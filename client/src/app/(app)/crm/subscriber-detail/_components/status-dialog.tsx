'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Connection } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'suspended', label: 'Suspended' },
] as const;

const DEACTIVATION_REASONS = [
  { value: 'voluntary', label: 'Voluntary' },
  { value: 'non-payment', label: 'Non-Payment' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'switched_provider', label: 'Switched Provider' },
  { value: 'service_issues', label: 'Service Issues' },
  { value: 'financial', label: 'Financial Reasons' },
  { value: 'other', label: 'Other' },
];

interface StatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeStatus: (
    connection: Connection,
    status: string,
    reason: string,
    comments: string
  ) => Promise<void>;
  connection: Connection | null;
  isSaving: boolean;
}

export function StatusDialog({ isOpen, onClose, onChangeStatus, connection, isSaving }: StatusDialogProps) {
  const [status, setStatus] = useState<string>('active');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  // Seed from the subscriber's current status every time the dialog opens.
  useEffect(() => {
    if (isOpen && connection) {
      const current = STATUS_OPTIONS.some(o => o.value === connection.status) ? connection.status : 'active';
      setStatus(current);
      setReason('');
      setComments('');
    }
  }, [isOpen, connection]);

  const isDeactivating = status === 'deactivated';
  const needsReason = isDeactivating && !reason;

  const handleClose = () => {
    setStatus('active');
    setReason('');
    setComments('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!connection || needsReason) return;
    await onChangeStatus(connection, status, reason, comments);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Subscriber Status</DialogTitle>
          <DialogDescription>Select the new status for this subscriber.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {connection && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p><span className="font-medium">Name:</span> {connection.name}</p>
              <p><span className="font-medium">Internet ID:</span> {connection.internetId}</p>
              <p>
                <span className="font-medium">Current Status:</span>{' '}
                {STATUS_OPTIONS.find(o => o.value === connection.status)?.label || connection.status}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status <span className="text-destructive">*</span></Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isDeactivating && (
            <>
              <div className="space-y-2">
                <Label>Reason for Leaving <span className="text-destructive">*</span></Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEACTIVATION_REASONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea
                  placeholder="Enter any additional comments..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant={isDeactivating ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={needsReason || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
