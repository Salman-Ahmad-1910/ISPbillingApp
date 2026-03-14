'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { VendorInvoice } from '@/lib/types';
import { Printer } from 'lucide-react';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: VendorInvoice | null;
}

export function PrintDialog({ isOpen, onClose, invoice }: PrintDialogProps) {
  if (!invoice) return null;

  const handlePrint = (size: 'a4' | 'thermal') => {
    const url = `/vendor-invoices/print/${invoice.id}?size=${size}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print Vendor Invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Choose the paper size for printing the vendor invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" size="lg" onClick={() => handlePrint('a4')}>
                <Printer className="mr-2 h-5 w-5"/>
                A4 Size
            </Button>
            <Button variant="outline" size="lg" onClick={() => handlePrint('thermal')}>
                 <Printer className="mr-2 h-5 w-5"/>
                Thermal/Mini
            </Button>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
