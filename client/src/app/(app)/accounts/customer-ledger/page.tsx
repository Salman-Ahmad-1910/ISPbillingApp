'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
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
    <>
      <PageHeader
        title="Customer Ledger"
        description="View detailed transaction history for each customer."
      />
      <Card>
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
    </>
  );
}
