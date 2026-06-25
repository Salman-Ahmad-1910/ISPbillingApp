'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

import { PlusCircle, Trash2, CreditCard, Landmark, CircleDollarSign, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Subscriber } from '@/lib/types';
import { cn, backendImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface CartItem {
    product: Product;
    quantity: number;
}

export default function POSPage() {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: productsData = [], isLoading: isLoadingProducts } = useGenericQuery<Product>('inventory/products', companyId ?? undefined);
    const { data: subscribersData = [], isLoading: isLoadingSubscribers } = useGenericQuery<Subscriber>('subscribers', companyId ?? undefined);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | undefined>();
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | null>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => {
        return productsData.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [productsData, searchTerm]);

    const addToCart = (productId: string) => {
        const product = productsData.find(p => p.id === productId);
        if (!product || product.stock === 0) {
            toast({
                variant: 'destructive',
                title: 'Out of Stock',
                description: `${product?.name} is currently out of stock.`,
            });
            return;
        };

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
        const product = productsData.find(p => p.id === productId);
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
    // Per-item tax: each product carries its own tax % (default 0%).
    const tax = cart.reduce(
      (acc, item) => acc + (item.product.price * item.quantity) * ((Number(item.product.taxPercent) || 0) / 100),
      0
    );
    const total = subtotal + tax;

    const handleCompletePayment = async () => {
        if (!selectedSubscriberId) {
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
            const subscriber = subscribersData.find(s => s.id === selectedSubscriberId);

            const saleData = {
                subscriberId: selectedSubscriberId,
                subscriberName: subscriber?.name || 'Unknown',
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

            // Invalidate products to refresh stock
            queryClient.invalidateQueries({ queryKey: ['inventory/products', companyId] });

            toast({
                title: 'Sale Completed!',
                description: 'The transaction has been recorded successfully.',
            });

            // Reset state
            setCart([]);
            setSelectedSubscriberId(undefined);
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
        <>
            <PageHeader
                title="Point of Sale (POS)"
                description="A retail counter for quick billing, recharges, and device sales."
            />
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map(product => {
                                const imgSrc = backendImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/200/200`;
                                return (
                                <Card key={product.id} className="overflow-hidden cursor-pointer group/product" onClick={() => addToCart(product.id)}>
                                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                                        <Image src={imgSrc} width={200} height={200} alt={product.name} className="object-cover" unoptimized />
                                        {product.stock === 0 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Badge variant="destructive">Out of Stock</Badge></div>}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/product:opacity-100 flex items-center justify-center transition-opacity">
                                            <PlusCircle className="h-8 w-8 text-white" />
                                        </div>
                                        {product.stock > 0 && (
                                            <Badge variant="secondary" className="absolute top-1 right-1 text-xs">Stock: {product.stock}</Badge>
                                        )}
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
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle>Order Details</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer">Customer</Label>
                                <Select value={selectedSubscriberId} onValueChange={setSelectedSubscriberId}>
                                    <SelectTrigger id="customer">
                                        <SelectValue placeholder="Select a customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subscribersData.map((subscriber) => (
                                            <SelectItem key={subscriber.id} value={subscriber.id}>
                                                {subscriber.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-2">
                                {cart.length > 0 ? (
                                    cart.map(item => (
                                        <div key={item.product.id} className="flex items-start justify-between">
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
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}>
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
                                    <Button variant={paymentMethod === 'card' ? 'default' : 'outline'} onClick={() => setPaymentMethod('card')}><CreditCard className="mr-2 h-4 w-4" /> Card</Button>
                                    <Button variant={paymentMethod === 'bank' ? 'default' : 'outline'} onClick={() => setPaymentMethod('bank')}><Landmark className="mr-2 h-4 w-4" /> Bank</Button>
                                    <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')}><CircleDollarSign className="mr-2 h-4 w-4" /> Cash</Button>
                                </div>
                                <Button size="lg" disabled={cart.length === 0 || isProcessing} onClick={handleCompletePayment}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isProcessing ? 'Processing...' : 'Complete Payment'}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}
