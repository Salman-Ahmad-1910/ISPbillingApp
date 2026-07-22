'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: Array<{
    row: number;
    column: string;
    error: string;
  }>;
  message: string;
}

export function UserImportExport() {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      console.log('Export mutation starting...');
      const response = await api.get('/admin/users/export', {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      console.log('Export successful');
      toast.success('Users exported successfully');
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast.error('Failed to export users');
    },
    onSettled: () => {
      console.log('Export settled');
      setIsExporting(false);
    },
  });

  // Template download mutation
  const templateMutation = useMutation({
    mutationFn: async () => {
      console.log('Template mutation starting...');
      const response = await api.get('/admin/users/template', {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      console.log('Template download successful');
      toast.success('Template downloaded successfully');
    },
    onError: (error) => {
      console.error('Template error:', error);
      toast.error('Failed to download template');
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('Import mutation starting...');
      const response = await api.post('/admin/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      if (result.success) {
        toast.success(`Successfully imported ${result.importedRows} users`);
      } else {
        toast.error(`Import completed with ${result.errors.length} errors`);
      }
    },
    onError: (error: any) => {
      const data = error.response?.data;
      const message = data?.message || 'Failed to import users';

      // If the server returned an ImportResult-shaped payload, surface its details
      if (data && typeof data.success === 'boolean') {
        setImportResult(data as ImportResult);
      }

      toast.error(message);
      console.error('Import error:', error);
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  const handleExport = () => {
    console.log('Export clicked, companyId:', companyId);
    if (!companyId) {
      toast.error('Company not selected');
      return;
    }
    setIsExporting(true);
    exportMutation.mutate();
  };

  const handleDownloadTemplate = () => {
    console.log('Template download clicked, companyId:', companyId);
    if (!companyId) {
      toast.error('Company not selected');
      return;
    }
    templateMutation.mutate();
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      toast.error('Please select a valid Excel file (.xlsx)');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    if (!companyId) {
      toast.error('Company not selected');
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    importMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Import/Export</h2>
          <p className="text-muted-foreground">
            Export existing users or import new users from Excel files
          </p>
        </div>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Users
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Export Users to Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export all users from your company to an Excel file. This includes user details
                in format: S.No, Name, User Name, Package ID, Contact, Address, Role.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleExport}
                  disabled={isExporting || !companyId}
                  className="flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export Users
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={templateMutation.isPending || !companyId}
                  className="flex items-center gap-2"
                >
                  {templateMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Download Template
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Users from Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Excel File</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    {selectedFile ? selectedFile.name : 'Drop Excel file here or click to browse'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports .xlsx files only. Max file size: 10MB
                  </p>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isImporting}
                  >
                    Browse Files
                  </Button>
                </div>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <Badge variant="secondary">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || !companyId}
                    className="flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import Users
                      </>
                    )}
                  </Button>
                </div>
              )}

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="text-sm">Processing import...</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}

              {importResult && (
                <Card className={importResult.success ? 'border-green-200' : 'border-red-200'}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      {importResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <h3 className="font-semibold">
                        {importResult.success ? 'Import Successful' : 'Import Completed with Errors'}
                      </h3>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm">
                        <strong>Total Rows:</strong> {importResult.totalRows}
                      </p>
                      <p className="text-sm">
                        <strong>Imported Rows:</strong> {importResult.importedRows}
                      </p>
                      {importResult.errors.length > 0 && (
                        <p className="text-sm text-red-600">
                          <strong>Errors:</strong> {importResult.errors.length}
                        </p>
                      )}
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Validation Errors</Label>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {importResult.errors.map((error, index) => (
                            <Alert key={index} className="py-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                Row {error.row}, Column {error.column}: {error.error}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-4">
                      {importResult.message}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Make sure your Excel file follows the required format.
                  Download the template to see the expected structure. Required fields: S.No, Name,
                  User Name (email format), Package ID, Contact, Address, Password, Role. Role can be:
                  admin, recovery_officer, dealer, staff, sub_dealer, manager. <strong>User passwords
                  are required</strong> — each user will be created with the password you provide so they
                  can log in. Passwords must be at least 6 characters.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
