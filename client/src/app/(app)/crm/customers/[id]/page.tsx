'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { ArrowLeft, Edit, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

export default function CustomerDetailPage() {
    const params = useParams<{ id: string }>();
    const { companyId } = useCompany();

    const { data: allCustomers = [], isLoading: isLoadingCustomers } = useGenericQuery<any[]>('crm/customers', companyId ?? undefined);

    const customer = useMemo(() => {
        const cust = allCustomers.find(c => c.id === params.id);
        // Security check: ensure the customer belongs to the current company
        if (cust?.companyId !== companyId) return null;
        return cust;
    }, [allCustomers, params.id, companyId]);

    if (isLoadingCustomers) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!customer) {
        // Don't use notFound() directly in a client component with hooks
        // Show a message instead, or redirect
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

    const { data: customerInvoices = [], isLoading: isLoadingcustomerInvoices } = useGenericQuery<any>('billing/invoices', companyId ?? undefined); // (inv => inv.customerName === customer.name && inv.companyId === companyId);

    return (
        <>
            <PageHeader
                title={customer.name}
                description={`Details for customer ${customer.id}`}
            >
                <div className="flex items-center gap-2">
                    <Link href="/crm/customers">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Customers
                        </Button>
                    </Link>
                    <Button>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Customer
                    </Button>
                </div>
            </PageHeader>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className="h-24 w-24 mb-2">
                                <AvatarImage src={`https://picsum.photos/seed/${customer.id}/100/100`} />
                                <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
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
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">CNIC</span>
                                    <span>{customer.cnic}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">City</span>
                                    <span>{customer.city}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Invoices</span>
                                    <span>{customer.totalInvoices}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-muted-foreground">Outstanding</span>
                                    <span>PKR {customer.outstandingBalance.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice History</CardTitle>
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
                                            <TableRow key={invoice.id}>
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
                                            <TableCell colSpan={4} className="h-24 text-center">No invoices found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
