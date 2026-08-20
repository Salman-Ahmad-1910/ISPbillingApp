'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { VendorInvoice, VendorInvoiceItem, Vendor, Product } from '@/lib/types';
import { Loader2, Plus, Trash2, PlusCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

function parseSerialNumbers(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

interface FormEntry {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitType: string;
  expandedItems: VendorInvoiceItem[];
}

interface VendorInvoiceFormProps {
  invoice: VendorInvoice | null;
  vendors: Vendor[];
  products: Product[];
  onSave: (data: { vendorId: string; vendorName: string; invoiceNumber: string; invoiceDate: string; totalAmount: number; batch: string; items: VendorInvoiceItem[] }) => void;
  onCancel: () => void;
  isSaving?: boolean;
  onSaveValidationError?: (message: string) => void;
}

export function VendorInvoiceForm({
  invoice,
  vendors,
  products,
  onSave,
  onCancel,
  isSaving,
  onSaveValidationError
}: VendorInvoiceFormProps) {
  const [entries, setEntries] = useState<FormEntry[]>(() => {
    if (invoice && invoice.items && invoice.items.length > 0) {
      const grouped = new Map<string, FormEntry>();
      for (const item of invoice.items) {
        const key = item.productId;
        if (grouped.has(key)) {
          const e = grouped.get(key)!;
          e.quantity += item.quantity;
          e.expandedItems.push(item);
        } else {
          grouped.set(key, {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitType: item.unitType,
            expandedItems: [item],
          });
        }
      }
      return Array.from(grouped.values());
    }
    return [{ productId: '', productName: '', quantity: 1, unitPrice: 0, unitType: 'piece', expandedItems: [] }];
  });

  const [selectedVendorId, setSelectedVendorId] = useState(invoice?.vendorId || '');
  const [vendorName, setVendorName] = useState(invoice?.vendorName || '');
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate || new Date().toISOString().split('T')[0]);
  const [batch, setBatch] = useState(invoice?.batch || '');

  const [snDialogOpen, setSnDialogOpen] = useState(false);
  const [snDialogProductId, setSnDialogProductId] = useState('');
  const [snDialogProductName, setSnDialogProductName] = useState('');
  const [snDialogRaw, setSnDialogRaw] = useState('');
  const [snDialogSaving, setSnDialogSaving] = useState(false);
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const groupedProducts = useMemo(() => {
    return products.map(p => ({
      id: p.id,
      name: p.name,
      totalSNs: parseSerialNumbers(p.serialNumber || '').length,
    }));
  }, [products]);

  useEffect(() => {
    if (selectedVendorId) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) setVendorName(vendor.name);
    }
  }, [selectedVendorId, vendors]);

  const openAddSNs = (productId: string, productName: string) => {
    setSnDialogProductId(productId);
    setSnDialogProductName(productName);
    setSnDialogRaw('');
    setSnDialogOpen(true);
  };

  const handleAddSNs = async () => {
    if (!snDialogProductId || !companyId) return;
    const newSNs = parseSerialNumbers(snDialogRaw);
    if (newSNs.length === 0) return;
    setSnDialogSaving(true);
    try {
      const product = products.find(p => p.id === snDialogProductId);
      if (!product) return;
      const existing = parseSerialNumbers(product.serialNumber || '');
      const combined = [...existing, ...newSNs].join(', ');
      const newStock = existing.length + newSNs.length;
      await api.put(`/inventory/products/${snDialogProductId}`, {
        name: product.name,
        category: product.category,
        price: product.price,
        stock: newStock,
        unitType: product.unitType,
        taxPercent: product.taxPercent ?? 0,
        image: product.image ?? '',
        barcode: product.barcode ?? '',
        salePrice: product.salePrice ?? 0,
        purchasePrice: product.purchasePrice ?? 0,
        discount: product.discount ?? 0,
        brandId: product.brandId ?? '',
        brandName: product.brandName ?? '',
        productTypeId: product.productTypeId ?? '',
        productTypeName: product.productTypeName ?? '',
        serialNumber: combined,
        currentSerialIndex: product.currentSerialIndex ?? 0,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
      toast({ title: 'Success', description: `${newSNs.length} serial number(s) added to ${snDialogProductName}` });
      setSnDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to add serial numbers',
      });
    } finally {
      setSnDialogSaving(false);
    }
  };

  const getAvailableSNs = useCallback((productId: string, excludeEntryIndex: number): string[] => {
    const product = products.find(p => p.id === productId);
    if (!product) return [];
    const allSNs = parseSerialNumbers(product.serialNumber || '');
    const usedByOthers = new Set<string>();
    entries.forEach((entry, i) => {
      if (i === excludeEntryIndex) return;
      if (entry.productId === productId) {
        entry.expandedItems.forEach(item => {
          if (item.serialNumber) parseSerialNumbers(item.serialNumber).forEach(sn => usedByOthers.add(sn));
        });
      }
    });
    return allSNs.filter(sn => !usedByOthers.has(sn));
  }, [products, entries]);

  const findProductIdForSN = useCallback((productName: string, sn: string): string => {
    const match = products.find(p => p.name === productName && parseSerialNumbers(p.serialNumber || '').includes(sn));
    return match?.id || '';
  }, [products]);

  const updateEntry = (index: number, field: keyof FormEntry, value: any) => {
    const updated = [...entries];

    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (!product) return;
      const unitPrice = product.purchasePrice || product.price;
      const usedByOthers = new Set<string>();
      entries.forEach((entry, i) => {
        if (i === index) return;
        if (entry.productId === value) {
          entry.expandedItems.forEach(item => {
            if (item.serialNumber) parseSerialNumbers(item.serialNumber).forEach(sn => usedByOthers.add(sn));
          });
        }
      });
      const allSNs = parseSerialNumbers(product.serialNumber || '');
      const availableSNs = allSNs.filter(sn => !usedByOthers.has(sn));
      const maxQty = availableSNs.length;
      const qty = Math.min(updated[index].quantity || 1, maxQty || 1);
      const selectedSNs = availableSNs.slice(0, qty);
      const snString = selectedSNs.join(', ');
      updated[index] = {
        ...updated[index],
        productId: value,
        productName: product.name,
        unitType: product.unitType,
        unitPrice,
        quantity: qty,
        expandedItems: [{
          productId: value,
          productName: product.name,
          quantity: qty,
          unitPrice,
          unitType: product.unitType,
          subtotal: unitPrice * qty,
          serialNumber: snString,
        }],
      };
    } else if (field === 'quantity') {
      const productId = updated[index].productId;
      if (!productId) return;
      const availableSNs = getAvailableSNs(productId, index);
      const maxQty = availableSNs.length;
      const qty = Math.max(1, Math.min(Number(value) || 1, maxQty));
      const unitPrice = updated[index].unitPrice;
      const snString = availableSNs.slice(0, qty).join(', ');
      updated[index] = {
        ...updated[index],
        quantity: qty,
        expandedItems: [{
          productId,
          productName: updated[index].productName,
          quantity: qty,
          unitPrice,
          unitType: updated[index].unitType,
          subtotal: unitPrice * qty,
          serialNumber: snString,
        }],
      };
    } else if (field === 'unitPrice') {
      updated[index] = {
        ...updated[index],
        unitPrice: value,
        expandedItems: updated[index].expandedItems.map(item => ({
          ...item,
          unitPrice: value,
          subtotal: value * item.quantity,
        })),
      };
    }

    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, { productId: '', productName: '', quantity: 1, unitPrice: 0, unitType: 'piece', expandedItems: [] }]);
  };

  const removeEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    if (updated.length === 0) {
      updated.push({ productId: '', productName: '', quantity: 1, unitPrice: 0, unitType: 'piece', expandedItems: [] });
    }
    setEntries(updated);
  };

  const totalAmount = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.expandedItems.reduce((s, item) => s + item.subtotal, 0), 0);
  }, [entries]);

  function handleSubmit() {
    const allItems: VendorInvoiceItem[] = [];
    for (const entry of entries) {
      if (!entry.productId) continue;
      for (const item of entry.expandedItems) {
        allItems.push(item);
      }
    }
    if (allItems.length === 0) {
      onSaveValidationError?.('Please add at least one product with a valid quantity.');
      return;
    }
    onSave({
      vendorId: selectedVendorId,
      vendorName,
      invoiceNumber: invoice?.invoiceNumber || '',
      invoiceDate,
      totalAmount,
      batch,
      items: allItems,
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Vendor *</Label>
          <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Buying Date *</Label>
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Batch</Label>
        <Input placeholder="e.g., BATCH-001" value={batch} onChange={(e) => setBatch(e.target.value)} />
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Details</p>
          <Button type="button" variant="outline" size="sm" onClick={addEntry}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {entries.map((entry, index) => {
          const availableSNs = entry.productId ? getAvailableSNs(entry.productId, index) : [];
          const totalSNs = entry.productId
            ? parseSerialNumbers(products.find(p => p.id === entry.productId)?.serialNumber || '').length
            : 0;
          const maxQty = availableSNs.length;

          return (
            <div key={index} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  #{index + 1}
                  {entry.expandedItems.length > 0 && entry.expandedItems[0].serialNumber && (
                    <span className="ml-2 font-mono text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                      {(() => {
                        const sns = parseSerialNumbers(entry.expandedItems[0].serialNumber);
                        if (sns.length === 0) return '';
                        if (sns.length === 1) return `SN: ${sns[0]}`;
                        return `${sns[0]} (1/${sns.length})`;
                      })()}
                    </span>
                  )}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeEntry(index)}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label className="text-sm">Product *</Label>
                <div className="flex gap-2">
                  <Select
                    value={entry.productId || undefined}
                    onValueChange={(value) => updateEntry(index, 'productId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                    {groupedProducts.map((gp) => (
                      <SelectItem key={gp.id} value={gp.id}>
                        {gp.name}{gp.totalSNs > 0 ? ` (${gp.totalSNs} SNs)` : ''}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                  {entry.productId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openAddSNs(entry.productId, entry.productName)}
                      title="Add more serial numbers"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Unit Type</Label>
                  <Input
                    readOnly
                    value={entry.unitType === 'piece' ? 'Per Piece' : entry.unitType === 'meter' ? 'Per Meter' : entry.unitType || '—'}
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label className="text-sm">
                    Quantity * {maxQty > 0 && <span className="text-muted-foreground font-normal">(max {maxQty})</span>}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max={maxQty || undefined}
                    value={entry.quantity}
                    onChange={(e) => updateEntry(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                  {entry.productId && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {totalSNs > 0
                        ? `${entry.quantity} of ${totalSNs} SNs will be consumed`
                        : 'No SNs on this product'
                      }
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Unit Price *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.unitPrice}
                    onChange={(e) => updateEntry(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    placeholder={entry.productId ? "Auto from product" : "Select product first"}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Subtotal</Label>
                  <div className="text-sm font-semibold">PKR {entry.expandedItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2)}</div>
                </div>
                {entry.expandedItems.length > 0 && entry.expandedItems[0].serialNumber && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {entry.expandedItems[0].serialNumber}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-right border-t pt-4">
        <div className="text-lg font-medium">
          Total Amount: PKR {totalAmount.toFixed(2)}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" disabled={isSaving} onClick={handleSubmit} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Dialog open={snDialogOpen} onOpenChange={setSnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Serial Numbers
            </DialogTitle>
            <DialogDescription>
              Add new serial numbers to <strong>{snDialogProductName}</strong>. Separate each one with a comma or space.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="e.g., SN-1001 SN-1002 SN-1003"
              value={snDialogRaw}
              onChange={(e) => setSnDialogRaw(e.target.value)}
              className="min-h-[100px] font-mono"
            />
            {parseSerialNumbers(snDialogRaw).length > 0 && (
              <p className="text-xs text-muted-foreground">
                {parseSerialNumbers(snDialogRaw).length} serial number(s) will be added
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSnDialogOpen(false)} disabled={snDialogSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSNs}
                disabled={snDialogSaving || parseSerialNumbers(snDialogRaw).length === 0}
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:from-violet-600 hover:to-purple-700"
              >
                {snDialogSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {snDialogSaving ? 'Adding...' : `Add ${parseSerialNumbers(snDialogRaw).length || ''} SN(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
