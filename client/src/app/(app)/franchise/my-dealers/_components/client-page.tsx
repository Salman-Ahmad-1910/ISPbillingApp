'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, ChevronLeft, ChevronRight, ArrowRight, Handshake } from 'lucide-react';
import type { Dealer, Company, Area } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface DealerFormValues {
  internetId: string;
  name: string;
  cell: string;
  phone: string;
  companyId: string;
  localityId: string;
  cnic: string;
  address: string;
  joiningDate: string;
}

interface ClientPageProps {
  data: Dealer[];
}

export function ClientPage({ data }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dealers, setDealers] = useState<Dealer[]>(data);
  const [filter, setFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Advanced pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageInput, setPageInput] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<DealerFormValues>({
    internetId: '',
    name: '',
    cell: '',
    phone: '',
    companyId: companyId || '',
    localityId: '',
    cnic: '',
    address: '',
    joiningDate: '',
  });

  // Fetch companies and areas for dropdowns
  const { data: companies = [] } = useGenericQuery<Company[]>('admin/companies', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<Area[]>('network/areas', companyId ?? undefined);

  useEffect(() => {
    setDealers(data);
  }, [data]);

  useEffect(() => {
    if (selectedDealer) {
      setFormData({
        internetId: (selectedDealer as any).internetId || '',
        name: selectedDealer.name,
        cell: (selectedDealer as any).cell || '',
        phone: selectedDealer.phone,
        companyId: selectedDealer.companyId,
        localityId: (selectedDealer as any).localityId || '',
        cnic: selectedDealer.cnic,
        address: (selectedDealer as any).address || '',
        joiningDate: (selectedDealer as any).joiningDate || '',
      });
    } else {
      setFormData({
        internetId: '',
        name: '',
        cell: '',
        phone: '',
        companyId: companyId || '',
        localityId: '',
        cnic: '',
        address: '',
        joiningDate: '',
      });
    }
  }, [selectedDealer, companyId]);

  const filteredData = useMemo(() => dealers.filter(dealer =>
    dealer.name.toLowerCase().includes(filter.toLowerCase()) ||
    dealer.cnic.includes(filter) ||
    dealer.phone.includes(filter)
  ), [dealers, filter]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.cnic) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        email: `${formData.internetId || formData.name.toLowerCase().replace(/\s/g, '.')}@dealer.local`,
        password: 'dealer123',
        commissionRate: 0,
      };

      if (selectedDealer) {
        await api.put(`/dealers/${selectedDealer.id}?companyId=${companyId}`, payload);
        toast({ title: 'Success', description: 'Dealer updated successfully.' });
      } else {
        await api.post(`/dealers?companyId=${companyId}`, payload);
        toast({ title: 'Success', description: 'Dealer added successfully.' });
      }
      queryClient.invalidateQueries({ queryKey: ['dealers', companyId] });
      setIsFormOpen(false);
      setSelectedDealer(null);
      resetForm();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save dealer',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      internetId: '',
      name: '',
      cell: '',
      phone: '',
      companyId: companyId || '',
      localityId: '',
      cnic: '',
      address: '',
      joiningDate: '',
    });
  };

  const handleEdit = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedDealer) {
      try {
        await api.delete(`/dealers/${selectedDealer.id}?companyId=${companyId}`);
        queryClient.invalidateQueries({ queryKey: ['dealers', companyId] });
        toast({ title: 'Success', description: 'Dealer deleted successfully.' });
        setIsDeleteDialogOpen(false);
        setSelectedDealer(null);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.message || 'Failed to delete dealer',
        });
      }
    }
  };

  const openDeleteDialog = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setIsDeleteDialogOpen(true);
  };

  const columns = getColumns({
    onEdit: handleEdit,
    onDelete: openDeleteDialog,
  });

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by name, CNIC, or phone..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm pl-8"
            />
          </div>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setSelectedDealer(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => { setSelectedDealer(null); resetForm(); }}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Dealer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                    <Handshake className="h-4 w-4" />
                  </div>
                  {selectedDealer ? 'Edit' : 'Add'} Dealer
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dealer ID</Label>
                    <Input
                      placeholder="e.g., DEALER-001"
                      value={formData.internetId}
                      onChange={(e) => setFormData(prev => ({ ...prev, internetId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="Enter dealer name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cell No</Label>
                    <Input
                      placeholder="e.g., 0300-1234567"
                      value={formData.cell}
                      onChange={(e) => setFormData(prev => ({ ...prev, cell: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone No *</Label>
                    <Input
                      placeholder="e.g., 0321-1234567"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Select
                      value={formData.companyId}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, companyId: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Locality</Label>
                    <Select
                      value={formData.localityId}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, localityId: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select locality" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.locality}, {area.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNIC *</Label>
                    <Input
                      placeholder="e.g., 35202-1234567-1"
                      value={formData.cnic}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnic: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Joining Date</Label>
                    <Input
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsFormOpen(false); setSelectedDealer(null); resetForm(); }}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950/30 transition-all duration-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
                  >
                    {isSaving ? 'Saving...' : (selectedDealer ? 'Update Dealer' : 'Add Dealer')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable columns={columns} data={getPaginatedData()} />

        {/* Advanced Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} dealers
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
              className="transition-all duration-300 hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {getVisiblePages().map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0 transition-all duration-300 hover:scale-110"
                >
                  {page}
                </Button>
              ))}
              {currentPage + 3 < totalPages && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 p-0 transition-all duration-300 hover:scale-110"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

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
                className="h-8 px-2 transition-all duration-300 hover:scale-105"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="transition-all duration-300 hover:scale-105"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={selectedDealer?.name}
      />
    </>
  );
}
