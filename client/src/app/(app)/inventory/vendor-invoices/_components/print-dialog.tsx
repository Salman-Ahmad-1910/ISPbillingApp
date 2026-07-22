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
import type { VendorInvoice } from '@/lib/types';
import { Printer, Bluetooth, BluetoothConnected, Loader2, AlertCircle } from 'lucide-react';
import { bluetoothPrinterService, BluetoothPrinterService, type BluetoothPrinter } from '@/services/bluetooth-printer';
import { ESCPOSEncoder } from '@/services/escpos-encoder';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Company } from '@/lib/types';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: VendorInvoice | null;
}

export function PrintDialog({ isOpen, onClose, invoice }: PrintDialogProps) {
  const [bluetoothPrinter, setBluetoothPrinter] = useState<BluetoothPrinter | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { companyId } = useCompany();

  // Fetch company data for Bluetooth printing
  const { data: companiesData = [] } = useGenericQuery<Company>('admin/companies', companyId ?? undefined);
  const companies = companiesData || [];
  const company = companies.find(c => c.id === invoice?.companyId);

  useEffect(() => {
    // Check for already connected printer
    if (bluetoothPrinterService.isConnected()) {
      setBluetoothPrinter(bluetoothPrinterService.getPrinterInfo());
    }
  }, []);

  const handlePrint = (size: 'a4' | 'thermal') => {
    if (!invoice) return;
    const url = `/inventory/vendor-invoices/print?id=${invoice.id}&size=${size}`;
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
    if (!bluetoothPrinter || !company || !invoice) {
      setError('Missing required data for printing');
      return;
    }

    setIsPrinting(true);
    setError(null);

    try {
      // Create vendor invoice data (similar structure to regular invoice)
      const invoiceData = {
        company: {
          name: company.name || '',
          address: company.address || '',
          email: company.email || '',
          contact1: company.contact1 || ''
        },
        invoice: {
          id: invoice.invoiceNumber || invoice.id || '',
          amount: invoice.totalAmount || 0,
          dueDate: invoice.invoiceDate || ''
        },
        subscriber: {
          name: invoice.vendorName || 'Vendor',
          installationAddress: '', // VendorInvoice doesn't have address field
          phone: '', // VendorInvoice doesn't have phone field
          packageName: `Vendor Invoice - ${invoice.invoiceNumber}`
        }
      };
      
      // Encode to ESC/POS
      const encoder = new ESCPOSEncoder();
      const printData = encoder.encodeInvoice(invoiceData);
      
      // Send to printer
      await bluetoothPrinterService.print(printData, { cut: true });
      
      // Close dialog after successful print
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to print vendor invoice');
    } finally {
      setIsPrinting(false);
    }
  };

  const isBluetoothSupported = BluetoothPrinterService.isSupported();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Print Vendor Invoice {invoice?.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Choose your printing method for the vendor invoice.
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

          {/* Bluetooth Printing Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Bluetooth Printer</h3>
              {bluetoothPrinter ? (
                <Badge variant="default" className="bg-green-500">
                  <BluetoothConnected className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              ) : isBluetoothSupported ? (
                <Badge variant="secondary">
                  <Bluetooth className="mr-1 h-3 w-3" />
                  Available
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Not Supported
                </Badge>
              )}
            </div>

            {bluetoothPrinter ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{bluetoothPrinter.name}</p>
                  <p className="text-sm text-gray-500">ID: {bluetoothPrinter.id}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleBluetoothPrint}
                    disabled={isPrinting || !company}
                    className="flex-1"
                  >
                    {isPrinting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Printing...
                      </>
                    ) : (
                      <>
                        <Printer className="mr-2 h-4 w-4" />
                        Print via Bluetooth
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDisconnectBluetooth}
                    disabled={isPrinting}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {!isBluetoothSupported && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or Opera on desktop or Android.
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleConnectBluetooth}
                  disabled={!isBluetoothSupported || isConnecting}
                  className="w-full"
                  variant="outline"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="mr-2 h-4 w-4" />
                      Connect Bluetooth Printer
                    </>
                  )}
                </Button>
              </div>
            )}
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
