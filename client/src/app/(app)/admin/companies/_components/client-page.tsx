'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
// import type { Company } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useUser } from '@/hooks/use-user';
// import { z } from 'zod';
// import { companySchema } from '@/lib/schemas';
// import { useToast } from '@/hooks/use-toast';

// import { DataTable } from './data-table';
import { columns as getColumns } from './columns';
import { CompanyForm } from './company-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Company } from '@/lib/types';
// import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import { companySchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

import { DataTable } from './data-table';
// import { columns as getColumns } from './columns';
// import { CompanyForm } from './company-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

type CompanyFormValues = z.infer<typeof companySchema>;

export function ClientPage() {
  const { companies, addCompany, updateCompany, deleteCompany, loading, switchCompany } = useCompany();
  const { user } = useUser();
  const [filter, setFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Advanced pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageInput, setPageInput] = useState<string>('');

  const displayCompanies = useMemo(() => {
    if (!user?.profile?.companies) return companies;
    const userCompanyIds = user.profile.companies.map((c: any) => c.id);
    return companies.filter(company => userCompanyIds.includes(company.id));
  }, [companies, user]);

  const filteredData = useMemo(() => displayCompanies.filter(
    (company) =>
      (company.name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (company.email?.toLowerCase() || '').includes(filter.toLowerCase())
  ), [displayCompanies, filter]);

  // Pagination helpers
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  };

  const getVisiblePages = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageSubmit = () => {
    const page = parseInt(pageInput);
    if (page && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  const handlePageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageSubmit();
    }
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleSave = async (data: CompanyFormValues) => {
    setIsSaving(true);
    if (selectedCompany) {
      await updateCompany({ ...selectedCompany, ...data });
    } else {
      await addCompany(data);
      // Don't automatically switch to new company
      toast({ title: 'Success', description: 'Company added successfully.' });
    }
    setIsSaving(false);
    setIsFormOpen(false);
    setSelectedCompany(null);
  };

  const handleCompanySelect = (companyId: string) => {
    switchCompany(companyId);
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedCompany) {
      await deleteCompany(selectedCompany.id);
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
    }
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: openDeleteDialog });

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Filter by name or email..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
            {/* <Select onValueChange={handleCompanySelect}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                {displayCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}
          </div>
          <Dialog open={isFormOpen} onOpenChange={(open) => !isSaving && setIsFormOpen(open)}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedCompany(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>{selectedCompany ? 'Edit' : 'Add'} Company</DialogTitle>
              </DialogHeader>
              <CompanyForm
                company={selectedCompany}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>
        {loading ? <p>Loading companies...</p> : <DataTable columns={columns} data={getPaginatedData()} />}

        {/* Advanced Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} companies
          </div>
          <div className="flex items-center gap-2">
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            {/* Page numbers - show current page ± 3 */}
            <div className="flex items-center gap-1">
              {getVisiblePages().map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}

              {/* Show ellipsis if there are more pages */}
              {currentPage + 3 < totalPages && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            {/* Page input */}
            <div className="flex items-center gap-1">
              <Input
                type="text"
                placeholder="Go to"
                value={pageInput}
                onChange={handlePageInputChange}
                onKeyPress={handlePageKeyPress}
                className="w-16 h-8 text-center"
                min={1}
                max={totalPages}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePageSubmit}
                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                className="h-8 px-2"
              >
                Go
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={selectedCompany?.name}
      />
    </>
  );
}
