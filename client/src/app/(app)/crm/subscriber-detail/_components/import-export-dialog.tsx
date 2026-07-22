'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Connection, Area, Company } from '@/lib/types';
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  connections: Connection[];
  areas: Area[];
  companies: Company[];
}

const TEMPLATE_HEADERS = [
  'Internet ID*',
  'Name*',
  'Address',
  'Cell',
  'Mobile',
  'Sublocality',
  'Connection Provider',
  'Connection Type',
  'Box Number',
  'Package Cable',
  'Cable Discount',
  'Cable Amount',
  'Package Internet',
  'Internet Discount',
  'Internet Amount',
  'Installation Amount',
  'Other Amount',
  'Installation Date',
  'Recharge Date',
  'Status',
];

const HEADER_MAP: Record<string, string> = {
  'Internet ID*': 'internetId',
  'Name*': 'name',
  'Address': 'address',
  'Cell': 'cell',
  'Mobile': 'mobile',
  'Sublocality': 'sublocalityName',
  'Connection Provider': 'connectionProvider',
  'Connection Type': 'connectionType',
  'Box Number': 'boxNumber',
  'Package Cable': 'packageCable',
  'Cable Discount': 'discount',
  'Cable Amount': 'amount',
  'Package Internet': 'packageInternet',
  'Internet Discount': 'sameDiscount',
  'Internet Amount': 'sameAmount',
  'Installation Amount': 'installationAmount',
  'Other Amount': 'otherAmount',
  'Installation Date': 'installationDate',
  'Recharge Date': 'rechargeDate',
  'Status': 'status',
};

const EXAMPLE_ROW = [
  'INT-001',
  'Ahmed Khan',
  'House 123, Street 5',
  '0300-1234567',
  '0312-7654321',
  'DHA Phase 5',
  'My ISP',
  'both',
  'BOX-01',
  'Basic Cable',
  'no_discount',
  '1500',
  'Basic Internet',
  'no_discount',
  '2000',
  '5000',
  '1000',
  '2026-01-15',
  '2026-01-15',
  'active',
];

