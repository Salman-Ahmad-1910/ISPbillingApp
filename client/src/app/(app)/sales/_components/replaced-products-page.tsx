'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileSpreadsheet, Printer, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { smartMatch } from '@/lib/search';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from './data-table';

interface ReplacedProductRow {
  saleId: string;
  date: string;
  subscriberName: string;
  productName: string;
  quantity: number;
  price: number;
  serialNumber: string;
  model: string;
}

const fmtPKR = (n: number) => new Intl.NumberFormat('en-US').format(Number(n) || 0);

function parseSerialList(s: string | undefined): string[] {
  return String(s || '')
    .split(/[\s,\-]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseModelList(s: string | undefined): string[] {
  return String(s || '')
    .split(/[\s,\n\r\t,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// The original sale (captured at replacement time). When a sale is replaced the
// row keeps its replacement product under `items` and the ORIGINAL products are
// stored under `replacedFrom` — the replaced page reports on those original
// entries.
function originalItemsOf(sale: any): any[] | undefined {
  const raw = sale?.replacedFrom;
  if (!raw) return undefined;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed?.items) ? parsed.items : undefined;
  } catch {
    return undefined;
  }
}

export function flatReplacedRows(sales: any[]): ReplacedProductRow[] {
  const rows: ReplacedProductRow[] = [];
  for (const sale of sales || []) {
    const entryItems = originalItemsOf(sale) || sale.items || [];
    for (const item of entryItems) {
      const sns = parseSerialList(item.serialNumber);
      const models = parseModelList(item.model);
      const qty = Number(item.quantity) || 0;
      rows.push({
        saleId: sale.id,
        date: sale.date || '',
        subscriberName: sale.subscriberName || 'Walk-in',
        productName: item.productName,
        quantity: qty,
        price: Number(item.price) || 0,
        serialNumber: sns.length > 0 ? sns.join(', ') : '',
        model: models.length > 0 ? models.join(', ') : item.model || '',
      });
    }
  }
  return rows;
}

export function ClientPage({ data }: { data: any[] }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    let rows = flatReplacedRows(data);
    if (fromDate) rows = rows.filter((r) => r.date.slice(0, 10) >= fromDate);
    if (toDate) rows = rows.filter((r) => r.date.slice(0, 10) <= toDate);
    if (search.trim()) {
      rows = rows.filter((r) =>
        smartMatch(search, [r.saleId, r.serialNumber], [r.subscriberName, r.productName, r.model]),
      );
    }
    return rows;
  }, [data, search, fromDate, toDate]);

  const hasActiveFilters = Boolean(search || fromDate || toDate);
  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
  };

  const columns = useMemo<ColumnDef<ReplacedProductRow>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.date ? new Date(row.original.date).toLocaleDateString() : 'N/A'}</div>
      ),
    },
    {
      accessorKey: 'subscriberName',
      header: 'Subscriber',
      cell: ({ row }) => <div className="truncate font-medium">{row.original.subscriberName}</div>,
    },
    {
      accessorKey: 'productName',
      header: 'Replacement Product',
      cell: ({ row }) => <div className="truncate max-w-[220px]" title={row.original.productName}>{row.original.productName}</div>,
    },
    {
      id: 'serialNumber',
      header: 'SN / MAC',
      cell: ({ row }) =>
        row.original.serialNumber ? (
          <div className="font-mono text-xs">{row.original.serialNumber}</div>
        ) : (
          <div className="text-xs text-muted-foreground">—</div>
        ),
    },
    {
      id: 'model',
      header: 'Model',
      cell: ({ row }) =>
        row.original.model ? (
          <div className="text-xs text-sky-700 dark:text-sky-300">{row.original.model}</div>
        ) : (
          <div className="text-xs text-muted-foreground">—</div>
        ),
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => <div className="text-sm">{row.original.quantity}</div>,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          PKR {fmtPKR(row.original.price * row.original.quantity)}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: () => (
        <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
          Replaced
        </Badge>
      ),
    },
  ], []);

  const handleExportXlsx = () => {
    const exportData = filtered.map((r) => ({
      'Sale ID': r.saleId,
      Date: r.date ? new Date(r.date).toLocaleDateString() : '',
      Subscriber: r.subscriberName,
      Product: r.productName,
      Quantity: r.quantity,
      'Unit Price': r.price,
      Amount: r.price * r.quantity,
      'SN / MAC': r.serialNumber,
      Model: r.model,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Replaced Products');
    ws['!cols'] = [
      { wch: 38 }, { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 9 },
      { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 16 },
    ];
    XLSX.writeFile(wb, `replaced_products_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Export complete', description: `Exported ${filtered.length} replaced product rows.` });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;
    const rowsHtml = filtered
      .map(
        (r) => `
          <tr>
            <td>${r.saleId}</td>
            <td>${r.date ? new Date(r.date).toLocaleDateString() : ''}</td>
            <td>${r.subscriberName}</td>
            <td>${r.productName}</td>
            <td>${r.serialNumber || '—'}</td>
            <td>${r.model || '—'}</td>
            <td>${r.quantity}</td>
            <td style="text-align:right">PKR ${fmtPKR(r.price * r.quantity)}</td>
          </tr>`,
      )
      .join('');
    printWindow.document.write(`
      <html><head><title>Replaced Products</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f3e8ff; font-weight: 600; }
        tr:nth-child(even) { background: #fafafa; }
      </style></head><body>
      <h1>Replaced Products Report</h1>
      <div class="meta">Generated ${new Date().toLocaleString()} &middot; ${filtered.length} row(s)</div>
      <table>
        <thead><tr>
          <th>Sale ID</th><th>Date</th><th>Subscriber</th><th>Product</th>
          <th>SN / MAC</th><th>Model</th><th>Qty</th><th>Amount</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Replaced Sale Records</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 pb-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product, customer, SN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full" />
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="default" onClick={clearFilters} className="text-xs">
                  <X className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" size="default" onClick={handleExportXlsx} className="text-xs">
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Excel
              </Button>
              <Button variant="outline" size="default" onClick={handlePrint} className="text-xs">
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {filtered.length} replaced product {filtered.length === 1 ? 'row' : 'rows'}
            </p>
          </div>
        </div>
        <div className="p-4">
          <DataTable columns={columns} data={filtered} />
        </div>
      </CardContent>
    </Card>
  );
}