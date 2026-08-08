'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Printer, X } from 'lucide-react';
import type { ConnectionLog } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
  both: 'Both',
  internet: 'Internet',
  tv_cable: 'TV Cable',
};

interface ConnectionLogDetailDialogProps {
  log: ConnectionLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  return (
    <div className={accent ? 'rounded-lg bg-amber-50 border border-amber-200 p-3' : 'rounded-lg bg-muted p-3'}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold break-words">{value || '—'}</p>
    </div>
  );
}

export function ConnectionLogDetailDialog({ log, open, onOpenChange }: ConnectionLogDetailDialogProps) {
  useEffect(() => {
    if (!open) return;
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .print-connection-detail, .print-connection-detail * { visibility: visible; }
        .print-connection-detail { position: absolute !important; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [open]);

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
          <h2 className="text-lg font-bold">Connection Change Details</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Close
            </Button>
          </div>
        </div>

        <div className="print-connection-detail flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div>
              <p className="text-xs text-muted-foreground">Log ID</p>
              <p className="font-mono text-sm">{log.id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="font-semibold">
                {log.logDate || '—'} {log.logTime || ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Subscriber Name" value={log.subscriberName} />
            <Field label="Subscriber ID" value={log.internetId} />
            <Field label="Connection Type" value={TYPE_LABELS[log.connectionType || ''] || log.connectionType || '—'} />
            <Field label="Action" value={log.actionType} />
            <Field label="Field / Section" value={log.fieldName} />
            <Field label="Branch" value={log.branch} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Change Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Previous Value" value={log.oldValue} />
              <Field label="New Value" value={log.newValue} />
            </div>
            <div className="mt-3">
              <Field label="Reason for Change" value={log.reason} accent />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Updated By</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Updated By" value={log.updatedByName} />
              <Field label="User Role" value={log.userRole} />
              <Field label="IP Address" value={log.ipAddress} />
              <Field label="Device Name" value={log.deviceName} />
            </div>
          </div>

          <Field label="Remarks / Notes" value={log.remarks} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
