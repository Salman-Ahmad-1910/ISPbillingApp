'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Banknote } from 'lucide-react';
import type { Invoice } from '@/lib/types';

interface PaymentDialogProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { amount: number; method: string }) => void;
  isProcessing?: boolean;
}

export function PaymentDialog({ invoice, isOpen, onClose, onConfirm, isProcessing }: PaymentDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('cash');

  const remaining = invoice?.remainingAmount ?? invoice?.amount ?? 0;

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
    setAmount('');
    setMethod('cash');
  };

  const handleConfirm = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    onConfirm({ amount: parsed, method });
    setAmount('');
    setMethod('cash');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm">
              <Banknote className="h-4 w-4" />
            </div>
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment against invoice
            {invoice?.subscriberName ? <span className="font-medium"> for {invoice.subscriberName}</span> : null}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Remaining balance</span>
            <span className="font-semibold">PKR {remaining.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              max={remaining}
              placeholder={`Enter amount (max ${remaining})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="dealer">Dealer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !parseFloat(amount) || parseFloat(amount) <= 0}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
