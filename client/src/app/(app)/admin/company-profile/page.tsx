'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/context/company-context';
import { useQueryClient } from '@tanstack/react-query';
import { CompanyImageUpload } from '@/components/company-image-upload';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Phone, Mail, MapPin, Stamp, Upload, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function CompanyProfilePage() {
  const { companyId, updateCompany, companies, fetchCompanyDetails } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const company = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact1, setContact1] = useState('');
  const [contact2, setContact2] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [stampUploading, setStampUploading] = useState(false);
  const [stampVersion, setStampVersion] = useState(0);
  const stampInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setEmail(company.email || '');
      setContact1(company.contact1 || '');
      setContact2(company.contact2 || '');
      setAddress(company.address || '');
      setDescription(company.description || '');
    }
  }, [company]);

  if (!company) {
    return (
      <>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Company Profile</h1>
              <p className="text-sm text-muted-foreground">Manage your company's public information and settings.</p>
            </div>
          </div>
          <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
        </div>
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>Please select a company to view its profile.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const updatedData = {
      ...company,
      name,
      email,
      contact1,
      contact2,
      address,
      description,
    };
    await updateCompany(updatedData);
    setIsSaving(false);
  }

  const handleStampUpload = async (file: File) => {
    if (!companyId) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please select a JPG, JPEG, or PNG file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 5MB.' });
      return;
    }
    setStampUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post('/upload/company-stamp', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: 'Success', description: 'Company stamp uploaded successfully.' });
      setStampVersion(v => v + 1);
      fetchCompanyDetails(companyId);
      queryClient.invalidateQueries({ queryKey: ['admin/companies', companyId] });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.response?.data?.message || 'Failed to upload stamp.',
      });
    } finally {
      setStampUploading(false);
      if (stampInputRef.current) stampInputRef.current.value = '';
    }
  };

  const handleStampDelete = async () => {
    if (!companyId) return;
    try {
      await api.delete('/upload/company-stamp');
      toast({ title: 'Success', description: 'Company stamp removed successfully.' });
      setStampVersion(v => v + 1);
      fetchCompanyDetails(companyId);
      queryClient.invalidateQueries({ queryKey: ['admin/companies', companyId] });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove stamp.',
      });
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Company Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your company's public information and settings.</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>
      <form onSubmit={handleSaveChanges}>
        <div className="grid gap-8">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <CompanyImageUpload
                    currentImage={company.logo}
                    companyId={company.id}
                    onImageChange={(filename) => {
                      updateCompany({
                        ...company,
                        logo: filename
                      });
                    }}
                    className="w-20 h-20"
                  />
                  <CardTitle className="text-2xl">{name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {company.logo && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await api.delete('/upload/company-image');
                          updateCompany({
                            ...company,
                            logo: ''
                          });
                          toast({
                            title: 'Success',
                            description: 'Company image removed successfully.',
                          });
                        } catch (error: any) {
                          toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: error.response?.data?.message || 'Failed to remove image.',
                          });
                        }
                      }}
                      disabled={isSaving}
                    >
                      Remove Picture
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Contact Email</Label>
                  <Input id="company-email" type="email" value={email} disabled className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone1">Contact Phone 1</Label>
                  <Input id="company-phone1" type="tel" value={contact1} onChange={(e) => setContact1(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone2">Contact Phone 2</Label>
                  <Input id="company-phone2" type="tel" value={contact2} onChange={(e) => setContact2(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea id="company-address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-description">Description</Label>
                <Textarea id="company-description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Company Stamp</Label>
                <p className="text-xs text-muted-foreground">Stamp image shown on printed invoices.</p>
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-32 h-20 border-2 border-dashed rounded-lg bg-gray-50 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
                    onClick={() => stampInputRef.current?.click()}
                  >
                    {company.stamp ? (
                      <>
                        <img
                          src={`${api?.defaults?.baseURL}/uploads/company_stamps/${companyId}?v=${stampVersion}`}
                          alt="Company Stamp"
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                          <Button variant="secondary" size="sm" className="rounded-full w-8 h-8 p-0" onClick={(e) => { e.stopPropagation(); stampInputRef.current?.click(); }} disabled={stampUploading}>
                            <Upload className="h-3 w-3" />
                          </Button>
                          <Button variant="destructive" size="sm" className="rounded-full w-8 h-8 p-0" onClick={(e) => { e.stopPropagation(); handleStampDelete(); }} disabled={stampUploading}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        {stampUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Stamp className="h-5 w-5" />}
                        <span className="text-[10px]">Upload Stamp</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleStampUpload(file);
                    }}
                  />
                  {company.stamp && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStampDelete}
                      disabled={stampUploading}
                    >
                      Remove Stamp
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  );
}
