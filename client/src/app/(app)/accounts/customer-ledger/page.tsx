'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, FileText, Users, DollarSign, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';

import { ClientPage } from './_components/client-page';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';

import type { Customer, LedgerEntry } from '@/lib/types';

export default function CustomerLedgerPage() {
  const { companyId } = useCompany();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data: customers = [], isLoading: isLoadingCustomers } = useGenericQuery<Customer>('crm/customers', companyId ?? undefined);

  const customerOptions = useMemo(() => {
    return customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      secondary: `${customer.cnic} • ${customer.phone}`,
    }));
  }, [customers]);

  const { data: customerLedger = [], isLoading: isLoadingLedger } = useGenericQuery<LedgerEntry>(
    selectedCustomerId ? `accounts/ledger?subscriber_id=${selectedCustomerId}` : null,
    selectedCustomerId ? companyId ?? undefined : undefined
  );

  // Don't auto-select customer - let user choose explicitly

  if (isLoadingCustomers) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Ledger</h1>
          <p className="text-sm text-muted-foreground">View detailed transaction history for each customer.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{Array.isArray(customers) ? customers.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ledger Entries</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{customerLedger.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{selectedCustomerId ? 'Customer Selected' : 'No Selection'}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <div className="p-4 border-b">
          <div className="max-w-md">
            <SearchableSelect
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
              options={customerOptions}
              placeholder="Search and select a customer..."
              searchPlaceholder="Type to search by name, CNIC, or phone..."
              label="Select Customer"
            />
          </div>
        </div>
        <CardContent className="p-0">
          {selectedCustomerId ? (
            <ClientPage initialData={customerLedger} customerId={selectedCustomerId} />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium mb-2">No Customer Selected</h3>
                <p>Please select a customer from the dropdown above to view their ledger entries.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
