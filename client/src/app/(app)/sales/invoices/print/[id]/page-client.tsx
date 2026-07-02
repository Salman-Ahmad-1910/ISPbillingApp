'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';

import { PrintableInvoice } from './printable-invoice';
import type { Invoice, Company, Subscriber } from '@/lib/types';

export default function PrintInvoicePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { companyId } = useCompany();
  const size = searchParams.get('size') as 'a4' | 'thermal' | null;
  const printTriggered = useRef(false);

  if (params.id === 'placeholder') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Invoice not found</h1>
        <p>The requested invoice could not be loaded.</p>
      </div>
    );
  }

  // Fetch data
  const { data: invoices = [], isLoading: isLoadingInvoices } = useGenericQuery<Invoice[]>('billing/invoices', companyId ?? undefined);
  const { data: companies = [], isLoading: isLoadingCompanies } = useGenericQuery<Company[]>('admin/companies', companyId ?? undefined);
  const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<Subscriber[]>('billing/subscribers', companyId ?? undefined);

  const invoice = useMemo(() => invoices.find(i => i.id === params.id), [invoices, params.id]);
  const company = useMemo(() => companies.find(c => c.id === invoice?.companyId), [companies, invoice]);
  const subscriber = useMemo(() => subscribers.find(s => s.id === invoice?.subscriberId), [subscribers, invoice]);

  useEffect(() => {
    if (invoice && company && subscriber && !printTriggered.current) {
      printTriggered.current = true;
      setTimeout(() => window.print(), 500);
    }
  }, [invoice, company, subscriber]);

  if (isLoadingInvoices || isLoadingCompanies || isLoadingSubscribers) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading invoice data...</p>
        </div>
      </div>
    );
  }

  if (!invoice || !company || !subscriber) {
    return (
        <div className="p-8 text-center">
            <h1 className="text-xl font-bold">Invoice not found</h1>
            <p>The requested invoice could not be loaded.</p>
        </div>
    );
  }
  
  if (!size) {
      return (
          <div className="p-8 text-center">
              <h1 className="text-xl font-bold">Print size not specified</h1>
              <p>Please specify a print size (a4 or thermal) in the URL.</p>
          </div>
      );
  }

  return <PrintableInvoice invoice={invoice} company={company} subscriber={subscriber} size={size} />;
}
