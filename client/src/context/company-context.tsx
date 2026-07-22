'use client';

import { createContext, useContext, useState, useMemo, type ReactNode, useEffect } from 'react';
import type { Company } from '@/lib/types';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Minimal company type matching API response
interface APICompany {
  id: string;
  name: string;
  role: string;
  user_company_id: string;
  logo?: string;
  stamp?: string;
  contact1?: string;
  contact2?: string;
  email?: string;
  address?: string;
  description?: string;
  taxRules?: string;
  invoiceTemplate?: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
}

interface CompanyContextType {
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
  companyName: string | null;
  companies: Company[];
  addCompany: (company: Omit<Company, 'id' | 'logo' | 'stamp'>) => Promise<void>;
  updateCompany: (company: Company) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  switchCompany: (companyId: string) => void;
  fetchCompanyDetails: (companyId: string) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedCompanyId');
      return stored;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Save to localStorage when companyId changes
  useEffect(() => {
    if (typeof window !== 'undefined' && companyId) {
      localStorage.setItem('selectedCompanyId', companyId);
    }
  }, [companyId]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies');
      const fetchedAPICompanies: APICompany[] = response.data.data || [];

      // Convert API companies to the expected Company format
      const fetchedCompanies: Company[] = fetchedAPICompanies.map(ac => ({
        id: ac.id,
        name: ac.name,
        logo: ac.logo || '',
        stamp: ac.stamp || '',
        contact1: ac.contact1 || '',
        contact2: ac.contact2 || '',
        email: ac.email || '',
        address: ac.address || '',
        description: ac.description || '',
        taxRules: ac.taxRules || '',
        invoiceTemplate: ac.invoiceTemplate || '',
        subscriptionPlan: ac.subscriptionPlan as 'basic' | 'pro' | 'enterprise' | undefined,
        subscriptionExpiry: ac.subscriptionExpiry
      }));

      setCompanies(fetchedCompanies);
      if (fetchedCompanies.length > 0 && !companyId) {
        setCompanyId(fetchedCompanies[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch companies", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch companies.' });
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const response = await api.get(`/admin/companies/${companyId}`);
      const companyDetails = response.data.data;

      setCompanies(prev => prev.map(c =>
        c.id === companyId ? {
          id: companyDetails.id,
          name: companyDetails.name,
          logo: companyDetails.logo || '',
          stamp: companyDetails.stamp || '',
          contact1: companyDetails.contact1 || '',
          contact2: companyDetails.contact2 || '',
          email: companyDetails.email || '',
          address: companyDetails.address || '',
          description: companyDetails.description || '',
          taxRules: companyDetails.taxRules || '',
          invoiceTemplate: companyDetails.invoiceTemplate || '',
          subscriptionPlan: companyDetails.subscriptionPlan,
          subscriptionExpiry: companyDetails.subscriptionExpiry
        } : c
      ));
    } catch (error) {
      console.error("Failed to fetch company details", error);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read companyId from URL parameters on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCompanyId = urlParams.get('companyId');
      if (urlCompanyId && !companyId) {
        setCompanyId(urlCompanyId);
      }
    }
  }, [companyId]);

  const companyName = useMemo(() => {
    return companies.find(c => c.id === companyId)?.name || null;
  }, [companyId, companies]);

  const switchCompany = (newCompanyId: string) => {
    setCompanyId(newCompanyId);
  };

  const addCompany = async (companyData: Omit<Company, 'id' | 'logo' | 'stamp'>) => {
    try {
      const response = await api.post('/companies', companyData);
      const newCompany = response.data.data;

      // Convert full Company to APICompany format for consistency
      const apiCompany: APICompany = {
        id: newCompany.id,
        name: newCompany.name,
        role: 'owner', // User who creates company is owner
        user_company_id: newCompany.id, // This will be updated by backend
      };

      setCompanies(prev => [...prev, {
        ...newCompany,
        logo: '',
        stamp: '',
        contact1: '',
        contact2: '',
        email: '',
        address: '',
        description: '',
        taxRules: '',
        invoiceTemplate: '',
      }]);
      setCompanyId(newCompany.id);
      toast({ title: 'Success', description: 'Company added successfully.' });
    } catch (error) {
      console.error("Failed to add company", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add company.' });
    }
  };

  const updateCompany = async (updatedCompany: Company) => {
    try {
      await api.put(`/admin/companies/${updatedCompany.id}`, updatedCompany);
      setCompanies(companies.map((c) => (c.id === updatedCompany.id ? updatedCompany : c)));
      toast({ title: 'Success', description: 'Company updated successfully.' });
    } catch (error) {
      console.error("Failed to update company", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update company.' });
    }
  };

  const deleteCompany = async (companyIdToDelete: string) => {
    try {
      await api.delete(`/admin/companies/${companyIdToDelete}`);
      const updatedCompanies = companies.filter((c) => c.id !== companyIdToDelete);
      setCompanies(updatedCompanies);
      if (companyId === companyIdToDelete) {
        setCompanyId(updatedCompanies[0]?.id || null);
      }
      toast({ title: 'Success', description: 'Company deleted successfully.' });
    } catch (error) {
      console.error("Failed to delete company", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete company.' });
    }
  };


  const value = {
    companyId,
    setCompanyId,
    companyName,
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    switchCompany,
    fetchCompanyDetails,
    loading,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
