'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

import { PlusCircle, Trash2, CreditCard, Landmark, CircleDollarSign, Loader2, ShoppingCart, Search, Users, UserRound, Handshake } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';
import { backendImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface CartItem {
    product: Product;
    quantity: number;
}

interface DropdownItem {
    id: string;
    name: string;
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
        const q = query.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(q));
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
                                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm ${selectedId === item.id ? 'bg-accent font-medium' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect(item.id);
                                    setQuery('');
                                    setOpen(false);
                                }}
                            >
                                {item.name}
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

export default function POSPage() {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: purchasedProducts = [] } = useGenericQuery<any>('inventory/purchased-products', companyId ?? undefined);
    const { data: customersData = [] } = useGenericQuery<any>('crm/customers', companyId ?? undefined);
    const { data: dealersData = [] } = useGenericQuery<any>('dealers', companyId ?? undefined);
    const { data: subscribersData = [] } = useGenericQuery<any>('admin/connections', companyId ?? undefined);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerId, setCustomerId] = useState<string>('');
    const [customerType, setCustomerType] = useState<'subscriber' | 'customer' | 'dealer' | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | null>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [showSubscriber, setShowSubscriber] = useState(false);
    const [showCustomer, setShowCustomer] = useState(false);
    const [showDealer, setShowDealer] = useState(false);

    const customerList = useMemo(() => {
        if (!Array.isArray(customersData)) return [];
        return customersData.map((c: any): DropdownItem => ({ id: c.id, name: c.name }));
    }, [customersData]);

    const subscriberList = useMemo(() => {
        if (!Array.isArray(subscribersData)) return [];
        return subscribersData.map((s: any): DropdownItem => ({ id: s.id, name: s.name }));
    }, [subscribersData]);

    const dealerList = useMemo(() => {
        if (!Array.isArray(dealersData)) return [];
        return dealersData.map((d: any): DropdownItem => ({ id: d.id, name: d.name }));
    }, [dealersData]);

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
        if (!id) {
            setCustomerType('');
            if (customerType === 'subscriber') setShowSubscriber(false);
            if (customerType === 'customer') setShowCustomer(false);
            if (customerType === 'dealer') setShowDealer(false);
        }
    };

    const selectedName = useMemo(() => {
        if (!customerId || !customerType) return '';
        if (customerType === 'subscriber') return subscriberList.find(s => s.id === customerId)?.name || '';
        if (customerType === 'customer') return customerList.find(c => c.id === customerId)?.name || '';
        if (customerType === 'dealer') return dealerList.find(d => d.id === customerId)?.name || '';
        return '';
    }, [customerId, customerType, subscriberList, customerList, dealerList]);

    const posProducts = useMemo(() => {
        if (!purchasedProducts) return [];
        return (purchasedProducts as any[]).map(p => ({
            ...p,
            stock: p.stock ?? p.purchasedQty ?? 0,
        }));
    }, [purchasedProducts]);

    const filteredProducts = useMemo(() => {
        return posProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [posProducts, searchTerm]);

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
            return [...currentCart, { product, quantity: 1 }];
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

        setCart(currentCart => currentCart.map(item => item.product.id === productId ? { ...item, quantity } : item));
    }

    const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const tax = cart.reduce(
      (acc, item) => acc + (item.product.price * item.quantity) * ((Number(item.product.taxPercent) || 0) / 100),
      0
    );
    const total = subtotal + tax;

    const handleCompletePayment = async () => {
        if (!customerId) {
            toast({
                variant: 'destructive',
                title: 'Customer not selected',
                description: 'Please select a customer to proceed.',
            });
            return;
        }
        if (!paymentMethod) {
            toast({
                variant: 'destructive',
                title: 'Payment method not selected',
                description: 'Please select a payment method.',
            });
            return;
        }

        setIsProcessing(true);
        try {
            const saleData = {
                subscriberId: customerId,
                subscriberName: selectedName || 'Unknown',
                totalAmount: total,
                taxAmount: tax,
                paymentMethod: paymentMethod,
                date: new Date().toISOString(),
                companyId: companyId!,
                items: cart.map(item => ({
                    productId: item.product.id,
                    productName: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price,
                    taxPercent: Number(item.product.taxPercent) || 0,
                }))
            };

            await api.post(`/pos/sales?companyId=${companyId}`, saleData);

            queryClient.invalidateQueries({ queryKey: ['inventory/purchased-products', companyId] });

            toast({
                title: 'Sale Completed!',
                description: 'The transaction has been recorded successfully.',
            });

            setCart([]);
            setCustomerId('');
            setCustomerType('');
            setShowSubscriber(false);
            setShowCustomer(false);
            setShowDealer(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to process sale',
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
                                const imgSrc = backendImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/200/200`;
                                return (
                                <Card key={product.id} className="overflow-hidden cursor-pointer group/product transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" onClick={() => addToCart(product.id)}>
                                    <div className="aspect-square bg-muted relative">
                                        <Image src={imgSrc} width={200} height={200} alt={product.name} className="object-cover w-full h-full" unoptimized />
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
                                    </div>
                                </Card>
                                );
                            })}
                            {filteredProducts.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No products found.</p>}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 flex flex-col gap-4">
                    {/* Order Details */}
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
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <Checkbox
                                            checked={showSubscriber}
                                            onCheckedChange={(checked) => handleCheckboxChange('subscriber', !!checked)}
                                        />
                                        <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        <span className="text-xs font-medium">Subscriber</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <Checkbox
                                            checked={showCustomer}
                                            onCheckedChange={(checked) => handleCheckboxChange('customer', !!checked)}
                                        />
                                        <UserRound className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                        <span className="text-xs font-medium">Customer</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
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
                                    label="Customer"
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
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}

                            <div className="h-px bg-border" />

                            {/* Cart Items */}
                            <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-2">
                                {cart.length > 0 ? (
                                    cart.map(item => (
                                        <div key={item.product.id} className="flex items-start justify-between p-2 rounded-lg transition-all duration-200 hover:bg-muted/50">
                                            <Image src={backendImageUrl(item.product.image) || `https://picsum.photos/seed/${item.product.id}/50/50`} width={50} height={50} alt={item.product.name} className="rounded-md object-cover" unoptimized />
                                            <div className="flex-1 mx-3">
                                                <p className="font-medium">{item.product.name}</p>
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
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive transition-all duration-300 hover:scale-110 hover:bg-destructive/10" onClick={() => removeFromCart(item.product.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                                )}
                            </div>
                        </CardContent>
                        {cart.length > 0 && (
                            <CardFooter className="flex-col items-stretch gap-4 border-t pt-4">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>PKR {subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tax (per item)</span>
                                    <span>PKR {tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>PKR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button variant={paymentMethod === 'card' ? 'default' : 'outline'} onClick={() => setPaymentMethod('card')} className="transition-all duration-300 hover:scale-105"><CreditCard className="mr-2 h-4 w-4" /> Card</Button>
                                    <Button variant={paymentMethod === 'bank' ? 'default' : 'outline'} onClick={() => setPaymentMethod('bank')} className="transition-all duration-300 hover:scale-105"><Landmark className="mr-2 h-4 w-4" /> Bank</Button>
                                    <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className="transition-all duration-300 hover:scale-105"><CircleDollarSign className="mr-2 h-4 w-4" /> Cash</Button>
                                </div>
                                <Button size="lg" disabled={cart.length === 0 || isProcessing} onClick={handleCompletePayment} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] disabled:hover:scale-100">
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isProcessing ? 'Processing...' : 'Complete Payment'}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
