'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrintablePurchaseInvoice } from './printable-invoice';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import type { Purchase, Company } from '@/lib/types';

export default function PrintPurchasePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { companyId } = useCompany();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid purchase');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const purchaseResponse = await api.get(`/inventory/purchases/${id}`);
        const purchaseData = purchaseResponse.data.data;
        setPurchase(purchaseData);

        let companyData: Company | null = null;
        if (companyId) {
          try {
            const companyResponse = await api.get(`/admin/companies/${companyId}`);
            companyData = companyResponse.data.data;
          } catch {
            console.warn('Company data not available');
          }
        }

        setCompany(companyData);
      } catch (err) {
        console.error('Error fetching purchase data:', err);
        setError('Failed to load purchase data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, companyId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }}>
        Loading purchase data...
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: 'red' }}>
        {error || 'Purchase data not found'}
      </div>
    );
  }

  const defaultCompany: Company = {
    id: company?.id || '',
    name: company?.name || 'Company Name',
    logo: company?.logo || '',
    stamp: company?.stamp || '',
    contact1: company?.contact1 || '',
    contact2: company?.contact2 || '',
    email: company?.email || '',
    address: company?.address || '',
    description: '',
    taxRules: '',
    invoiceTemplate: '',
  };

  return (
    <PrintablePurchaseInvoice
      purchase={purchase}
      company={defaultCompany}
    />
  );
}
