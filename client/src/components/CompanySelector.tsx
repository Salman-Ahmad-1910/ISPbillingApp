'use client';

import React, { useState } from 'react';
import { useCompany } from '@/context/company-context';
import { ChevronDown, Building2, LogOut, Users } from 'lucide-react';
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
        className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <Building2 className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
          <div className="text-left flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{companyName}</div>
            <div className="text-xs text-gray-500 truncate">{selectedCompany?.email || 'Company'}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Switch Company
              </div>
              
              {companies.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No other companies available
                </div>
              ) : (
                companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleCompanySwitch(company.id)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center ${
                      company.id === companyId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium truncate">{company.name}</div>
                      <div className="text-xs text-gray-500 truncate">{company.email}</div>
                    </div>
                    {company.id === companyId && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))
              )}
              
              {/* <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    // Navigate to company management or logout
                    const currentPath = window.location.pathname;
                    const newUrl = new URL(currentPath, window.location.origin);
                    newUrl.searchParams.set('companyId', companyId);
                    router.replace(newUrl.pathname + newUrl.search);
                  }}
                  className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">Manage Companies</span>
                </button>
              </div> */}
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
    <div className={`flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm ${className}`}>
      <Building2 className="w-3 h-3 mr-1" />
      {companyName}
    </div>
  );
};