export function ImportExportDialog({ isOpen, onClose, connections, areas, companies }: ImportExportDialogProps) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState('export');

  const handleExport = useCallback(() => {
    const exportData = connections.map((c, idx) => {
      const areaName = areas.find(a => a.id === c.sublocalityId)?.subLocality || areas.find(a => a.id === c.sublocalityId)?.locality || '';
      return {
        '#': idx + 1,
        'Internet ID': c.internetId,
        'Name': c.name,
        'Address': c.address || '',
        'Cell': c.cell || '',
        'Mobile': c.mobile || '',
        'Sublocality': areaName,
        'Connection Provider': c.connectionProvider || '',
        'Connection Type': c.connectionType,
        'Box Number': c.boxNumber || '',
        'Package Cable': c.packageCable || '',
        'Cable Discount': c.discount || '',
        'Cable Amount': c.amount || 0,
        'Package Internet': c.packageInternet || '',
        'Internet Discount': c.sameDiscount || '',
        'Internet Amount': c.sameAmount || 0,
        'Installation Amount': c.installationAmount || 0,
        'Other Amount': c.otherAmount || 0,
        'Installation Date': c.installationDate || '',
        'Recharge Date': c.rechargeDate || '',
        'Status': c.status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subscribers');

    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 22 }, { wch: 30 }, { wch: 16 },
      { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
      { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 16 },
      { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
    ];

    XLSX.writeFile(wb, `subscribers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Export complete', description: `Exported ${connections.length} subscribers.` });
  }, [connections, areas, toast]);

  const handleDownloadTemplate = useCallback(() => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, EXAMPLE_ROW]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    ws['!cols'] = [
      { wch: 15 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 16 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
      { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
      { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
    ];

    XLSX.writeFile(wb, 'subscriber_import_template.xlsx');
    toast({ title: 'Template downloaded', description: 'Fill in the template and upload it back.' });
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importFile || !companyId) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rows.length === 0) {
        toast({ variant: 'destructive', title: 'Empty file', description: 'The uploaded file contains no data rows.' });
        setIsImporting(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      const mappedHeaders = headers.map(h => HEADER_MAP[h] || null);

      const hasRequiredHeaders = headers.some(h => h.includes('Internet ID')) && headers.some(h => h.includes('Name'));
      if (!hasRequiredHeaders) {
        toast({ variant: 'destructive', title: 'Invalid template', description: 'File must have "Internet ID*" and "Name*" columns. Please download the template first.' });
        setIsImporting(false);
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const internetId = String(row[headers.find(h => h.includes('Internet ID')) || ''] || '').trim();
        const name = String(row[headers.find(h => h === 'Name*' || h === 'Name') || ''] || '').trim();

        if (!internetId || !name) {
          failed++;
          errors.push(`Row ${rowNum}: Missing required fields (Internet ID or Name)`);
          continue;
        }

        const sublocalityName = String(row[headers.find(h => h === 'Sublocality') || ''] || '').trim();
        let sublocalityId = '';
        if (sublocalityName) {
          const match = areas.find(a =>
            (a.subLocality || '').toLowerCase() === sublocalityName.toLowerCase() ||
            (a.locality || '').toLowerCase() === sublocalityName.toLowerCase()
          );
          if (match) sublocalityId = match.id;
        }

        const connectionType = String(row[headers.find(h => h === 'Connection Type') || ''] || 'both').trim() || 'both';
        const status = String(row[headers.find(h => h === 'Status') || ''] || 'active').trim() || 'active';

        const payload: Record<string, unknown> = {
          internetId,
          name,
          address: String(row[headers.find(h => h === 'Address') || ''] || '').trim() || '',
          cell: String(row[headers.find(h => h === 'Cell') || ''] || '').trim() || '',
          mobile: String(row[headers.find(h => h === 'Mobile') || ''] || '').trim() || '',
          sublocalityId,
          connectionProvider: String(row[headers.find(h => h === 'Connection Provider') || ''] || '').trim() || '',
          connectionType: ['both', 'internet', 'tv_cable'].includes(connectionType) ? connectionType : 'both',
          boxNumber: String(row[headers.find(h => h === 'Box Number') || ''] || '').trim() || '',
          packageCable: String(row[headers.find(h => h === 'Package Cable') || ''] || '').trim() || '',
          discount: String(row[headers.find(h => h === 'Cable Discount') || ''] || '').trim() || '',
          amount: parseFloat(String(row[headers.find(h => h === 'Cable Amount') || ''] || '')) || 0,
          packageInternet: String(row[headers.find(h => h === 'Package Internet') || ''] || '').trim() || '',
          sameDiscount: String(row[headers.find(h => h === 'Internet Discount') || ''] || '').trim() || '',
          sameAmount: parseFloat(String(row[headers.find(h => h === 'Internet Amount') || ''] || '')) || 0,
          installationAmount: parseFloat(String(row[headers.find(h => h === 'Installation Amount') || ''] || '')) || 0,
          otherAmount: parseFloat(String(row[headers.find(h => h === 'Other Amount') || ''] || '')) || 0,
          installationDate: String(row[headers.find(h => h === 'Installation Date') || ''] || '').trim() || '',
          rechargeDate: String(row[headers.find(h => h === 'Recharge Date') || ''] || '').trim() || '',
          status: ['active', 'inactive', 'deactivated', 'suspended'].includes(status) ? status : 'active',
          companyId,
        };

        try {
          await api.post(`/admin/connections?companyId=${companyId}`, payload);
          success++;
        } catch (err: unknown) {
          failed++;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Row ${rowNum} (${internetId}): ${msg}`);
        }
      }

      setImportResult({ success, failed, errors });
      queryClient.invalidateQueries({ queryKey: ['admin/connections', companyId] });

      if (success > 0) {
        toast({ title: 'Import complete', description: `${success} subscribers imported successfully.` });
      }
      if (failed > 0) {
        toast({ variant: 'destructive', title: 'Import issues', description: `${failed} rows failed. See details in the dialog.` });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Parse error', description: 'Could not read the Excel file. Please ensure it is a valid .xlsx file.' });
    } finally {
      setIsImporting(false);
    }
  }, [importFile, companyId, areas, queryClient, toast]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setImportFile(null);
      setImportResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Subscriber Import and Export
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Export existing subscribers or Import new Subscribers from Excel file
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export Subscribers</TabsTrigger>
            <TabsTrigger value="import">Import Subscribers</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div>
              <h3 className="font-bold text-base">Export Subscribers</h3>
              <p className="text-sm text-muted-foreground mt-1">Export all subscribers of your Company to an Excel file</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              {connections.length} subscriber(s) will be exported.
            </div>
            <Button onClick={handleExport} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base">Import Subscribers</h3>
                <p className="text-sm text-muted-foreground mt-1">Import subscribers from an Excel file</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0">
                <Download className="mr-2 h-3.5 w-3.5" />
                Download Template
              </Button>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              {importFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                  <p className="font-medium">{importFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Drop your Excel file here or <span className="text-emerald-600 font-medium">browse</span></p>
                  <p className="text-xs text-muted-foreground">Supports .xlsx and .xls files</p>
                </div>
              )}
            </div>

            {importFile && !importResult && (
              <Button onClick={handleImport} disabled={isImporting} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 w-full">
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Subscribers
                  </>
                )}
              </Button>
            )}

            {importResult && (
              <div className={`rounded-lg p-4 space-y-2 ${importResult.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="flex items-center gap-2">
                  {importResult.failed > 0 ? (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <span className="font-semibold">
                    {importResult.success} imported, {importResult.failed} failed
                  </span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
