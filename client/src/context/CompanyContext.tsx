'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Company {
  id: string;
  name: string;
  email: string;
  contact1: string;
  contact2?: string;
  address: string;
  description?: string;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  companies: Company[];
  setSelectedCompany: (company: Company | null) => void;
  setCompanies: (companies: Company[]) => void;
  switchCompany: (companyId: string) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load companies and selected company from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCompanies = localStorage.getItem('companies');
        const savedSelectedCompany = localStorage.getItem('selectedCompany');

        if (savedCompanies) {
          const parsedCompanies = JSON.parse(savedCompanies);
          setCompanies(parsedCompanies);
        }

        if (savedSelectedCompany) {
          const parsedSelectedCompany = JSON.parse(savedSelectedCompany);
          setSelectedCompanyState(parsedSelectedCompany);
        }
      } catch (error) {
        console.error('Error loading company data from localStorage:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (companies.length > 0) {
        localStorage.setItem('companies', JSON.stringify(companies));
      }
      
      if (selectedCompany) {
        localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));
      } else {
        localStorage.removeItem('selectedCompany');
      }
    }
  }, [companies, selectedCompany]);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
  };

  const switchCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompanyState(company);
    }
  };

  const value: CompanyContextType = {
    selectedCompany,
    companies,
    setSelectedCompany,
    setCompanies,
    switchCompany,
    isLoading,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

// Helper hook to get company ID for API calls
export const useCompanyId = (): string | null => {
  const { selectedCompany } = useCompany();
  return selectedCompany?.id || null;
};
