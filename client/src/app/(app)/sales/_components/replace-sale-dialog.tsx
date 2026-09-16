'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, Plus, Search, Trash2, Hash, Boxes, RefreshCw } from 'lucide-react';
import { smartMatch } from '@/lib/search';
import { ActionFeedbackDialog } from '@/components/shared/action-feedback-dialog';

interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  discount?: number;
  paymentMethod: string;
  status?: string;
  date: string;
  isInstallment?: boolean;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    originalPrice?: number;
    saleTax?: number;
    wthTax?: number;
    serialNumber?: string;
    model?: string;
  }[];
}

interface ReplaceItem {
  product: any;
  quantity: number;
  price: number;
  selectedSNs: string[];
  selectedModels: string[];
}

function purchasedSNs(product: any): string[] {
  return String(product?.serialNumber || product?.productSerialNumber || '')
    .split(/[\s,\-]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function purchasedModels(product: any): string[] {
  return String(product?.model || product?.productModel || '')
    .split(/[\s,\n\r\t,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function prefixMatch(q: string, name: string): boolean {
  return q.length === 0 || name.toLowerCase().includes(q.trim().toLowerCase());
}

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

export function ReplaceSaleDialog({
  sale,
  onClose,
  onSuccess,
}: {
  sale: Sale | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { companyId } = useCompany();
  const { data: purchasedProducts = [] } = useGenericQuery<any>('inventory/purchased-products', companyId ?? undefined);

  const [items, setItems] = useState<ReplaceItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const productSearchRef = useRef<HTMLDivElement>(null);

  const posProducts = useMemo(() => {
    const byId = new Map<string, any>();
    for (const p of purchasedProducts as any[]) {
      const normalized = {
        ...p,
        stock: Number(p.stock) || 0,
        price: Number(p.price) || 0,
        taxPercent: Number(p.taxPercent) || 0,
      };
      const existing = byId.get(p.id);
      if (!existing) {
        byId.set(p.id, normalized);
        continue;
      }
      byId.set(p.id, {
        ...existing,
        stock: existing.stock + normalized.stock,
        serialNumber: [existing.serialNumber, normalized.serialNumber].filter(Boolean).join(', '),
        productSerialNumber: [existing.productSerialNumber, normalized.productSerialNumber].filter(Boolean).join(', '),
        model: [existing.model, normalized.model].filter(Boolean).join(', '),
        productModel: [existing.productModel, normalized.productModel].filter(Boolean).join(', '),
      });
    }
    return Array.from(byId.values());
  }, [purchasedProducts]);

  const [searchOpen, setSearchOpen] = useState(false);
  const filteredProducts = useMemo(() => {
    return posProducts.filter((p) => prefixMatch(search, p.name) || smartMatch(search, [p.id], [p.name || '']));
  }, [posProducts, search]);

  const addProduct = (productId: string) => {
    const product = posProducts.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) {
      setFeedback({
        type: 'error',
        title: 'Out of Stock',
        message: `${product.name} is currently out of stock.`,
      });
      return;
    }
    const existing = items.find((i) => i.product?.id === productId);
    if (existing && existing.quantity >= product.stock) {
      setFeedback({
        type: 'error',
        title: 'Stock Limit Reached',
        message: `You cannot add more of ${product.name}.`,
      });
      return;
    }
    setItems((cur) =>
      existing
        ? cur.map((i) => (i.product?.id === productId ? { ...i, quantity: i.quantity + 1 } : i))
        : [...cur, { product, quantity: 1, price: Number(product.price) || 0, selectedSNs: [], selectedModels: [] }],
    );
    setSearch('');
    setSearchOpen(false);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const product = posProducts.find((p) => p.id === productId);
    if (quantity <= 0) {
      setItems((cur) => cur.filter((i) => i.product?.id !== productId));
      return;
    }
    if (product && quantity > product.stock) quantity = product.stock;
    setItems((cur) =>
      cur.map((i) => {
        if (i.product?.id !== productId) return i;
        const selectedSNs = i.selectedSNs.length > quantity ? i.selectedSNs.slice(0, quantity) : i.selectedSNs;
        const selectedModels = i.selectedModels.length > quantity ? i.selectedModels.slice(0, quantity) : i.selectedModels;
        return { ...i, quantity, selectedSNs, selectedModels };
      }),
    );
  };

  const updatePrice = (productId: string, price: number) => {
    const normalized = isNaN(price) ? 0 : Math.max(price, 0);
    setItems((cur) => cur.map((i) => (i.product?.id === productId ? { ...i, price: normalized } : i)));
  };

  const removeItem = (productId: string) => {
    setItems((cur) => cur.filter((i) => i.product?.id !== productId));
  };

  const toggleSN = (productId: string, sn: string) => {
    setItems((cur) =>
      cur.map((i) => {
        if (i.product?.id !== productId) return i;
        const has = i.selectedSNs.includes(sn);
        if (has) return { ...i, selectedSNs: i.selectedSNs.filter((s) => s !== sn) };
        if (i.selectedSNs.length >= i.quantity) return i;
        return { ...i, selectedSNs: [...i.selectedSNs, sn] };
      }),
    );
  };

  const toggleModel = (productId: string, model: string) => {
    setItems((cur) =>
      cur.map((i) => {
        if (i.product?.id !== productId) return i;
        const has = i.selectedModels.includes(model);
        if (has) return { ...i, selectedModels: i.selectedModels.filter((m) => m !== model) };
        if (i.selectedModels.length >= i.quantity) return i;
        return { ...i, selectedModels: [...i.selectedModels, model] };
      }),
    );
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = items.reduce((sum, i) => sum + (i.price * i.quantity) * ((Number(i.product?.taxPercent) || 0) / 100), 0);

  const validateSNs = () => {
    for (const i of items) {
      const sns = purchasedSNs(i.product);
      if (sns.length === 0) continue;
      if (i.quantity !== i.selectedSNs.length) {
        setFeedback({
          type: 'error',
          title: `Select ${i.quantity} SN number${i.quantity > 1 ? 's' : ''}`,
          message: `Please select ${i.quantity} of ${sns.length} serial number(s) for ${i.product?.name}.`,
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!sale) return;
    if (items.length === 0) {
      setFeedback({ type: 'error', title: 'No Replacement Items', message: 'Add at least one replacement product.' });
      return;
    }
    if (!paymentMethod) {
      setFeedback({ type: 'error', title: 'Payment Method Required', message: 'Please select a payment method.' });
      return;
    }
    if (!validateSNs()) return;

    setIsSubmitting(true);
    try {
      const expandedItems = items.flatMap((i) => {
        const selectedSNs = i.selectedSNs.length > 0 ? i.selectedSNs : purchasedSNs(i.product);
        const models = i.selectedModels.length > 0 ? i.selectedModels : [];
        if (selectedSNs.length === 0) {
          return [{
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.quantity,
            price: i.price,
            originalPrice: Number(i.product.price) || 0,
            taxPercent: Number(i.product.taxPercent) || 0,
            serialNumber: '',
            model: models[0] || '',
          }];
        }
        return selectedSNs.map((sn, idx) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: 1,
          price: i.price,
          originalPrice: Number(i.product.price) || 0,
          taxPercent: Number(i.product.taxPercent) || 0,
          serialNumber: sn,
          model: models[idx] || '',
        }));
      });

      await api.post(`/pos/sales/${sale.id}/replace?companyId=${companyId}`, {
        subscriberId: sale.subscriberId,
        subscriberName: sale.subscriberName || 'Walk-in',
        totalAmount: subtotal + tax,
        taxAmount: tax,
        discount: Number(sale.discount) || 0,
        paymentMethod,
        date: new Date().toISOString(),
        isInstallment: false,
        status: 'replaced',
        items: expandedItems,
      });

      setFeedback({
        type: 'success',
        title: 'Sale Replaced',
        message: 'The original sale has been marked as replaced with the replacement product. The original entry is now listed on the Replaced Products page.',
      });
      setItems([]);
      setPaymentMethod('');
      setSearch('');
      onSuccess();
      onClose();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        title: 'Replace Failed',
        message: error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to replace this sale.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogReset = (open: boolean) => {
    if (!open) {
      setItems([]);
      setPaymentMethod('');
      setSearch('');
      setSearchOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={!!sale} onOpenChange={dialogReset}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                <RefreshCw className="h-4 w-4" />
              </div>
              Replace Sale
            </DialogTitle>
            <DialogDescription>
              Restore the original sale to stock and record a replacement product for {sale?.subscriberName || 'this customer'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Original sale summary */}
            {sale && (
              <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{sale.subscriberName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Items (being returned)</span>
                  <span className="font-medium">
                    {sale.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Total</span>
                  <span className="font-semibold">PKR {fmtPKR(sale.totalAmount)}</span>
                </div>
              </div>
            )}

            {/* Replacement product search */}
            <div className="space-y-1" ref={productSearchRef}>
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-violet-500" />
                Replacement Product
              </Label>
              <div className="relative">
                <div className="flex items-center border rounded-md transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
                  <Search className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    className="flex-1 bg-transparent border-0 outline-none px-2 py-2 text-sm h-9"
                    placeholder="Search products by name..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                  />
                  {search && (
                    <button type="button" className="mr-2 p-0.5 rounded hover:bg-muted text-muted-foreground" onClick={() => setSearch('')}>
                      &times;
                    </button>
                  )}
                </div>
                {searchOpen && filteredProducts.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {filteredProducts.map((p) => {
                      const sns = purchasedSNs(p);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addProduct(p.id);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              PKR {fmtPKR(p.price)} &middot; Stock {p.stock}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {sns.length} SNs
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
                {searchOpen && search && filteredProducts.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
                    No products found
                  </div>
                )}
              </div>
            </div>

            {/* Replacement cart */}
            {items.length > 0 && (
              <ScrollArea className="max-h-64">
                <div className="space-y-3 pr-2">
                  {items.map((i) => {
                    const sns = purchasedSNs(i.product);
                    const models = purchasedModels(i.product);
                    return (
                      <div key={i.product.id} className="border rounded-lg p-3 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{i.product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              PKR {fmtPKR(i.product.price)} &middot; Stock {i.product.stock}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(i.product.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min={1}
                              max={i.product.stock}
                              value={i.quantity}
                              onChange={(e) => updateQuantity(i.product.id, Number(e.target.value))}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit Price</Label>
                            <Input
                              type="number"
                              min={0}
                              value={i.price}
                              onChange={(e) => updatePrice(i.product.id, Number(e.target.value))}
                              className="h-8"
                            />
                          </div>
                        </div>

                        {sns.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1.5">
                              <Hash className="h-3 w-3 text-amber-500" />
                              SN / MAC ({i.selectedSNs.length}/{i.quantity})
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {sns.slice(0, 24).map((sn) => {
                                const selected = i.selectedSNs.includes(sn);
                                const disabled = !selected && i.selectedSNs.length >= i.quantity;
                                return (
                                  <button
                                    key={sn}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggleSN(i.product.id, sn)}
                                    className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                                      selected
                                        ? 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900 dark:text-violet-200'
                                        : 'bg-background text-muted-foreground border-input hover:bg-muted'
                                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  >
                                    {sn}
                                  </button>
                                );
                              })}
                              {sns.length > 24 && (
                                <span className="text-[10px] text-muted-foreground self-center">
                                  +{sns.length - 24} more SNs available
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {sns.length === 0 && models.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs">Model</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {models.slice(0, 12).map((m) => {
                                const selected = i.selectedModels.includes(m);
                                return (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => toggleModel(i.product.id, m)}
                                    className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                                      selected
                                        ? 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900 dark:text-sky-200'
                                        : 'bg-background text-muted-foreground border-input hover:bg-muted'
                                    }`}
                                  >
                                    {m}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Totals + payment */}
            {items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>PKR {fmtPKR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>PKR {fmtPKR(tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Replacement Total</span>
                    <span>PKR {fmtPKR(subtotal + tax)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button variant="outline" onClick={() => dialogReset(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0} className="min-w-32">
              {isSubmitting ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Replacing...</>
              ) : (
                <><Plus className="mr-1.5 h-4 w-4" /> Replace Product</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionFeedbackDialog
        open={!!feedback}
        onClose={() => setFeedback(null)}
        type={feedback?.type}
        title={feedback?.title || ''}
        message={feedback?.message || ''}
      />
    </>
  );
}