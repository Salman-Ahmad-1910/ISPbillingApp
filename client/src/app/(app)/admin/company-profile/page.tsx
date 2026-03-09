'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/context/company-context';
import { CompanyImageUpload } from '@/components/company-image-upload';
import Image from 'next/image';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Image as ImageIcon, Phone, Mail, MapPin, AlignLeft } from 'lucide-react';
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
  const company = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies]);

  // State for form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact1, setContact1] = useState('');
  const [contact2, setContact2] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        <PageHeader
          title="Company Profile"
          description="Manage your company's public information and settings."
        />
        <Card>
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


  return (
    <>
      <PageHeader
        title="Company Profile"
        description="Manage your company's public information and settings."
      />
      <form onSubmit={handleSaveChanges}>
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <CompanyImageUpload
                    currentImage={company.logo}
                    companyId={company.id}
                    onImageChange={(filename) => {
                      // Update company data with new image
                      updateCompany({
                        ...company,
                        logo: filename
                      });
                    }}
                    className="w-20 h-20"
                  />
                  <CardTitle className="text-2xl">{name}</CardTitle>
                  {/* <div className="space-y-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{email}</span>
                        </div>
                      )}
                      {contact1 && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{contact1}</span>
                        </div>
                      )}
                      {contact2 && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{contact2}</span>
                        </div>
                      )}
                    </div>
                    {address && (
                      <div className="flex items-start gap-1 text-sm text-muted-foreground max-w-md">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{address}</span>
                      </div>
                    )}
                    {description && (
                      <div className="flex items-start gap-1 text-sm text-muted-foreground max-w-md">
                        <AlignLeft className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{description}</span>
                      </div>
                    )}
                  </div> */}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isSaving}>
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
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  );
}
