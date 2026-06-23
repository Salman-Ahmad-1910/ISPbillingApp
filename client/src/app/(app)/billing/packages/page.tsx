'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
      pkg.name.toLowerCase().includes(filter.toLowerCase()) ||
      pkg.speed.toLowerCase().includes(filter.toLowerCase()) ||
      pkg.dataLimit.toLowerCase().includes(filter.toLowerCase())
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
      <>
        <PageHeader
          title="Internet Packages"
          description="Define and manage your subscriber packages and pricing."
        />
        <Card>
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to manage packages.</CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Internet Packages"
        description="Define and manage your subscriber packages and pricing."
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedPackage(null)}>
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
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>List of available internet plans for the selected company.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Input
              placeholder="Filter by name, speed, or data limit..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Data Limit</TableHead>
                <TableHead className="text-right">Price (PKR)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getPaginatedData().map((pkg: Package) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>{pkg.speed}</TableCell>
                  <TableCell>{pkg.dataLimit}</TableCell>
                  <TableCell className="text-right">{pkg.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setIsDeleteDialogOpen(true);
                        }}
                        title="Delete package"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Advanced Pagination */}
          <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPackages.length)} of {filteredPackages.length} packages
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
    </>
  );
}
