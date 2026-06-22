'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { RecommendationAssistant } from '../_components/recommendation-assistant';
import { useCompany } from '@/context/company-context';
import type { Product, Subscriber } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface InvoiceItem {
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

export default function NewInvoicePage() {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const router = useRouter();

    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [customer, setCustomer] = useState<string | undefined>();
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
      setInvoiceDate(new Date().toISOString().substring(0, 10));
    }, []);

    const { data: products = [], isLoading: isLoadingproducts } = useGenericQuery<Product[]>('inventory/products', companyId ?? undefined);
    const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<Subscriber[]>('billing/subscribers', companyId ?? undefined);

    const handleAddItem = () => {
        setItems([...items, { productId: '', quantity: 1, price: 0, total: 0 }]);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index] };
        
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            item.productId = value as string;
            item.price = product?.price || 0;
        } else {
            // @ts-ignore
            item[field] = value;
        }

        item.total = item.quantity * item.price;
        newItems[index] = item;
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };
    
    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const tax = subtotal * 0.17;
    const total = subtotal + tax;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Invoice Created",
            description: "The new invoice has been successfully created.",
        });
        router.push('/sales/invoices');
    }

  return (
    <>
      <PageHeader
        title="Create New Invoice"
        description="Fill in the details to create a new invoice for a customer."
      />
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customer">Subscriber</Label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select a subscriber" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscribers.filter(s=> s.companyId === companyId).map((subscriber) => (
                      <SelectItem key={subscriber.id} value={subscriber.id}>
                        {subscriber.subscriber_identity} | {subscriber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input id="invoice-date" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input id="due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Invoice Items</Label>
              <div className="p-4 border rounded-md space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`product-${index}`}>Product / Service</Label>
                        <Select value={item.productId} onValueChange={val => handleItemChange(index, 'productId', val)}>
                            <SelectTrigger id={`product-${index}`}>
                            <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                            {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                {product.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                            <Input id={`quantity-${index}`} type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`price-${index}`}>Price</Label>
                            <Input id={`price-${index}`} type="number" value={item.price} onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`total-${index}`}>Total</Label>
                            <Input id={`total-${index}`} type="number" value={item.total} readOnly className="bg-muted" />
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>Add Item</Button>
              </div>
            </div>
            
            <div className="flex justify-end items-center gap-6 pt-4 border-t">
                <div className="space-y-2 text-right">
                    <p className="text-muted-foreground">Subtotal: <span className="font-medium text-foreground">PKR {subtotal.toLocaleString()}</span></p>
                    <p className="text-muted-foreground">Tax (17%): <span className="font-medium text-foreground">PKR {tax.toLocaleString()}</span></p>
                    <p className="font-bold text-lg">Total: <span className="text-primary">PKR {total.toLocaleString()}</span></p>
                </div>
            </div>

             <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <RecommendationAssistant />
                <Button type="button" variant="outline">Save as Draft</Button>
                <Button type="submit">Create Invoice</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
