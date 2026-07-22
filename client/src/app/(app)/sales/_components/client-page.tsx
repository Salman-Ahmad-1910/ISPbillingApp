'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/context/company-context';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Printer } from 'lucide-react';
import { printSaleReceipt, type SaleReceiptData } from './sale-receipt';
import { getColumns } from './columns';
import { DataTable } from './data-table';
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
  items: {
    id: string;
    saleId: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    saleTax?: number;
    wthTax?: number;
  }[];
}

interface ClientPageProps {
  data: Sale[];
}

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

export function ClientPage({ data }: ClientPageProps) {
  const { companies } = useCompany();
  const { companyId } = useCompany();
  const { toast } = useToast();

  const company: Company | undefined = companies.find(c => c.id === companyId);

  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [filter, setFilter] = useState('');

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
      saleTax: Number(i.saleTax) || 0,
      wthTax: Number(i.wthTax) || 0,
    })),
  });

  const handleRowClick = (sale: Sale) => {
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

  const handlePrintView = () => {
    if (!viewSale) return;
    setSelectedSale(viewSale);
    setIsPrintOpen(true);
  };

  const columns = getColumns();

  const viewSubtotal = viewSale ? (Number(viewSale.totalAmount) || 0) - (Number(viewSale.taxAmount) || 0) : 0;
  const viewTotalItems = viewSale ? (viewSale.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) : 0;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 pb-0">
            <Input
              placeholder="Filter by customer or payment method..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="p-4">
            <DataTable columns={columns} data={filteredData} onRowClick={handleRowClick} />
          </div>
        </CardContent>
      </Card>

      {/* Print size selection */}
      <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Print Receipt</DialogTitle>
            <DialogDescription>Choose your paper size to print the sale receipt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Browser Printing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" size="lg" onClick={() => handlePrint('a4')}>
                  <Printer className="mr-2 h-5 w-5" /> A4 Size
                </Button>
                <Button variant="outline" size="lg" onClick={() => handlePrint('thermal')}>
                  <Printer className="mr-2 h-5 w-5" /> Thermal / 80mm
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPrintOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Sheet - slides from the right */}
      <Sheet open={!!viewSale} onOpenChange={(o) => { if (!o) setViewSale(null); }}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
          {viewSale && (
            <>
              <SheetHeader className="p-5 pb-3 border-b shrink-0">
                <div>
                  <SheetTitle className="text-lg">Transaction Details</SheetTitle>
                  <SheetDescription>
                    {viewSale.subscriberName || 'Walk-in'} &middot; {viewSale.date ? new Date(viewSale.date).toLocaleDateString() : ''}
                  </SheetDescription>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="capitalize text-xs">{viewSale.paymentMethod}</Badge>
                  <Badge variant="secondary" className="text-xs">#{viewSale.id.slice(0, 8)}</Badge>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="px-5 py-4 space-y-4">
                  {/* Items */}
                  {viewSale.items.map((item, idx) => {
                    const price = Number(item.price) || 0;
                    const qty = Number(item.quantity) || 0;
                    const net = price * qty;
                    const taxPercent = Number((item as any).taxPercent) || 0;
                    const sst = net * (taxPercent / 100);
                    const payable = net + sst;

                    return (
                      <div key={item.id || idx} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40">
                          <span className="font-semibold text-sm">{item.productName}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">x{qty}</Badge>
                        </div>
                        <div className="px-3.5 py-2.5 space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Unit Price</span>
                            <span>PKR {fmtPKR(price)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount</span>
                            <span>PKR {fmtPKR(net)}</span>
                          </div>
                          {sst > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                              <span>PKR {fmtPKR(sst)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-semibold pt-1.5 border-t">
                            <span>Payable</span>
                            <span>PKR {fmtPKR(payable)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="mx-5 mb-5 border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-muted/40">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</span>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items</span>
                      <span>{viewTotalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>PKR {fmtPKR(viewSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>PKR {fmtPKR(viewSale.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                      <span>Total</span>
                      <span>PKR {fmtPKR(viewSale.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="border-t p-4 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrintView}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setViewSale(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
