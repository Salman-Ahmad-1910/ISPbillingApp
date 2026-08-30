'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

import { PlusCircle, Trash2, CreditCard, Landmark, CircleDollarSign, Loader2, ShoppingCart, Search, Users, UserRound, Handshake, CalendarDays, Receipt, MoreVertical, Hash, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Product, InstallmentPlan, SubscriberInstallment } from '@/lib/types';
import { backendImageUrl } from '@/lib/utils';

import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { smartMatch, prefixMatch } from '@/lib/search';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SerialEntriesTable } from '@/components/shared/serial-entries';

interface CartItem {
    product: Product;
    quantity: number;
    selectedSNs: string[];
}

// SNs available for selling come from the purchase item (what was bought and
// not yet sold), falling back to the product list for legacy data.
function purchasedSNs(product: any): string[] {
    return String(product?.serialNumber || product?.productSerialNumber || '')
        .split(/[\s,\-]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
}

interface DropdownItem {
    id: string;
    name: string;
    secondary?: string;
}

function SearchableDropdown({
    label,
    icon: Icon,
    items,
    selectedId,
    onSelect,
    placeholder,
    color,
}: {
    label: string;
    icon: React.ElementType;
    items: DropdownItem[];
    selectedId?: string;
    onSelect: (id: string) => void;
    placeholder: string;
    color: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = items.find(i => i.id === selectedId);

    const filtered = useMemo(() => {
        if (!query) return items;
        return items.filter(i =>
            smartMatch(query, [i.id], [i.name, i.secondary])
        );
    }, [items, query]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="space-y-1" ref={ref}>
            <Label className="text-xs font-medium flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {label}
                {selected && <span className="text-muted-foreground font-normal ml-1">({selected.name})</span>}
            </Label>
            <div className="relative">
                <div
                    className={`flex items-center border rounded-md transition-colors hover:border-foreground/30 ${open ? 'ring-2 ring-ring ring-offset-1' : ''}`}
                >
                    <Search className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                        className="flex-1 bg-transparent border-0 outline-none px-2 py-2 text-sm h-9"
                        placeholder={placeholder}
                        value={selected && !open ? selected.name : query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                    />
                    {selected && (
                        <button
                            type="button"
                            className="mr-2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onSelect('');
                                setQuery('');
                                setOpen(false);
                            }}
                        >
                            &times;
                        </button>
                    )}
                </div>
                {open && filtered.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
                        {filtered.map((item) => (
                            <div
                                key={item.id}
                                className={`flex flex-col px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm ${selectedId === item.id ? 'bg-accent font-medium' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect(item.id);
                                    setQuery('');
                                    setOpen(false);
                                }}
                            >
                                <span className="font-medium">{item.name}</span>
                                {item.secondary && (
                                    <span className="text-xs text-muted-foreground">{item.secondary}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {open && query && filtered.length === 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
                        No results found
                    </div>
                )}
            </div>
        </div>
    );
}

// Multi-select dropdown that lets the cashier pick which SN / MAC numbers of a
// product are being sold. Each SN has its own checkbox, and the number of
// checked entries cannot exceed the quantity being sold.
function SNSSelect({
    idPrefix,
    sns,
    quantity,
    selected,
    onChange,
}: {
    idPrefix: string;
    sns: string[];
    quantity: number;
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (sns.length === 0) {
        return null;
    }

    const selectedSet = new Set(selected);
    const toggle = (sn: string) => {
        if (selectedSet.has(sn)) {
            onChange(selected.filter(s => s !== sn));
        } else {
            if (selected.length >= quantity) return;
            onChange([...selected, sn]);
        }
    };

    return (
        <div className="space-y-1" ref={ref}>
            <Label className="text-xs font-medium flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-amber-500" />
                SN / MAC
                <span className={`font-normal ml-1 ${selected.length === quantity ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    ({selected.length}/{quantity})
                </span>
            </Label>
            <div className="relative">
                <div
                    className={`flex items-center justify-between gap-2 border rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors hover:border-foreground/30 ${open ? 'ring-2 ring-ring ring-offset-1' : ''}`}
                    onClick={() => setOpen(o => !o)}
                >
                    <span className={`truncate ${selected.length === 0 ? 'text-muted-foreground' : 'font-mono text-xs'}`}>
                        {selected.length === 0 ? 'Select SN numbers...' : selected.join(', ')}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
                {open && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {sns.map(sn => {
                            const checked = selectedSet.has(sn);
                            const disabled = !checked && selected.length >= quantity;
                            const id = `sn-${idPrefix}-${sn}`;
                            return (
                                <label
                                    key={sn}
                                    htmlFor={id}
                                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'}`}
                                >
                                    <Checkbox
                                        id={id}
                                        checked={checked}
                                        disabled={disabled}
                                        onCheckedChange={() => toggle(sn)}
                                    />
                                    <span className="font-mono text-xs truncate">{sn}</span>
                                </label>
                            );
                        })}
                        {quantity > 0 && selected.length === quantity && (
                            <div className="px-3 py-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 border-t">
                                All selected — uncheck to change
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function POSPage() {
    const { companyId, companies } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: purchasedProducts = [] } = useGenericQuery<any>('inventory/purchased-products', companyId ?? undefined);
    const { data: customersData = [] } = useGenericQuery<any>('crm/customers', companyId ?? undefined);
    const { data: dealersData = [] } = useGenericQuery<any>('dealers', companyId ?? undefined);
    const { data: subscribersData = [] } = useGenericQuery<any>('admin/connections', companyId ?? undefined);
    const { data: installmentPlans = [] } = useGenericQuery<InstallmentPlan>(
        'sales/installment-plans',
        companyId ?? undefined,
    );

    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerId, setCustomerId] = useState<string>('');
    const [customerType, setCustomerType] = useState<'subscriber' | 'customer' | 'dealer' | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | null>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [discount, setDiscount] = useState(0);

    const [showSubscriber, setShowSubscriber] = useState(false);
    const [showCustomer, setShowCustomer] = useState(false);
    const [showDealer, setShowDealer] = useState(false);

    const [isInstallment, setIsInstallment] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [existingInstallment, setExistingInstallment] = useState<SubscriberInstallment | null>(null);
    const [fetchingInstallment, setFetchingInstallment] = useState(false);
    const [pendingSaleItems, setPendingSaleItems] = useState<any[]>([]);
    const [productToDelete, setProductToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [snEntriesProduct, setSnEntriesProduct] = useState<Product | null>(null);

    const confirmDeleteProduct = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/inventory/products/${productToDelete.id}?companyId=${companyId}`);
            queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
            queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
            toast({ title: 'Product deleted', description: `${productToDelete.name} has been removed.` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Delete failed', description: err?.response?.data?.message || 'Could not delete product.' });
        } finally {
            setIsDeleting(false);
            setProductToDelete(null);
        }
    };

    const customerList = useMemo(() => {
        if (!Array.isArray(customersData)) return [];
        return customersData.map((c: any): DropdownItem => ({ id: c.id, name: c.name }));
    }, [customersData]);

    const subscriberList = useMemo(() => {
        if (!Array.isArray(subscribersData)) return [];
        return subscribersData.map((s: any): DropdownItem => ({
            id: s.id,
            name: `${s.id?.slice(0, 8)} | ${s.name}`,
            secondary: s.phone || s.cell || '',
        }));
    }, [subscribersData]);

    const dealerList = useMemo(() => {
        if (!Array.isArray(dealersData)) return [];
        return dealersData.map((d: any): DropdownItem => ({ id: d.id, name: d.name }));
    }, [dealersData]);

    const planList = useMemo(() => {
        if (!Array.isArray(installmentPlans)) return [];
        return installmentPlans.map((p: InstallmentPlan): DropdownItem => ({
            id: p.id,
            name: `${p.name} (${p.installments} installments, +${p.percentageIncrease}%)`,
        }));
    }, [installmentPlans]);

    const selectedPlan = useMemo(() => {
        if (!selectedPlanId || !Array.isArray(installmentPlans)) return null;
        return installmentPlans.find((p: InstallmentPlan) => p.id === selectedPlanId) || null;
    }, [selectedPlanId, installmentPlans]);

    useEffect(() => {
        if (customerId && companyId) {
            setFetchingInstallment(true);
            api.get(`/pos/installment/${customerId}?companyId=${companyId}`)
                .then(res => {
                    const payload = res.data?.data || res.data;
                    const inst = payload?.installment || payload;
                    if (inst && inst.id) {
                        if (!inst.installmentAmount || Number(inst.installmentAmount) === 0) {
                            inst.installmentAmount = (Number(inst.totalAmount) || 0) / (Number(inst.totalInstallments) || 1);
                        }
                        setExistingInstallment(inst);
                        setIsInstallment(true);
                        setSelectedPlanId(inst.installmentPlanId);
                        setPendingSaleItems(payload?.saleItems || []);
                    } else {
                        setExistingInstallment(null);
                        setPendingSaleItems([]);
                    }
                })
                .catch(() => {
                    setExistingInstallment(null);
                    setPendingSaleItems([]);
                })
                .finally(() => setFetchingInstallment(false));
        } else {
            setExistingInstallment(null);
            setPendingSaleItems([]);
        }
    }, [customerId, companyId]);

    const handleCheckboxChange = (type: 'subscriber' | 'customer' | 'dealer', checked: boolean) => {
        if (checked) {
            setCustomerType(type);
            setCustomerId('');
            if (type === 'subscriber') { setShowSubscriber(true); setShowCustomer(false); setShowDealer(false); }
            if (type === 'customer') { setShowCustomer(true); setShowSubscriber(false); setShowDealer(false); }
            if (type === 'dealer') { setShowDealer(true); setShowSubscriber(false); setShowCustomer(false); }
        } else {
            if (customerType === type) {
                setCustomerType('');
                setCustomerId('');
            }
            if (type === 'subscriber') setShowSubscriber(false);
            if (type === 'customer') setShowCustomer(false);
            if (type === 'dealer') setShowDealer(false);
        }
    };

    const handleSelectCustomer = (id: string) => {
        setCustomerId(id);
        setIsInstallment(false);
        setSelectedPlanId('');
        setExistingInstallment(null);
        if (!id) {
            setCustomerType('');
            if (customerType === 'subscriber') setShowSubscriber(false);
            if (customerType === 'customer') setShowCustomer(false);
            if (customerType === 'dealer') setShowDealer(false);
        }
    };

    const selectedName = useMemo(() => {
        if (!customerId || !customerType) return '';
        if (customerType === 'subscriber') return (Array.isArray(subscribersData) ? subscribersData.find((s: any) => s.id === customerId)?.name : '') || '';
        if (customerType === 'customer') return customerList.find(c => c.id === customerId)?.name || '';
        if (customerType === 'dealer') return dealerList.find(d => d.id === customerId)?.name || '';
        return '';
    }, [customerId, customerType, subscribersData, customerList, dealerList]);

    const posProducts = useMemo(() => {
        if (!purchasedProducts) return [];
        const mergeSNField = (a: any, b: any) =>
            [String(a || '').trim(), String(b || '').trim()].filter(Boolean).join(', ');
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
                // Merge SN lists from all purchase lines so the displayed SN
                // count always equals the stock.
                serialNumber: mergeSNField(existing.serialNumber, normalized.serialNumber),
                productSerialNumber: mergeSNField(existing.productSerialNumber, normalized.productSerialNumber),
                image: existing.image || normalized.image,
            });
        }
        return Array.from(byId.values());
    }, [purchasedProducts]);

    const filteredProducts = useMemo(() => {
        return posProducts.filter(p => prefixMatch(searchTerm, p.name));
    }, [posProducts, searchTerm]);

    // Populate cart with original sale items when existing installment is found and products load
    useEffect(() => {
        if (existingInstallment && pendingSaleItems.length > 0 && posProducts.length > 0) {
            const items: CartItem[] = pendingSaleItems.map((si: any) => {
                const product = posProducts.find(p => p.id === si.productId);
                return {
                    product: product || {
                        id: si.productId,
                        purchaseItemId: si.productId,
                        name: si.productName,
                        price: si.price,
                        stock: 0,
                        image: '',
                        taxPercent: si.taxPercent || 0,
                    },
                    quantity: si.quantity,
                    selectedSNs: String(si.serialNumber || '')
                        .split(/[\s,\-]+/)
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                };
            }).filter((ci: CartItem) => ci.product);
            setCart(items);
            setPendingSaleItems([]);
        }
    }, [existingInstallment?.id, pendingSaleItems.length, posProducts.length]);

    const addToCart = (productId: string) => {
        const product = posProducts.find(p => p.id === productId);
        if (!product || product.stock === 0) {
            toast({
                variant: 'destructive',
                title: 'Out of Stock',
                description: `${product?.name} is currently out of stock.`,
            });
            return;
        }

        setCart(currentCart => {
            const existingItem = currentCart.find(item => item.product.id === productId);
            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    toast({
                        variant: 'destructive',
                        title: 'Stock Limit Reached',
                        description: `You cannot add more of ${product.name}.`,
                    });
                    return currentCart;
                }
                return currentCart.map(item => item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...currentCart, { product, quantity: 1, selectedSNs: [] }];
        });
    }

    const removeFromCart = (productId: string) => {
        setCart(currentCart => currentCart.filter(item => item.product.id !== productId));
    }

    const updateCartQuantity = (productId: string, quantity: number) => {
        const product = posProducts.find(p => p.id === productId);
        if (!product) return;

        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        if (quantity > product.stock) {
            toast({
                variant: 'destructive',
                title: 'Stock Limit Exceeded',
                description: `Only ${product.stock} units of ${product.name} available.`,
            });
            quantity = product.stock;
        }

        setCart(currentCart => currentCart.map(item => {
            if (item.product.id !== productId) return item;
            // Keep at most `quantity` selected SNs when the quantity shrinks.
            const selectedSNs = item.selectedSNs.length > quantity ? item.selectedSNs.slice(0, quantity) : item.selectedSNs;
            return { ...item, quantity, selectedSNs };
        }));
    }

    const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const tax = cart.reduce(
      (acc, item) => acc + (item.product.price * item.quantity) * ((Number(item.product.taxPercent) || 0) / 100),
      0
    );

    // The active company's POS discount settings cap how much the cashier can
    // discount. The limit is a percentage of the selling-price total; when the
    // unlimited checkbox is on, the full selling-price total is the cap.
    const activeCompany = companies.find(c => c.id === companyId);
    const posDiscountPercent = activeCompany?.posDiscountPercent ?? 0;
    const posDiscountUnlimited = !!activeCompany?.posDiscountUnlimited;
    const maxDiscount = useMemo(() => {
      if (posDiscountUnlimited) return subtotal;
      return Math.round((subtotal * posDiscountPercent) / 100);
    }, [subtotal, posDiscountPercent, posDiscountUnlimited]);

    useEffect(() => {
      if (discount > maxDiscount) setDiscount(maxDiscount);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxDiscount]);

    const percentageIncrease = useMemo(() => {
        if (!isInstallment) return 0;
        const plan = existingInstallment
            ? installmentPlans.find((p: InstallmentPlan) => p.id === existingInstallment.installmentPlanId)
            : selectedPlan;
        return plan ? (Number(plan.percentageIncrease) || 0) : 0;
    }, [isInstallment, existingInstallment, selectedPlan, installmentPlans]);

    const increaseAmount = subtotal * (percentageIncrease / 100);
    const adjustedSubtotal = subtotal + increaseAmount;
    const total = adjustedSubtotal + tax - discount;

    const handleInstallmentToggle = (checked: boolean) => {
        setIsInstallment(!!checked);
        if (!checked) {
            setSelectedPlanId('');
            setExistingInstallment(null);
        }
    };

    const installmentDetails = useMemo(() => {
        if (!isInstallment) return null;

        // For existing installments, use stored data directly (plan may not be in list)
        if (existingInstallment) {
            const paid = existingInstallment.paidInstallments || 0;
            const total = existingInstallment.totalInstallments || 0;
            const remaining = total - paid;
            const totalAmount = Number(existingInstallment.totalAmount) || 0;
            const instAmount = Number(existingInstallment.installmentAmount) || (totalAmount / (total || 1));
            return {
                planName: existingInstallment.planName || 'Installment Plan',
                amountPerInstallment: instAmount,
                totalInstallments: total,
                paidInstallments: paid,
                remainingInstallments: remaining,
                paidMoney: paid * instAmount,
                remainingMoney: remaining * instAmount,
                totalWithIncrease: totalAmount,
            };
        }

        if (selectedPlan) {
            const pct = Number(selectedPlan.percentageIncrease) || 0;
            const totalWithIncrease = subtotal * (1 + pct / 100);
            const amountPerInstallment = selectedPlan.installments > 0 ? totalWithIncrease / selectedPlan.installments : 0;
            return {
                planName: selectedPlan.name,
                amountPerInstallment,
                totalInstallments: selectedPlan.installments || 0,
                paidInstallments: 0,
                remainingInstallments: selectedPlan.installments || 0,
                paidMoney: 0,
                remainingMoney: totalWithIncrease,
                totalWithIncrease,
            };
        }

        return null;
    }, [isInstallment, existingInstallment, selectedPlan, subtotal, installmentPlans]);

    // Build the expanded sale items: products with SNs send one sale item per
    // selected SN (quantity 1 each), while serial-less products send a single
    // quantity-based line. This matches what the POS backend consumes.
    const buildExpandedItems = (item: CartItem) => {
        const sns = item.selectedSNs.length > 0 ? item.selectedSNs : purchasedSNs(item.product);
        if (sns.length === 0) {
            return [{
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                taxPercent: Number(item.product.taxPercent) || 0,
                serialNumber: '',
            }];
        }
        return sns.map(sn => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: 1,
            price: item.product.price,
            taxPercent: Number(item.product.taxPercent) || 0,
            serialNumber: sn,
        }));
    };

    // A product with serial numbers must have exactly `quantity` SNs checked
    // before the bill can be completed or held.
    const validateSelectedSNs = () => {
        for (const item of cart) {
            const sns = purchasedSNs(item.product);
            if (sns.length === 0) continue;
            if (item.quantity !== item.selectedSNs.length) {
                toast({
                    variant: 'destructive',
                    title: `Select ${item.quantity} SN number${item.quantity > 1 ? 's' : ''}`,
                    description: `Please select ${item.quantity} of ${sns.length} serial number(s) for ${item.product.name} in the order.`,
                });
                return false;
            }
        }
        return true;
    };

    const handleCompletePayment = async () => {
        if (!customerId) {
            toast({ variant: 'destructive', title: 'Customer not selected', description: 'Please select a customer to proceed.' });
            return;
        }
        if (!paymentMethod) {
            toast({ variant: 'destructive', title: 'Payment method not selected', description: 'Please select a payment method.' });
            return;
        }

        if (!validateSelectedSNs()) {
            return;
        }

        setIsProcessing(true);
        try {
            const expandedItems = cart.flatMap(item => buildExpandedItems(item));

            if (isInstallment && selectedPlanId && !existingInstallment) {
                await api.post(`/pos/installment-sales?companyId=${companyId}`, {
                    subscriberId: customerId,
                    subscriberName: selectedName || 'Unknown',
                    installmentPlanId: selectedPlanId,
                    subtotal,
                    taxAmount: tax,
                    discount,
                    paymentMethod: paymentMethod,
                    date: new Date().toISOString(),
                    companyId: companyId!,
                    items: expandedItems,
                });
            } else if (isInstallment && existingInstallment) {
                await handlePayNextInstallment();
                return;
            } else {
                await api.post(`/pos/sales?companyId=${companyId}`, {
                    subscriberId: customerId,
                    subscriberName: selectedName || 'Unknown',
                    totalAmount: total,
                    taxAmount: tax,
                    discount,
                    paymentMethod: paymentMethod,
                    date: new Date().toISOString(),
                    companyId: companyId!,
                    items: expandedItems,
                });
            }

            queryClient.invalidateQueries({ queryKey: ['pos/sales'] });
            queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
            queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });
            queryClient.invalidateQueries({ queryKey: ['billing/payments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });

            toast({
                title: isInstallment ? 'Installment Sale Created!' : 'Sale Completed!',
                description: isInstallment ? 'First installment has been paid.' : 'The transaction has been recorded successfully.',
            });

            setCart([]);
            setCustomerId('');
            setCustomerType('');
            setShowSubscriber(false);
            setShowCustomer(false);
            setShowDealer(false);
            setIsInstallment(false);
            setSelectedPlanId('');
            setExistingInstallment(null);
            setDiscount(0);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || error.response?.data?.error || 'Failed to process sale',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleHoldBill = async () => {
        if (!customerId) {
            toast({
                variant: 'destructive',
                title: 'Customer not selected',
                description: 'Please select a customer to hold a bill.',
            });
            return;
        }

        if (!validateSelectedSNs()) {
            return;
        }

        setIsProcessing(true);
        try {
            const holdItems = cart.flatMap(item => buildExpandedItems(item));
            await api.post(`/pos/sales?companyId=${companyId}`, {
                subscriberId: customerId,
                subscriberName: selectedName || 'Unknown',
                totalAmount: total,
                taxAmount: tax,
                paymentMethod: 'hold',
                date: new Date().toISOString(),
                companyId: companyId!,
                status: 'hold',
                discount,
                items: holdItems,
            });

            queryClient.invalidateQueries({ queryKey: ['pos/sales'] });
            queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });
            queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });

            toast({
                title: 'Bill On Hold',
                description: 'This bill has been held and can be paid later.',
            });

            setCart([]);
            setCustomerId('');
            setCustomerType('');
            setShowSubscriber(false);
            setShowCustomer(false);
            setShowDealer(false);
            setIsInstallment(false);
            setSelectedPlanId('');
            setExistingInstallment(null);
            setDiscount(0);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || error.response?.data?.error || 'Failed to hold bill',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePayNextInstallment = async () => {
        if (!existingInstallment || !customerId) return;
        const payAmount = Number(existingInstallment.installmentAmount) || (Number(existingInstallment.totalAmount) / Number(existingInstallment.totalInstallments)) || 0;
        if (payAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Installment amount is zero.' });
            return;
        }

        setIsProcessing(true);
        try {
            await api.put(`/pos/installment/${existingInstallment.id}/pay?companyId=${companyId}`, {
                amount: payAmount,
                date: new Date().toISOString(),
                method: paymentMethod || 'cash',
            });

            // Refresh installment data
            const res = await api.get(`/pos/installment/${customerId}?companyId=${companyId}`);
            const payload = res.data?.data || res.data;
            const inst = payload?.installment || payload;
            if (inst && inst.id) {
                setExistingInstallment(inst);
            } else {
                setExistingInstallment(null);
                setIsInstallment(false);
            }

            queryClient.invalidateQueries({ queryKey: ['pos/sales'] });
            queryClient.invalidateQueries({ queryKey: ['billing/payments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });

            toast({
                title: 'Installment Paid!',
                description: `PKR ${payAmount.toLocaleString()} paid. Next installment: #${(existingInstallment.paidInstallments || 0) + 1}`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Payment Failed',
                description: error.response?.data?.message || error.response?.data?.error || 'Failed to record installment payment',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
                    <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Point of Sale (POS)</h1>
                    <p className="text-sm text-muted-foreground">A retail counter for quick billing, recharges, and device sales.</p>
                </div>
            </div>

            <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card className="transition-all duration-300 hover:shadow-md">
                        <CardHeader>
                            <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredProducts.map(product => {
                                    const imgSrc = backendImageUrl(product.image);
                                    return (
                                    <Card key={product.purchaseItemId || product.id} className="overflow-hidden cursor-pointer group/product transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" onClick={() => addToCart(product.id)}>
                                        <div className="aspect-square bg-muted relative">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="absolute top-1 left-1 h-7 w-7 z-20"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onSelect={() => setProductToDelete(product)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            {imgSrc ? (
                                                <Image src={imgSrc} width={200} height={200} alt={product.name} className="object-cover w-full h-full" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                                                    {product.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        {product.stock > 0 && (
                                            <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                                                Stock: {product.stock}
                                            </Badge>
                                        )}
                                        {product.stock === 0 && (
                                            <Badge variant="destructive" className="absolute top-1 right-1 text-xs">
                                                Out of Stock
                                            </Badge>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/product:opacity-100 flex items-center justify-center transition-opacity">
                                            <PlusCircle className="h-8 w-8 text-white" />
                                        </div>
                                    </div>
                                    <div className="p-2 text-center">
                                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                                        <p className="text-xs font-semibold">PKR {product.price.toLocaleString()}</p>
                                        {(() => {
                                          const sns = purchasedSNs(product);
                                          if (sns.length === 0) return null;
                                          const idx = product.currentSerialIndex ?? 0;
                                          const currentSn = sns[idx] || sns[0];
                                          return (
                                            <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5" title={sns.join(', ')}>
                                              SN: {currentSn}{sns.length > 1 ? ` (${idx + 1}/${sns.length})` : ''}
                                            </p>
                                          );
                                        })()}
                                    </div>
                                </Card>
                                );
                            })}
                            {filteredProducts.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No products found.</p>}
                        </CardContent>
                    </Card>
                </div>

                <AlertDialog open={!!productToDelete} onOpenChange={(o) => { if (!o) setProductToDelete(null); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete <span className="font-semibold">{productToDelete?.name}</span> and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteProduct} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {isDeleting ? 'Deleting…' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Dialog open={!!snEntriesProduct} onOpenChange={(o) => { if (!o) setSnEntriesProduct(null); }}>
                    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-amber-500" />
                                All SN entries
                            </DialogTitle>
                            <DialogDescription>
                                {snEntriesProduct?.name || ''}
                            </DialogDescription>
                        </DialogHeader>
                        {snEntriesProduct && (
                            <SerialEntriesTable
                                entries={purchasedSNs(snEntriesProduct).map((sn, i) => ({
                                    key: `${snEntriesProduct.id}-${i}-${sn}`,
                                    productName: snEntriesProduct.name,
                                    serialNumber: sn,
                                    price: snEntriesProduct.price,
                                }))}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                <div className="lg:col-span-1 flex flex-col gap-4">
                    <Card className="sticky top-20 transition-all duration-300 hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-amber-500" />
                                Order Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {/* Customer Type Checkboxes */}
                            <div className="flex flex-col gap-2.5 p-3 rounded-lg border bg-muted/30">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sell To</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                                        <Checkbox
                                            checked={showSubscriber}
                                            onCheckedChange={(checked) => handleCheckboxChange('subscriber', !!checked)}
                                        />
                                        <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        <span className="text-xs font-medium">Subscriber</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                                        <Checkbox
                                            checked={showCustomer}
                                            onCheckedChange={(checked) => handleCheckboxChange('customer', !!checked)}
                                        />
                                        <UserRound className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                        <span className="text-xs font-medium">Others</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                                        <Checkbox
                                            checked={showDealer}
                                            onCheckedChange={(checked) => handleCheckboxChange('dealer', !!checked)}
                                        />
                                        <Handshake className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        <span className="text-xs font-medium">Dealer</span>
                                    </label>
                                </div>
                            </div>

                            {/* Dropdowns */}
                            {showSubscriber && (
                                <SearchableDropdown
                                    label="Subscriber"
                                    icon={Users}
                                    items={subscriberList}
                                    selectedId={customerType === 'subscriber' ? customerId : undefined}
                                    onSelect={handleSelectCustomer}
                                    placeholder={`${subscriberList.length} subscribers available...`}
                                    color="text-blue-500"
                                />
                            )}
                            {showCustomer && (
                                <SearchableDropdown
                                    label="Others"
                                    icon={UserRound}
                                    items={customerList}
                                    selectedId={customerType === 'customer' ? customerId : undefined}
                                    onSelect={handleSelectCustomer}
                                    placeholder={`${customerList.length} customers available...`}
                                    color="text-violet-500"
                                />
                            )}
                            {showDealer && (
                                <SearchableDropdown
                                    label="Dealer"
                                    icon={Handshake}
                                    items={dealerList}
                                    selectedId={customerType === 'dealer' ? customerId : undefined}
                                    onSelect={handleSelectCustomer}
                                    placeholder={`${dealerList.length} dealers available...`}
                                    color="text-amber-500"
                                />
                            )}

                            {customerType && customerId && (
                                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{selectedName}</span>
                                        <Badge variant="outline" className="text-[10px] capitalize">{customerType}</Badge>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
                                        onClick={() => {
                                            setCustomerId('');
                                            setCustomerType('');
                                            setShowSubscriber(false);
                                            setShowCustomer(false);
                                            setShowDealer(false);
                                            setIsInstallment(false);
                                            setSelectedPlanId('');
                                            setExistingInstallment(null);
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}

                            {/* Installment Section - for all customer types */}
                            {customerType && customerId && (
                                <div className="flex flex-col gap-3 p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={isInstallment}
                                            onCheckedChange={(checked) => handleInstallmentToggle(!!checked)}
                                        />
                                        <Label className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                                            <Receipt className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            Installment Sale
                                        </Label>
                                    </div>

                                    {isInstallment && !existingInstallment && (
                                        <SearchableDropdown
                                            label="Installment Plan"
                                            icon={CalendarDays}
                                            items={planList}
                                            selectedId={selectedPlanId}
                                            onSelect={(id) => setSelectedPlanId(id)}
                                            placeholder="Select installment plan..."
                                            color="text-emerald-600 dark:text-emerald-400"
                                        />
                                    )}

                                    {fetchingInstallment && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Checking installment status...
                                        </div>
                                    )}

                                    {isInstallment && !selectedPlanId && !existingInstallment && !fetchingInstallment && (
                                        <p className="text-xs text-muted-foreground text-center py-1">
                                            Select an installment plan to continue
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="h-px bg-border" />

                            {/* Cart Items */}
                            <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-2">
                                {cart.length > 0 ? (
                                    cart.map(item => (
                                        <div key={item.product.id} className="flex items-start justify-between p-2 rounded-lg transition-all duration-200 hover:bg-muted/50">
                                            {backendImageUrl(item.product.image) ? (
                                                <Image src={backendImageUrl(item.product.image)!} width={50} height={50} alt={item.product.name} className="rounded-md object-cover" unoptimized />
                                            ) : (
                                                <div className="w-[50px] h-[50px] rounded-md bg-muted flex items-center justify-center text-base font-semibold text-muted-foreground">
                                                    {item.product.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 mx-3">
                                                <p className="font-medium">{item.product.name}</p>
                                                <SNSSelect
                                                    idPrefix={item.product.id}
                                                    sns={purchasedSNs(item.product)}
                                                    quantity={item.quantity}
                                                    selected={item.selectedSNs}
                                                    onChange={(next) => {
                                                        setCart(currentCart => currentCart.map(it => it.product.id === item.product.id ? { ...it, selectedSNs: next } : it));
                                                    }}
                                                />
                                                <p className="text-sm text-muted-foreground">PKR {item.product.price.toLocaleString()}</p>
                    <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateCartQuantity(item.product.id, parseInt(e.target.value) || 0)}
                        className="h-8 w-20 mt-1"
                        min="0"
                        max={item.product.stock}
                    />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <p className="font-medium">PKR {(item.product.price * item.quantity).toLocaleString()}</p>
                                                <div className="flex items-center gap-1">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => setSnEntriesProduct(item.product)}>
                                                                <Hash className="h-4 w-4 mr-2" />
                                                                Show all SN entries
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive transition-all duration-300 hover:scale-110 hover:bg-destructive/10" onClick={() => removeFromCart(item.product.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                                )}
                            </div>
                        </CardContent>
                        {cart.length > 0 && (
                            <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
                                {/* Installment Info Card */}
                                {isInstallment && installmentDetails && (
                                    <div className="flex flex-col gap-2.5 text-xs p-3.5 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-700">
                                            <div className="flex items-center gap-1.5">
                                                <Receipt className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{installmentDetails.planName}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400">Installment</Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">Each Installment</span>
                                                <span className="font-semibold">PKR {installmentDetails.amountPerInstallment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">Total Installments</span>
                                                <span className="font-semibold">{installmentDetails.totalInstallments}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <div className="flex flex-col rounded-md bg-emerald-100/50 dark:bg-emerald-900/30 p-2">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Paid</span>
                                                <span className="font-bold text-emerald-700 dark:text-emerald-300">{installmentDetails.paidInstallments}/{installmentDetails.totalInstallments}</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">PKR {installmentDetails.paidMoney.toLocaleString()}</span>
                                            </div>
                                            <div className="flex flex-col rounded-md bg-orange-100/50 dark:bg-orange-900/30 p-2">
                                                <span className="text-orange-600 dark:text-orange-400 font-medium">Remaining</span>
                                                <span className="font-bold text-orange-700 dark:text-orange-300">{installmentDetails.remainingInstallments}/{installmentDetails.totalInstallments}</span>
                                                <span className="text-orange-600 dark:text-orange-400 text-[11px]">PKR {installmentDetails.remainingMoney.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Discount */}
                                {!isInstallment && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground whitespace-nowrap">Discount</span>
                                        <Input
                                            type="number"
                                            value={discount || ''}
                                            onChange={(e) => setDiscount(Math.max(0, Math.min(parseFloat(e.target.value) || 0, maxDiscount)))}
                                            placeholder={`0 (max ${maxDiscount})`}
                                            className="h-8 text-right"
                                            min="0"
                                            max={maxDiscount}
                                        />
                                    </div>
                                )}

                                {/* Totals */}
                                <div className="flex flex-col gap-1.5 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>PKR {subtotal.toLocaleString()}</span>
                                    </div>
                                    {isInstallment && percentageIncrease > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                            <span>+ {percentageIncrease}% Increase</span>
                                            <span>PKR {increaseAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                        </div>
                                    )}
                                    {!isInstallment && discount > 0 && (
                                        <div className="flex justify-between text-emerald-500">
                                            <span>Discount</span>
                                            <span>- PKR {discount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Tax</span>
                                        <span>PKR {tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t pt-1.5">
                                        <span>Total</span>
                                        <span>PKR {isInstallment
                                            ? (subtotal * (1 + percentageIncrease / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                            : total.toLocaleString(undefined, { minimumFractionDigits: 2 })
                                        }</span>
                                    </div>
                                </div>

                                {/* Payment Methods + Action Buttons */}
                                {isInstallment ? (
                                    <>
                                        {/* Payment Methods for installment */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button variant={paymentMethod === 'card' ? 'default' : 'outline'} onClick={() => setPaymentMethod('card')} className="transition-all duration-300 hover:scale-105"><CreditCard className="mr-2 h-4 w-4" /> Card</Button>
                                            <Button variant={paymentMethod === 'bank' ? 'default' : 'outline'} onClick={() => setPaymentMethod('bank')} className="transition-all duration-300 hover:scale-105"><Landmark className="mr-2 h-4 w-4" /> Bank</Button>
                                            <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className="transition-all duration-300 hover:scale-105"><CircleDollarSign className="mr-2 h-4 w-4" /> Cash</Button>
                                        </div>
                                        <Button
                                            size="lg"
                                            disabled={isProcessing || (!existingInstallment && (cart.length === 0 || !selectedPlanId)) || (!!existingInstallment && (!installmentDetails || installmentDetails.remainingInstallments <= 0))}
                                            onClick={handleCompletePayment}
                                            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] disabled:hover:scale-100"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Receipt className="mr-2 h-4 w-4" />
                                            )}
                                            {isProcessing ? 'Processing...' : existingInstallment
                                                ? `Pay Installment - PKR ${installmentDetails?.amountPerInstallment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                                : `Pay Installment - PKR ${installmentDetails?.amountPerInstallment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                            }
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {/* Payment Methods for regular sale */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button variant={paymentMethod === 'card' ? 'default' : 'outline'} onClick={() => setPaymentMethod('card')} className="transition-all duration-300 hover:scale-105"><CreditCard className="mr-2 h-4 w-4" /> Card</Button>
                                            <Button variant={paymentMethod === 'bank' ? 'default' : 'outline'} onClick={() => setPaymentMethod('bank')} className="transition-all duration-300 hover:scale-105"><Landmark className="mr-2 h-4 w-4" /> Bank</Button>
                                            <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className="transition-all duration-300 hover:scale-105"><CircleDollarSign className="mr-2 h-4 w-4" /> Cash</Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                disabled={cart.length === 0 || isProcessing}
                                                onClick={handleHoldBill}
                                                className="transition-all duration-300 hover:scale-[1.02]"
                                            >
                                                Hold Bill
                                            </Button>
                                            <Button
                                                size="lg"
                                                disabled={cart.length === 0 || isProcessing}
                                                onClick={handleCompletePayment}
                                                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] disabled:hover:scale-100"
                                            >
                                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {isProcessing ? 'Processing...' : 'Complete Payment'}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
