'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/context/company-context';
  import api from '@/lib/api';
  import { smartMatch } from '@/lib/search';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { printSaleReceipt, type SaleReceiptData } from './sale-receipt';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import type { Company } from '@/lib/types';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  companyId: string;
  isInstallment?: boolean;
  installmentPlanId?: string;
  items: {
    id: string;
    saleId: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    saleTax?: number;
    wthTax?: number;
    serialNumber?: string;
  }[];
}

interface InstallmentInfo {
  id: string;
  planName: string;
  totalInstallments: number;
  paidInstallments: number;
  nextInstallment: number;
  installmentAmount: number;
  totalAmount: number;
  status: string;
  subscriberName?: string;
  saleId?: string;
}

interface ClientPageProps {
  data: Sale[];
}

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

export function ClientPage({ data }: ClientPageProps) {
  const { companies } = useCompany();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const company: Company | undefined = companies.find(c => c.id === companyId);

  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [filter, setFilter] = useState('');
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [viewSaleInstallment, setViewSaleInstallment] = useState<InstallmentInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!viewSale?.isInstallment || !viewSale?.subscriberId || !companyId) {
      setViewSaleInstallment(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/pos/installment/${viewSale.subscriberId}?companyId=${companyId}&saleId=${viewSale.id}`);
        const payload = res.data?.data || res.data;
        const instData = payload?.installment || payload;
        if (!cancelled && instData && instData.id) {
          setViewSaleInstallment({
            id: instData.id,
            planName: instData.planName,
            totalInstallments: instData.totalInstallments,
            paidInstallments: instData.paidInstallments,
            nextInstallment: instData.nextInstallment,
            installmentAmount: instData.installmentAmount,
            totalAmount: instData.totalAmount,
            status: instData.status,
            subscriberName: instData.subscriberName,
            saleId: instData.saleId,
          });
        }
      } catch {
        if (!cancelled) setViewSaleInstallment(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewSale?.id, viewSale?.isInstallment, viewSale?.subscriberId, companyId]);

  const filteredData = useMemo(() => data.filter(sale =>
    smartMatch(filter, [], [sale.subscriberName, sale.paymentMethod])
  ), [data, filter]);

  const toReceipt = (s: Sale): SaleReceiptData => ({
    id: s.id,
    invoiceNumber: data.indexOf(s) + 1,
    subscriberName: s.subscriberName,
    totalAmount: Number(s.totalAmount) || 0,
    taxAmount: Number(s.taxAmount) || 0,
    paymentMethod: s.paymentMethod,
    date: s.date,
    isInstallment: s.isInstallment,
    items: (s.items || []).map(i => ({
      productName: i.productName,
      quantity: i.quantity,
      price: Number(i.price) || 0,
      saleTax: Number(i.saleTax) || 0,
      wthTax: Number(i.wthTax) || 0,
      serialNumber: i.serialNumber || '',
    })),
  });

  const handleRowClick = (sale: Sale) => {
    setViewSale(sale);
  };

  const handlePrint = async (size: 'a4' | 'thermal') => {
    if (!selectedSale) return;
    const receipt = toReceipt(selectedSale);
    if (selectedSale.isInstallment && selectedSale.subscriberId && companyId) {
      try {
        const res = await api.get(`/pos/installment/${selectedSale.subscriberId}?companyId=${companyId}&saleId=${selectedSale.id}`);
        const payload = res.data?.data || res.data;
        const i = payload?.installment || payload;
        if (i && i.id) {
          receipt.installmentInfo = {
            planName: i.planName,
            totalInstallments: i.totalInstallments,
            paidInstallments: i.paidInstallments,
            nextInstallment: i.nextInstallment,
            installmentAmount: i.installmentAmount,
            totalAmount: i.totalAmount,
            remainingInstallments: i.totalInstallments - i.paidInstallments,
            percentage: Math.round((i.paidInstallments / i.totalInstallments) * 100),
            status: i.status,
          };
        }
      } catch {
        // Fall back to receipt without installment info
      }
    }
    await printSaleReceipt(receipt, company, size);
    setIsPrintOpen(false);
    setSelectedSale(null);
  };

  const handlePrintFromView = async (size: 'a4' | 'thermal') => {
    if (!viewSale) return;
    const receipt = toReceipt(viewSale);
    if (viewSale.isInstallment && viewSale.subscriberId && companyId) {
      try {
        const res = await api.get(`/pos/installment/${viewSale.subscriberId}?companyId=${companyId}&saleId=${viewSale.id}`);
        const payload = res.data?.data || res.data;
        const i = payload?.installment || payload;
        if (i && i.id) {
          receipt.installmentInfo = {
            planName: i.planName,
            totalInstallments: i.totalInstallments,
            paidInstallments: i.paidInstallments,
            nextInstallment: i.nextInstallment,
            installmentAmount: i.installmentAmount,
            totalAmount: i.totalAmount,
            remainingInstallments: i.totalInstallments - i.paidInstallments,
            percentage: Math.round((i.paidInstallments / i.totalInstallments) * 100),
            status: i.status,
          };
        }
      } catch {
        // Fall back to receipt without installment info
      }
    }
    await printSaleReceipt(receipt, company, size);
  };

  const handlePrintView = () => {
    if (!viewSale) return;
    setSelectedSale(viewSale);
    setIsPrintOpen(true);
  };

  const handleAddToCollection = async () => {
    if (!viewSale || !companyId) return;
    setIsAddingToCollection(true);
    try {
      await api.post(`/billing/payments?companyId=${companyId}`, {
        subscriberId: viewSale.subscriberId,
        subscriberName: viewSale.subscriberName || 'Walk-in',
        amount: Number(viewSale.totalAmount) || 0,
        paymentDate: viewSale.date || new Date().toISOString(),
        method: viewSale.paymentMethod || 'cash',
      });
      toast({
        title: 'Added to Collection',
        description: `PKR ${fmtPKR(viewSale.totalAmount)} has been added to the subscriber collection.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.response?.data?.error || 'Failed to add to collection',
      });
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/pos/sales/${deleteTarget}`);
      toast({ title: 'Deleted', description: 'Sale entry deleted.' });
      queryClient.invalidateQueries({ queryKey: ['pos/sales', companyId] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = getColumns(handleDelete);

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
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="capitalize text-xs">{viewSale.paymentMethod}</Badge>
                  <Badge variant="secondary" className="text-xs">#{viewSale.id}</Badge>
                  {viewSale.isInstallment && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Installment</Badge>
                  )}
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

                {/* Installment Details */}
                {viewSale.isInstallment && viewSaleInstallment && (
                  <div className="mx-5 border rounded-lg overflow-hidden border-blue-200 dark:border-blue-800">
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Installment Details</span>
                    </div>
                    <div className="px-4 py-3 space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">{viewSaleInstallment.planName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Selling Price (Subtotal)</span>
                        <span className="font-medium">PKR {fmtPKR((Number(viewSale.totalAmount) || 0) - (Number(viewSale.taxAmount) || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount (incl. increase)</span>
                        <span className="font-semibold">PKR {fmtPKR(viewSaleInstallment.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount per Installment</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">PKR {fmtPKR(viewSaleInstallment.installmentAmount)}</span>
                      </div>
                      <div className="border-t pt-2 mt-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Total Installments</span>
                          <span>{viewSaleInstallment.totalInstallments}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{viewSaleInstallment.paidInstallments} / {viewSaleInstallment.totalInstallments}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{viewSaleInstallment.totalInstallments - viewSaleInstallment.paidInstallments} / {viewSaleInstallment.totalInstallments}</span>
                        </div>
                        {viewSaleInstallment.nextInstallment > 0 && (
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">Next Installment #</span>
                            <span className="font-medium">{viewSaleInstallment.nextInstallment}</span>
                          </div>
                        )}
                      </div>
                      <div className="border-t pt-2 mt-1 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paid Amount</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PKR {fmtPKR(viewSaleInstallment.paidInstallments * viewSaleInstallment.installmentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Remaining Amount</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">PKR {fmtPKR((viewSaleInstallment.totalInstallments - viewSaleInstallment.paidInstallments) * viewSaleInstallment.installmentAmount)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={viewSaleInstallment.status === 'completed' ? 'default' : 'secondary'} className="text-xs capitalize">{viewSaleInstallment.status}</Badge>
                      </div>
                    </div>
                  </div>
                )}

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
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrintView}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                  </Button>
                  <Button variant="default" size="sm" disabled={isAddingToCollection || !viewSale.subscriberId} onClick={handleAddToCollection}>
                    {isAddingToCollection ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    Add to Collection
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setViewSale(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DeleteAlertDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={confirmDelete}
        itemName="this sale"
      />
    </div>
  );
}
