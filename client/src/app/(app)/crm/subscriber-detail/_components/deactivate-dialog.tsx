'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Connection } from '@/lib/types';

interface DeactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeactivate: (connection: Connection, reason: string, comments: string) => Promise<void>;
  connection: Connection | null;
  isSaving: boolean;
}

export function DeactivateDialog({ isOpen, onClose, onDeactivate, connection, isSaving }: DeactivateDialogProps) {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  const handleDeactivate = async () => {
    if (!connection || !reason) return;
    await onDeactivate(connection, reason, comments);
    setReason('');
    setComments('');
  };

  const handleClose = () => {
    setReason('');
    setComments('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate Subscriber</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {connection && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p><span className="font-medium">Name:</span> {connection.name}</p>
              <p><span className="font-medium">Internet ID:</span> {connection.internetId}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason for Leaving <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voluntary">Voluntary</SelectItem>
                <SelectItem value="non-payment">Non-Payment</SelectItem>
                <SelectItem value="relocation">Relocation</SelectItem>
                <SelectItem value="switched_provider">Switched Provider</SelectItem>
                <SelectItem value="service_issues">Service Issues</SelectItem>
                <SelectItem value="financial">Financial Reasons</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={!reason || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              'Deactivate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
