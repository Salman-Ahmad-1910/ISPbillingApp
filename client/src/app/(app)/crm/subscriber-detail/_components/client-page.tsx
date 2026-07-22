'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Users, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';
import type { Connection, Area, DistributionBox, Package, Company, Splitter } from '@/lib/types';
import { connectionSchema } from '@/lib/schemas';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { ConnectionForm } from './connection-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';
import { ImportExportDialog } from './import-export-dialog';

type ConnectionFormValues = z.infer<typeof connectionSchema>;

interface ClientPageProps {
  connections: Connection[];
}

export function ClientPage({ connections }: ClientPageProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');

  const [filterSublocality, setFilterSublocality] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterBox, setFilterBox] = useState('all');
  const [filterPackage, setFilterPackage] = useState('all');
  const [filterDiscount, setFilterDiscount] = useState('all');
  const [filterSortBy, setFilterSortBy] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  const { data: areasData } = useGenericQuery<Area[]>('network/areas', companyId ?? undefined);
  const { data: boxesData } = useGenericQuery<DistributionBox[]>('network/boxes', companyId ?? undefined);
  const { data: packagesData } = useGenericQuery<Package[]>('billing/packages', companyId ?? undefined);
  const { data: companiesData } = useGenericQuery<Company[]>('companies', companyId ?? undefined);
  const { data: splittersData } = useGenericQuery<Splitter[]>('network/splitters', companyId ?? undefined);

  const areas = (areasData || []) as Area[];
  const boxes = (boxesData || []) as DistributionBox[];
  const packages = (packagesData || []) as Package[];
  const companies = (companiesData || []) as Company[];
  const splitters = (splittersData || []) as Splitter[];

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterSublocality, filterStatus, filterType, filterBox, filterPackage, filterDiscount, filterSortBy, filterProvider]);

  const filteredData = useMemo(() => {
    let result = connections;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.internetId.toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        (c.cell || '').includes(q) ||
        (c.mobile || '').includes(q)
      );
    }

    if (filterSublocality !== 'all') {
      result = result.filter(c => c.sublocalityId === filterSublocality);
    }
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }
    if (filterType !== 'all') {
      const typeMap: Record<string, string> = {
        'both': 'both',
        'tv_cable': 'tv_cable',
        'internet': 'internet',
        'cable_all': 'tv_cable',
        'internet_all': 'internet',
      };
      result = result.filter(c => c.connectionType === (typeMap[filterType] || filterType));
    }
    if (filterBox !== 'all') {
      result = result.filter(c => c.boxNumber === filterBox);
    }
    if (filterPackage !== 'all') {
      result = result.filter(c => c.packageInternet === filterPackage || c.packageCable === filterPackage);
    }
    if (filterDiscount !== 'all') {
      result = result.filter(c => c.discount === filterDiscount || (filterDiscount === 'no_discount' && !c.discount));
    }
    if (filterProvider !== 'all') {
      result = result.filter(c => c.connectionProvider === filterProvider);
    }

    if (filterSortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterSortBy === 'internetId') {
      result = [...result].sort((a, b) => a.internetId.localeCompare(b.internetId));
    } else if (filterSortBy === 'installationDate') {
      result = [...result].sort((a, b) => (a.installationDate || '').localeCompare(b.installationDate || ''));
    }

    return result;
  }, [connections, search, filterSublocality, filterStatus, filterType, filterBox, filterPackage, filterDiscount, filterSortBy, filterProvider]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const handleSave = async (formData: ConnectionFormValues) => {
    setIsSaving(true);
    try {
      if (selectedConnection) {
        await api.put(`/admin/connections/${selectedConnection.id}?companyId=${companyId}`, formData);
        toast({ title: "Success", description: "Subscriber updated successfully." });
      } else {
        await api.post(`/admin/connections?companyId=${companyId}`, { ...formData, companyId });
        toast({ title: "Success", description: "Subscriber added successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ['admin/connections', companyId] });
      setIsFormOpen(false);
      setSelectedConnection(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: error.response?.data?.message || "Failed to save subscriber"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedConnection) {
      try {
        await api.delete(`/admin/connections/${selectedConnection.id}?companyId=${companyId}`);
        toast({ title: "Success", description: "Subscriber deleted successfully." });
        queryClient.invalidateQueries({ queryKey: ['admin/connections', companyId] });
        setIsDeleteDialogOpen(false);
        setSelectedConnection(null);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: "Error",
          description: error.response?.data?.message || "Failed to delete subscriber"
        });
      }
    }
  };

  const openDeleteDialog = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsDeleteDialogOpen(true);
  };

  const columns = getColumns({
    onEdit: handleEdit,
    onDelete: openDeleteDialog,
  });

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterSublocality} onValueChange={setFilterSublocality}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sublocality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sublocality</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>{area.subLocality || area.locality || area.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="tv_cable">TV Cable</SelectItem>
              <SelectItem value="cable_all">Cable All</SelectItem>
              <SelectItem value="internet">Internet</SelectItem>
              <SelectItem value="internet_all">Internet All</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBox} onValueChange={setFilterBox}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Box Number" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Boxes</SelectItem>
              {boxes.map((box) => (
                <SelectItem key={box.id} value={box.name}>{box.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPackage} onValueChange={setFilterPackage}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Package" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Packages</SelectItem>
              {packages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDiscount} onValueChange={setFilterDiscount}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Discount" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Discounts</SelectItem>
              <SelectItem value="no_discount">No Discount</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="half">Half</SelectItem>
              <SelectItem value="full_free">Full Free</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSortBy} onValueChange={setFilterSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Default</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="internetId">Internet ID</SelectItem>
              <SelectItem value="installationDate">Install Date</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Connection Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.name}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Input
            placeholder="Search by name, ID, address, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => setIsImportExportOpen(true)}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import/Export
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedConnection(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Subscriber
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl shadow-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                    <Users className="h-4 w-4" />
                  </div>
                  {selectedConnection ? 'Edit' : 'Add'} Subscriber
                </DialogTitle>
              </DialogHeader>
              <ConnectionForm
                connection={selectedConnection}
                areas={areas}
                boxes={boxes}
                packages={packages}
                companies={companies}
                splitters={splitters}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
                isSaving={isSaving}
              />
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <DataTable columns={columns} data={paginatedData} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show entries</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
            </span>
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
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
              {currentPage + 3 < totalPages && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 p-0"
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
              />
              <Button
                variant="outline" size="sm"
                onClick={handlePageSubmit}
                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                className="h-8 px-2"
              >
                Go
              </Button>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
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
        itemName={selectedConnection?.name || ''}
      />

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        connections={connections}
        areas={areas}
        companies={companies}
      />
    </>
  );
}
