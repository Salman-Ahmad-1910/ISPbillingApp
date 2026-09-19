'use client'

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { smartSearch } from '@/lib/search';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { exportToExcel, printTableReport, type ExportColumn } from '@/components/shared/table-export';

import { DataTable } from './data-table';
import { columns, type StockProduct, type PurchasedProductLine } from './columns';

interface ClientPageProps {
    data: StockProduct[];
}

function firstSN(raw?: string): string {
    if (!raw) return '';
    const sns = raw.split(/[\s,\-]+/).map(s => s.trim()).filter(Boolean);
    if (sns.length === 0) return '';
    if (sns.length === 1) return sns[0];
    return `${sns[0]} (${sns.length})`;
}

function renderVersions(row: StockProduct) {
    return (
        <div className="px-2 py-1">
            <div className="mb-2 text-xs font-medium">
                Purchase lines for <span className="font-semibold">{row.name}</span>
            </div>
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                    <thead className="bg-muted/60">
                        <tr>
                            <th className="px-2 py-1.5 text-left font-medium">#</th>
                            <th className="px-2 py-1.5 text-left font-medium">Purchase #</th>
                            <th className="px-2 py-1.5 text-left font-medium">Date</th>
                            <th className="px-2 py-1.5 text-left font-medium">Vendor</th>
                            <th className="px-2 py-1.5 text-left font-medium">Batch</th>
                            <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                            <th className="px-2 py-1.5 text-left font-medium">SN / MAC</th>
                            <th className="px-2 py-1.5 text-left font-medium">Model</th>
                            <th className="px-2 py-1.5 text-right font-medium">Unit Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {row.lines.map((ln: PurchasedProductLine, idx: number) => (
                            <tr key={ln.purchaseItemId || idx} className="border-t">
                                <td className="px-2 py-1 font-mono text-muted-foreground">{idx + 1}</td>
                                <td className="px-2 py-1">{ln.purchaseNumber || ln.billId || '—'}</td>
                                <td className="px-2 py-1">{ln.purchaseDate || '—'}</td>
                                <td className="px-2 py-1">{ln.vendorName || '—'}</td>
                                <td className="px-2 py-1">{ln.batch || '—'}</td>
                                <td className="px-2 py-1 text-right font-mono">{ln.quantity}</td>
                                <td className="px-2 py-1 font-mono text-muted-foreground" title={ln.serialNumber}>
                                    {firstSN(ln.serialNumber) || '—'}
                                </td>
                                <td className="px-2 py-1">{ln.model || '—'}</td>
                                <td className="px-2 py-1 text-right">PKR {new Intl.NumberFormat('en-US').format(ln.purchasePrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function ClientPage({ data }: ClientPageProps) {
    const [items, setItems] = useState<StockProduct[]>(data);
    const [filter, setFilter] = useState('');

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    useEffect(() => {
        setItems(data);
    }, [data]);

    const filteredData = useMemo(
        () =>
            smartSearch(filter, items, (item) => [
                [item.name],
                [item.serialNumber],
                [item.vendorName || ''],
                [item.purchaseNumber || ''],
            ]),
        [items, filter],
    );

    const totalPages = Math.ceil(filteredData.length / pageSize);

    const getPaginatedData = () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredData.slice(startIndex, endIndex);
    };

    const exportColumns: ExportColumn[] = [
        { key: 'name', header: 'Product' },
        { key: 'vendorName', header: 'Vendor' },
        { key: 'purchaseDate', header: 'Last Purchased' },
        { key: 'totalPurchased', header: 'Purchased' },
        { key: 'totalSold', header: 'Sold' },
        { key: 'stock', header: 'Stock' },
        { key: 'price', header: 'Price' },
    ];

    const handleExportXlsx = () => {
        exportToExcel(filteredData, exportColumns, `Stock-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Stock');
    };

    const handleExportPdf = () => {
        printTableReport({
            title: 'Stock Report',
            subtitle: `As of ${new Date().toLocaleDateString()}`,
            company: null,
            columns: exportColumns,
            rows: getPaginatedData(),
        });
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

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Filter by product, SN/MAC or vendor..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Button variant="outline" onClick={handleExportXlsx}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPdf}>
                        <FileDown className="mr-2 h-4 w-4" />
                        PDF
                    </Button>
                </div>
            </div>

            {filteredData.length > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                    Click a row to expand its purchase history. Products bought more than once show a badge under Purchases.
                </p>
            )}

            <DataTable
                columns={columns}
                data={getPaginatedData()}
                getRowCanExpand={(row) => (row.lines?.length || 0) > 1}
                renderExpanded={(row) => renderVersions(row)}
            />

            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                    Showing {filteredData.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} items
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
    )
}