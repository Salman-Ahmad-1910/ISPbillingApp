'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, ArrowLeft, Edit, Mail, Phone, UserRound, FileText, DollarSign, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

export default function CustomerDetailPage() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const { companyId } = useCompany();

    const { data: allCustomers = [], isLoading: isLoadingCustomers } = useGenericQuery<any[]>('crm/customers', companyId ?? undefined);

    const customer = useMemo(() => {
        const cust = allCustomers.find(c => c.id === id);
        if (cust?.companyId !== companyId) return null;
        return cust;
    }, [allCustomers, id, companyId]);

    if (isLoadingCustomers) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Customer not found</h1>
                <p>This customer does not exist or does not belong to your company.</p>
                <Link href="/crm/customers" className="mt-4 inline-block">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Customers
                    </Button>
                </Link>
            </div>
        )
    }

    const { data: customerInvoices = [], isLoading: isLoadingcustomerInvoices } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
                    <UserRound className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                    <p className="text-sm text-muted-foreground">Customer profile and invoice history</p>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <Link href="/crm/customers">
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <Button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Customer
                    </Button>
                </div>
            </div>

            <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <Card className="transition-all duration-300 hover:shadow-md">
                        <CardHeader className="items-center text-center">
                            <Avatar className="h-24 w-24 mb-2 ring-2 ring-amber-500/20">
                                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl font-bold">{customer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <CardTitle>{customer.name}</CardTitle>
                            <CardDescription>
                                <Badge
                                    variant={customer.status === 'active' ? 'default' : customer.status === 'blacklisted' ? 'destructive' : 'secondary'}
                                    className={customer.status === 'active' ? 'bg-green-600' : ''}
                                >
                                    {customer.status}
                                </Badge>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.name.toLowerCase().replace(' ', '.')}@example.com</span>
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> CNIC</span>
                                    <span>{customer.cnic}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> City</span>
                                    <span>{customer.city}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Total Invoices</span>
                                    <span className="font-semibold">{customer.totalInvoices}</span>
                                </div>
                                <div className="flex justify-between items-center font-medium pt-2 border-t">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Outstanding</span>
                                    <span className={customer.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>PKR {customer.outstandingBalance.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card className="transition-all duration-300 hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-amber-500" />
                                Invoice History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice ID</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customerInvoices.length > 0 ? (
                                        customerInvoices.map(invoice => (
                                            <TableRow key={invoice.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{invoice.id}</TableCell>
                                                <TableCell>PKR {invoice.amount.toLocaleString()}</TableCell>
                                                <TableCell>{invoice.dueDate}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}
                                                        className={invoice.status === 'paid' ? 'bg-green-600' : ''}
                                                    >
                                                        {invoice.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                    <FileText className="h-8 w-8 text-amber-500/40" />
                                                    <p className="text-sm font-medium">No invoices found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
