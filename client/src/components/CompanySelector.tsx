'use client';

import React, { useState } from 'react';
import { useCompany } from '@/context/company-context';
import { ChevronDown, Building2, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserPermissions } from '@/hooks/usePermissions';

interface CompanySelectorProps {
  className?: string;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({ className = '' }) => {
  const { companyId, companyName, companies, setCompanyId, loading } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
    const { hasPermission, hasMinimumRole, userRole, user } = useUserPermissions();
  

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  

  // 

  if (!companyId || !companyName) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center text-red-700">
          <Building2 className="w-4 h-4 mr-2" />
          <span className="text-sm">No company selected</span>
        </div>
      </div>
    );
  }

  const selectedCompany = companies.find(c => c.id === companyId);



  const handleCompanySwitch = (newCompanyId: string) => {
    setCompanyId(newCompanyId);
    setIsOpen(false);
    
    // Update URL without full page reload
    const currentPath = window.location.pathname;
    const newUrl = new URL(currentPath, window.location.origin);
    
    // Update or add companyId parameter
    if (newCompanyId) {
      newUrl.searchParams.set('companyId', newCompanyId);
    } else {
      newUrl.searchParams.delete('companyId');
    }
    
    // Navigate to the same path with updated company context
    // router.replace(newUrl.pathname + newUrl.search);
  };

  if (hasMinimumRole('admin'))
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-muted/50 border border-border rounded-lg px-4 py-2 hover:bg-muted transition-all duration-300 hover:shadow-sm"
      >
        <div className="flex items-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-green-600 mr-2 shadow-sm">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="font-medium text-foreground truncate text-sm">{companyName}</div>
            <div className="text-xs text-muted-foreground truncate">{selectedCompany?.email || 'Company'}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden transition-all duration-300">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Switch Company
              </div>
              
              {companies.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No other companies available
                </div>
              ) : (
                companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleCompanySwitch(company.id)}
                    className={`w-full px-3 py-2.5 text-left hover:bg-muted flex items-center transition-colors duration-200 ${
                      company.id === companyId ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mr-2.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{company.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{company.email}</div>
                    </div>
                    {company.id === companyId && (
                      <div className="ml-2 flex-shrink-0">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Company Badge for displaying current company in header
export const CompanyBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { companyName } = useCompany();

  if (!companyName) return null;

  return (
    <div className={`flex items-center bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 px-3 py-1 rounded-full text-sm ${className}`}>
      <Building2 className="w-3 h-3 mr-1.5" />
      {companyName}
    </div>
  );
};
