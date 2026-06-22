'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Invoice } from '@/lib/types';
import { Printer, Bluetooth, BluetoothConnected, Loader2, AlertCircle } from 'lucide-react';
import { bluetoothPrinterService, BluetoothPrinterService, type BluetoothPrinter } from '@/services/bluetooth-printer';
import { ESCPOSEncoder, createInvoiceData } from '@/services/escpos-encoder';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Company, Subscriber } from '@/lib/types';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function PrintDialog({ isOpen, onClose, invoice }: PrintDialogProps) {
  const [bluetoothPrinter, setBluetoothPrinter] = useState<BluetoothPrinter | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { companyId } = useCompany();

  // Fetch data for Bluetooth printing
  const { data: companies = [] } = useGenericQuery<Company[]>('admin/companies', companyId ?? undefined);
  const { data: subscribers = [] } = useGenericQuery<Subscriber[]>('billing/subscribers', companyId ?? undefined);

  const company = companies.find(c => c.id === invoice?.companyId);
  const subscriber = subscribers.find(s => s.id === invoice?.subscriberId);

  useEffect(() => {
    // Check for already connected printer
    if (bluetoothPrinterService.isConnected()) {
      setBluetoothPrinter(bluetoothPrinterService.getPrinterInfo());
    }
  }, []);

  const handlePrint = (size: 'a4' | 'thermal') => {
    if (!invoice) return;
    const url = `/sales/invoices/print/${invoice.id}?size=${size}`;
    window.open(url, '_blank');
    onClose();
  };

  const handleConnectBluetooth = async () => {
    if (!BluetoothPrinterService.isSupported()) {
      setError('Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const printer = await bluetoothPrinterService.connect();
      setBluetoothPrinter(printer);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect to printer');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectBluetooth = async () => {
    try {
      await bluetoothPrinterService.disconnect();
      setBluetoothPrinter(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to disconnect from printer');
    }
  };

  const handleBluetoothPrint = async () => {
    if (!bluetoothPrinter || !company || !subscriber || !invoice) {
      setError('Missing required data for printing');
      return;
    }

    setIsPrinting(true);
    setError(null);

    try {
      // Create invoice data
      const invoiceData = createInvoiceData(invoice, company, subscriber);
      
      // Encode to ESC/POS
      const encoder = new ESCPOSEncoder();
      const printData = encoder.encodeInvoice(invoiceData);
      
      // Send to printer
      await bluetoothPrinterService.print(printData, { cut: true });
      
      // Close dialog after successful print
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to print invoice');
    } finally {
      setIsPrinting(false);
    }
  };

  const isBluetoothSupported = BluetoothPrinterService.isSupported();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Print Invoice {invoice?.id}</DialogTitle>
          <DialogDescription>
            Choose your printing method for the invoice.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Browser Printing Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Browser Printing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" size="lg" onClick={() => handlePrint('a4')}>
                <Printer className="mr-2 h-5 w-5"/>
                A4 Size
              </Button>
              <Button variant="outline" size="lg" onClick={() => handlePrint('thermal')}>
                <Printer className="mr-2 h-5 w-5"/>
                Thermal/Mini
              </Button>
            </div>
          </div>

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
