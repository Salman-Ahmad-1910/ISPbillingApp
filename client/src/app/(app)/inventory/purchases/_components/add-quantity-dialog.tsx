'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Purchase } from '@/lib/types';

function parseSerialNumbers(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(/[\s,\-]+/).map(s => s.trim()).filter(Boolean);
}

function parseModels(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(/[\s,\n\r\t,]+/).map(s => s.trim()).filter(Boolean);
}

export interface AddQuantityPayload {
  productId: string;
  quantity: number;
  serialNumber: string;
  model: string;
  noSerialNumber: boolean;
}

interface AddQuantityDialogProps {
  purchase: Purchase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: AddQuantityPayload) => void;
  isSaving?: boolean;
}

export function AddQuantityDialog({
  purchase,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: AddQuantityDialogProps) {
  const items = purchase?.items || [];

  const [selectedProductId, setSelectedProductId] = useState('');
  const [noSerialNumber, setNoSerialNumber] = useState(false);
  const [noModel, setNoModel] = useState(false);
  const [snRaw, setSnRaw] = useState('');
  const [modelRaw, setModelRaw] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (open && purchase) {
      setSelectedProductId(purchase.items?.[0]?.productId || '');
      setNoSerialNumber(false);
      setNoModel(false);
      setSnRaw('');
      setModelRaw('');
      setQuantity('1');
    }
  }, [open, purchase]);

  const selectedItem = items.find(i => i.productId === selectedProductId);

  const parsedSNs = useMemo(() => parseSerialNumbers(snRaw), [snRaw]);
  const parsedModels = useMemo(() => parseModels(modelRaw), [modelRaw]);
  const snCount = parsedSNs.length;
  const modelCount = parsedModels.length;

  // SNs and models are paired per unit. When serial numbers are being added the
  // quantity follows the SN count; otherwise, when only models are added, it
  // follows the model count. When neither is being added, the manual quantity
  // field is used.
  let effectiveQuantity = 0;
  let derived = false;
  if (!noSerialNumber && snCount > 0) {
    effectiveQuantity = snCount;
    derived = true;
  } else if (!noModel && modelCount > 0) {
    effectiveQuantity = modelCount;
    derived = true;
  } else if (noSerialNumber && noModel) {
    effectiveQuantity = Math.max(1, Number(quantity) || 1);
  }

  const canSave = !!selectedProductId && effectiveQuantity >= 1;

  const existingSNs = useMemo(
    () => parseSerialNumbers(selectedItem?.serialNumber || ''),
    [selectedItem]
  );
  const existingModels = useMemo(
    () => parseModels(selectedItem?.model || ''),
    [selectedItem]
  );

  const handleSave = () => {
    if (!selectedProductId) return;
    onSave({
      productId: selectedProductId,
      quantity: effectiveQuantity,
      serialNumber: noSerialNumber ? '' : snRaw,
      model: noModel ? '' : modelRaw,
      noSerialNumber,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-1.5 text-white shadow-sm">
              <PackagePlus className="h-4 w-4" />
            </div>
            <span>Add Quantity</span>
          </DialogTitle>
          <DialogDescription>
            Add more quantity, serial (SN) / model numbers to{' '}
            <strong>{purchase?.purchaseNumber}</strong>. Stock and POS will update
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              This purchase has no items to add quantity to.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product / Model</label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map(item => (
                      <SelectItem key={item.id || item.productId} value={item.productId}>
                        {item.productName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                  <p className="text-sm font-medium">{selectedItem.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Current quantity:{' '}
                    <span className="font-semibold text-foreground">{selectedItem.quantityEntered || selectedItem.quantity}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current SN / model:{' '}
                    {existingSNs.length > 0 || existingModels.length > 0 ? (
                      <span className="font-mono">
                        {existingSNs.slice(0, 2).join(', ')}
                        {existingSNs.length > 2 ? ` (+${existingSNs.length - 2} more)` : ''}
                        {existingModels.length > 0 ? ` · ${existingModels.slice(0, 2).join(', ')}` : ''}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="addQtyNoSn"
                    checked={noSerialNumber}
                    onCheckedChange={(checked) => {
                      const val = !!checked;
                      setNoSerialNumber(val);
                      if (val) setSnRaw('');
                    }}
                  />
                  <label htmlFor="addQtyNoSn" className="text-sm font-medium leading-none cursor-pointer">
                    Add without serial numbers
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="addQtyNoModel"
                    checked={noModel}
                    onCheckedChange={(checked) => {
                      const val = !!checked;
                      setNoModel(val);
                      if (val) setModelRaw('');
                    }}
                  />
                  <label htmlFor="addQtyNoModel" className="text-sm font-medium leading-none cursor-pointer">
                    Add without model numbers
                  </label>
                </div>
              </div>

              {!noSerialNumber && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">SN / Model Numbers</label>
                  <Textarea
                    placeholder="e.g., SN-1001 SN-1002 SN-1003"
                    value={snRaw}
                    onChange={(e) => setSnRaw(e.target.value)}
                    className="min-h-[80px] font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate with comma, space, or dash. Each SN adds one unit of quantity.
                  </p>
                  {snCount > 0 && (
                    <p className="text-xs font-medium text-emerald-600">
                      {snCount} SN(s) → +{snCount} quantity
                    </p>
                  )}
                </div>
              )}

              {!noModel && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model Numbers</label>
                  <Textarea
                    placeholder="e.g., Model-X Model-Y"
                    value={modelRaw}
                    onChange={(e) => setModelRaw(e.target.value)}
                    className="min-h-[80px] font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Paired with SNs by order. Separate with comma, space, or new line.
                  </p>
                  {modelCount > 0 && (
                    <p className="text-xs font-medium text-emerald-600">
                      {modelCount} model(s){snCount > 0 ? ' (paired)' : ` → +${modelCount} quantity`}
                    </p>
                  )}
                </div>
              )}

              {(noSerialNumber && noModel) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adds this many units without serial numbers / model numbers.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !canSave || items.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Adding...' : `Add ${effectiveQuantity || ''} Quantity`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}