'use client';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { printSaleReceipt, type SaleReceiptData } from './sale-receipt';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import type { Company } from '@/lib/types';

interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  companyId: string;
  items: SaleItem[];
}

interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface ClientPageProps {
  data: Sale[];
}

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

export function ClientPage({ data }: ClientPageProps) {
  const [filter, setFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const { companies, companyId } = useCompany();

  const company: Company | undefined = companies.find(c => c.id === companyId);

  const filteredData = useMemo(() => data.filter(sale =>
    sale?.subscriberName?.toLowerCase()?.includes(filter?.toLowerCase()) ||
    sale?.paymentMethod?.toLowerCase()?.includes(filter?.toLowerCase())
  ), [data, filter]);

  const toReceipt = (s: Sale): SaleReceiptData => ({
    id: s.id,
    subscriberName: s.subscriberName,
    totalAmount: Number(s.totalAmount) || 0,
    taxAmount: Number(s.taxAmount) || 0,
    paymentMethod: s.paymentMethod,
    date: s.date,
    items: (s.items || []).map(i => ({
      productName: i.productName,
      quantity: i.quantity,
      price: Number(i.price) || 0,
    })),
  });

  const handlePrintClick = (sale: Sale) => {
    setSelectedSale(sale);
    setIsPrintOpen(true);
  };

  const handleView = (sale: Sale) => {
    setViewSale(sale);
  };

  const handlePrint = async (size: 'a4' | 'thermal') => {
    if (!selectedSale) return;
    await printSaleReceipt(toReceipt(selectedSale), company, size);
    setIsPrintOpen(false);
    setSelectedSale(null);
  };

  const handlePrintFromView = async (size: 'a4' | 'thermal') => {
    if (!viewSale) return;
    await printSaleReceipt(toReceipt(viewSale), company, size);
  };

  const columns = getColumns({ onPrint: handlePrintClick, onView: handleView });

  const viewSubtotal = viewSale ? (Number(viewSale.totalAmount) || 0) - (Number(viewSale.taxAmount) || 0) : 0;
  const viewTotalItems = viewSale ? (viewSale.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Filter by subscriber name or payment method..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm flex-1"
        />
      </div>
      <DataTable columns={columns} data={filteredData} />

      {/* Print size selection */}
      <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Print Receipt {selectedSale?.id}</DialogTitle>
            <DialogDescription>
              Choose your paper size to print the sale receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Browser Printing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" size="lg" onClick={() => handlePrint('a4')}>
                  <Printer className="mr-2 h-5 w-5" />
                  A4 Size
                </Button>
                <Button variant="outline" size="lg" onClick={() => handlePrint('thermal')}>
                  <Printer className="mr-2 h-5 w-5" />
                  Thermal / 80mm
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPrintOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details */}
      <Dialog open={!!viewSale} onOpenChange={(o) => !o && setViewSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details {viewSale?.id ? `#${viewSale.id.slice(0, 8)}` : ''}</DialogTitle>
            <DialogDescription>
              Full breakdown of this point-of-sale transaction.
            </DialogDescription>
          </DialogHeader>

          {viewSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {viewSale.subscriberName || 'Walk-in'}</div>
                <div><span className="text-muted-foreground">Payment:</span> <Badge variant="outline" className="capitalize">{viewSale.paymentMethod}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {viewSale.date ? new Date(viewSale.date).toLocaleString() : '-'}</div>
                <div><span className="text-muted-foreground">Receipt #:</span> <span className="font-mono text-xs">{viewSale.id}</span></div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(viewSale.items || []).length > 0 ? (
                    viewSale.items.map((it) => (
                      <TableRow key={it.id || it.productId}>
                        <TableCell>{it.productName}</TableCell>
                        <TableCell className="text-center">{it.quantity}</TableCell>
                        <TableCell className="text-right">PKR {fmtPKR(it.price)}</TableCell>
                        <TableCell className="text-right">PKR {fmtPKR(it.price * it.quantity)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No items</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Items</span><span>{viewTotalItems}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>PKR {fmtPKR(viewSubtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>PKR {fmtPKR(viewSale.taxAmount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>PKR {fmtPKR(viewSale.totalAmount)}</span></div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handlePrintFromView('a4')}>
              <Printer className="mr-2 h-4 w-4" /> Print A4
            </Button>
            <Button variant="outline" onClick={() => handlePrintFromView('thermal')}>
              <Printer className="mr-2 h-4 w-4" /> Print Thermal
            </Button>
            <Button variant="secondary" onClick={() => setViewSale(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
