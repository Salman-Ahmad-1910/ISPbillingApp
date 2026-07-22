'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrintableVendorInvoice } from './printable-invoice';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import type { VendorInvoice, Vendor, Company } from '@/lib/types';

export default function PrintVendorInvoicePage() {
  const searchParams = useSearchParams();
  const { companyId } = useCompany();
  const invoiceId = searchParams.get('id');
  
  const [invoice, setInvoice] = useState<VendorInvoice | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const size = searchParams.get('size') as 'a4' | 'thermal' || 'a4';

  useEffect(() => {
    if (!invoiceId) {
      setError('Invalid invoice');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        
        // Fetch invoice with items
        const invoiceResponse = await api.get(`/crm/vendor-invoices/${invoiceId}`);
        const invoiceData = invoiceResponse.data.data;
        
        // Fetch vendor details
        const vendorResponse = await api.get(`/crm/vendors/${invoiceData.vendorId}`);
        const vendorData = vendorResponse.data.data;
        
        // Fetch company details
        let companyData: Company | null = null;
        if (companyId) {
          try {
            const companyResponse = await api.get(`/admin/companies/${companyId}`);
            companyData = companyResponse.data.data;
          } catch (companyError) {
            console.warn('Company data not available:', companyError);
          }
        }
        
        setInvoice(invoiceData);
        setVendor(vendorData);
        setCompany(companyData);
      } catch (err) {
        console.error('Error fetching invoice data:', err);
        setError('Failed to load invoice data');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId && companyId) {
      fetchData();
    }
  }, [invoiceId, companyId]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading invoice data...
      </div>
    );
  }

  if (error || !invoice || !vendor) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: 'red'
      }}>
        {error || 'Invoice data not found'}
      </div>
    );
  }

  // Use a default company if none is available
  const defaultCompany: Company = {
    id: company?.id || '',
    name: company?.name || 'Company Name',
    address: company?.address || '',
    contact1: company?.contact1 || '',
    contact2: company?.contact2 || '',
    email: company?.email || '',
    logo: company?.logo || '',
    stamp: company?.stamp || '',
    description: '',
    taxRules: '',
    invoiceTemplate: '',
  };

  return (
    <PrintableVendorInvoice 
      invoice={invoice} 
      company={defaultCompany}
      vendor={vendor}
      size={size}
    />
  );
}
