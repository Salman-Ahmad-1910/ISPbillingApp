'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit2, Receipt, Package as PackageIcon, Wifi, Database, Building, Tag } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { smartMatch } from '@/lib/search';
import { useToast } from '@/hooks/use-toast';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useCompany } from '@/context/company-context';
import type { Package } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PackageForm } from './_components/package-form';

export default function PackagesPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState('');
  
  // Advanced pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageInput, setPageInput] = useState<string>('');

  const { data: companyPackages = [], isLoading } = useGenericQuery<Package>('billing/packages', companyId ?? undefined);
  const { data: subscribers = [] } = useGenericQuery<any>('subscribers', companyId ?? undefined);

  // Check if package has subscribers using it
  const getPackageSubscribers = (packageId: string) => {
    return subscribers.filter((sub: any) => sub.packageId === packageId);
  };

  // Filter packages
  const filteredPackages = useMemo(() => {
    if (!Array.isArray(companyPackages)) return [];
    return companyPackages.filter((pkg: Package) =>
      smartMatch(filter, [pkg.id], [pkg.name, pkg.companyName, pkg.packageType])
    );
  }, [companyPackages, filter]);

  // Pagination helpers
  const totalPages = Math.ceil(filteredPackages.length / pageSize);

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPackages.slice(startIndex, endIndex);
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
  useMemo(() => {
    setCurrentPage(1);
  }, [filter]);

  const totalPackages = useMemo(() => {
    if (!Array.isArray(companyPackages)) return 0;
    return companyPackages.length;
  }, [companyPackages]);

  const tvCableCount = useMemo(() => {
    if (!Array.isArray(companyPackages)) return 0;
    return companyPackages.filter((pkg: Package) => pkg.packageType === 'TV Cable').length;
  }, [companyPackages]);

  const internetCount = useMemo(() => {
    if (!Array.isArray(companyPackages)) return 0;
    return companyPackages.filter((pkg: Package) => pkg.packageType === 'Internet').length;
  }, [companyPackages]);

  const handleSave = async (data: Omit<Package, 'id' | 'companyId'>) => {
    setIsSaving(true);
    try {
      if (selectedPackage) {
        await api.put(`/billing/packages/${selectedPackage.id}?companyId=${companyId}`, data);
        toast({ title: "Success", description: "Package updated successfully." });
      } else {
        await api.post(`/billing/packages?companyId=${companyId}`, { ...data, companyId });
        toast({ title: "Success", description: "Package added successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ['billing/packages', companyId] });
      setIsFormOpen(false);
      setSelectedPackage(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: error.response?.data?.message || "Failed to save package"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedPackage) {
      const inUseCount = getPackageSubscribers(selectedPackage.id).length;
      try {
        await api.delete(`/billing/packages/${selectedPackage.id}?companyId=${companyId}`);
        toast({
          title: "Success",
          description: inUseCount > 0
            ? `Package deleted. ${inUseCount} subscriber(s) keep their stored package name.`
            : "Package deleted successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ['billing/packages', companyId] });
        setIsDeleteDialogOpen(false);
        setSelectedPackage(null);
      } catch (error: any) {
        console.error('Delete error:', error);
        let errorMessage = "Failed to delete package";

        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }

        // Check for foreign key constraint error
        if (errorMessage.includes("foreign key constraint") || errorMessage.includes("violates foreign key")) {
          errorMessage = "Cannot delete package: It is being used by one or more subscribers. Please reassign or delete those subscribers first.";
        }

        toast({
          variant: 'destructive',
          title: "Error",
          description: errorMessage
        });
      }
    }
  };

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Internet Packages</h1>
            <p className="text-sm text-muted-foreground">Define and manage your subscriber packages and pricing.</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to manage packages.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Internet Packages</h1>
          <p className="text-sm text-muted-foreground">Define and manage your subscriber packages and pricing.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-pink-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <PackageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Packages</p>
              <p className="text-2xl font-bold">{totalPackages}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Internet Packages</p>
              <p className="text-2xl font-bold">{internetCount}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">TV Cable Packages</p>
              <p className="text-2xl font-bold">{tvCableCount}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subscribers on Packages</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Array.isArray(subscribers) ? subscribers.length : 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Input
          placeholder="Filter by name or company..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedPackage(null)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPackage ? 'Edit' : 'Add'} Package</DialogTitle>
            </DialogHeader>
            <PackageForm
              pkg={selectedPackage}
              onSave={handleSave}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* TV Cable Packages */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2 text-purple-600 dark:text-purple-400">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>TV Cable Packages</CardTitle>
              <CardDescription>Packages for cable TV subscribers ({tvCableCount} packages)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package ID</TableHead>
                <TableHead>Package Name</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead className="text-right">Sale Price (PKR)</TableHead>
                <TableHead className="text-right">Purchase Price (PKR)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.filter((pkg: Package) => pkg.packageType === 'TV Cable').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No TV Cable packages found. Click &quot;Add Package&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackages.filter((pkg: Package) => pkg.packageType === 'TV Cable').map((pkg: Package) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-mono text-sm">{pkg.packageNumber || '-'}</TableCell>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.companyName || '-'}</TableCell>
                    <TableCell className="text-right">{(pkg.salePrice || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(pkg.purchasePrice || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPackage(pkg); setIsFormOpen(true); }} className="transition-all duration-300 hover:scale-105">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => { setSelectedPackage(pkg); setIsDeleteDialogOpen(true); }} className="transition-all duration-300 hover:scale-105">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Internet Packages */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2 text-blue-600 dark:text-blue-400">
              <Wifi className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Internet Packages</CardTitle>
              <CardDescription>Packages for internet subscribers ({internetCount} packages)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package ID</TableHead>
                <TableHead>Package Name</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead className="text-right">Sale Price (PKR)</TableHead>
                <TableHead className="text-right">Purchase Price (PKR)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.filter((pkg: Package) => pkg.packageType === 'Internet').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No Internet packages found. Click &quot;Add Package&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackages.filter((pkg: Package) => pkg.packageType === 'Internet').map((pkg: Package) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-mono text-sm">{pkg.packageNumber || '-'}</TableCell>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.companyName || '-'}</TableCell>
                    <TableCell className="text-right">{(pkg.salePrice || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(pkg.purchasePrice || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPackage(pkg); setIsFormOpen(true); }} className="transition-all duration-300 hover:scale-105">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => { setSelectedPackage(pkg); setIsDeleteDialogOpen(true); }} className="transition-all duration-300 hover:scale-105">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDelete}
        itemName={selectedPackage?.name}
        warning={
          selectedPackage && getPackageSubscribers(selectedPackage.id).length > 0
            ? `${getPackageSubscribers(selectedPackage.id).length} subscriber(s) are currently on this package. They will keep their stored package name, but will no longer be linked to this package.`
            : undefined
        }
      />
    </div>
  );
}
