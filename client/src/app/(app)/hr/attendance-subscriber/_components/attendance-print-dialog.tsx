'use client';

import type { Attendance, Company } from '@/lib/types';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import api from '@/lib/api';

export interface AttendanceSummary {
    staffId: string;
    name: string;
    present: number;
    absent: number;
    late: number;
    leave: number;
    total: number;
}

interface AttendancePrintDialogProps {
    type: 'monthly' | 'daily';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    company?: Company;
    month: string;
    year: number;
    summaryRows: AttendanceSummary[];
    records: Attendance[];
}

const STATUS_LABELS: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    leave: 'Leave',
};

export function AttendancePrintDialog({
    type,
    open,
    onOpenChange,
    company,
    month,
    year,
    summaryRows,
    records,
}: AttendancePrintDialogProps) {
    useEffect(() => {
        if (!open) return;
        const printStyles = `
            @media print {
                body * { visibility: hidden; }
                .print-attendance-container, .print-attendance-container * { visibility: visible; }
                .print-attendance-container {
                    position: absolute !important;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                .no-print { display: none !important; }
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                html, body { overflow: hidden !important; }
                @page { size: A4; margin: 15mm; }
                * { box-shadow: none !important; text-shadow: none !important; }
                table, th, td { border: 1px solid #d1d5db !important; }
            }
        `;
        const styleElement = document.createElement('style');
        styleElement.textContent = printStyles;
        document.head.appendChild(styleElement);
        return () => {
            if (document.head.contains(styleElement)) {
                document.head.removeChild(styleElement);
            }
        };
    }, [open]);

    const logoUrl = company?.logo
        ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}`
        : null;

    const stampUrl = company?.stamp
        ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}`
        : null;

    const isMonthly = type === 'monthly';
    const title = isMonthly ? 'ATTENDANCE REPORT' : 'ATTENDANCE DETAILS';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0">
                <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold">
                        {isMonthly ? 'Monthly Attendance Report' : 'Daily Attendance Details'} - Print Preview
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={() => window.print()}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Close
                        </Button>
                    </div>
                </div>

                <div className="print-attendance-container bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto">
                    <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8">
                        <div className="flex items-start gap-4">
                            {logoUrl && (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h1>
                                {company?.address && <p className="text-gray-600 text-sm mt-1">{company.address}</p>}
                                {company?.contact1 && <p className="text-gray-600 text-sm">Phone: {company.contact1}</p>}
                                {company?.email && <p className="text-gray-600 text-sm">Email: {company.email}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-extrabold tracking-wider text-blue-700">{title}</h2>
                            <div className="mt-3 space-y-1 text-sm">
                                <p className="text-gray-500">Month: <span className="text-gray-900 font-semibold">{month} {year}</span></p>
                                <p className="text-gray-500">Generated: <span className="text-gray-900 font-semibold">{new Date().toLocaleDateString()}</span></p>
                                <p className="text-gray-500">Records: <span className="text-gray-900 font-semibold">{isMonthly ? summaryRows.length : records.length}</span></p>
                            </div>
                        </div>
                    </header>

                    {isMonthly ? (
                        <table className="w-full text-left border-collapse text-sm mb-8">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">#</th>
                                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Staff</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Present</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Absent</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Late</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Leave</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="border border-gray-300 p-4 text-center text-gray-500">
                                            No attendance records found for {month} {year}.
                                        </td>
                                    </tr>
                                ) : (
                                    summaryRows.map((row, index) => (
                                        <tr key={row.staffId} className="hover:bg-blue-50/50">
                                            <td className="border border-gray-300 p-3">{index + 1}</td>
                                            <td className="border border-gray-300 p-3 font-semibold">{row.name}</td>
                                            <td className="border border-gray-300 p-3 text-center">{row.present}</td>
                                            <td className="border border-gray-300 p-3 text-center">{row.absent}</td>
                                            <td className="border border-gray-300 p-3 text-center">{row.late}</td>
                                            <td className="border border-gray-300 p-3 text-center">{row.leave}</td>
                                            <td className="border border-gray-300 p-3 text-center font-semibold">{row.total}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {summaryRows.length > 0 && (
                                <tfoot>
                                    <tr className="bg-gray-50 font-semibold">
                                        <td colSpan={2} className="border border-gray-300 p-3 text-right uppercase text-xs">Total</td>
                                        <td className="border border-gray-300 p-3 text-center">{summaryRows.reduce((s, r) => s + r.present, 0)}</td>
                                        <td className="border border-gray-300 p-3 text-center">{summaryRows.reduce((s, r) => s + r.absent, 0)}</td>
                                        <td className="border border-gray-300 p-3 text-center">{summaryRows.reduce((s, r) => s + r.late, 0)}</td>
                                        <td className="border border-gray-300 p-3 text-center">{summaryRows.reduce((s, r) => s + r.leave, 0)}</td>
                                        <td className="border border-gray-300 p-3 text-center">{summaryRows.reduce((s, r) => s + r.total, 0)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse text-sm mb-8">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Date</th>
                                    <th className="border border-gray-300 p-3 text-xs font-semibold uppercase tracking-wider">Staff</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Check In</th>
                                    <th className="border border-gray-300 p-3 text-center text-xs font-semibold uppercase tracking-wider">Check Out</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="border border-gray-300 p-4 text-center text-gray-500">
                                            No attendance records found for {month} {year}.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((record) => (
                                        <tr key={record.id} className="hover:bg-blue-50/50">
                                            <td className="border border-gray-300 p-3">{record.date}</td>
                                            <td className="border border-gray-300 p-3 font-semibold">{record.staffName || '—'}</td>
                                            <td className="border border-gray-300 p-3 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                                    record.status === 'present' ? 'bg-green-100 text-green-800' :
                                                    record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                                    record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {STATUS_LABELS[record.status] || record.status}
                                                </span>
                                            </td>
                                            <td className="border border-gray-300 p-3 text-center">{record.checkIn || '—'}</td>
                                            <td className="border border-gray-300 p-3 text-center">{record.checkOut || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    <footer className="mt-12 pt-6 border-t border-gray-300">
                        <div className="flex justify-between items-end">
                            <div style={{ textAlign: 'center' }}>
                                {stampUrl ? (
                                    <img
                                        src={stampUrl}
                                        alt="Company Stamp"
                                        style={{ maxHeight: '80px', maxWidth: '180px', objectFit: 'contain', marginBottom: '5px' }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
                                )}
                                <p className="text-xs text-gray-500">Company Stamp</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
                                <p className="text-xs text-gray-500">Authorized Signature</p>
                            </div>
                        </div>
                        <div className="text-center text-gray-600 mt-6">
                            <p className="font-bold text-lg text-gray-900">{company?.name}</p>
                            {company?.contact1 && <p className="text-sm mt-1">Phone: {company.contact1}{company?.email ? ` | Email: ${company.email}` : ''}</p>}
                            <p className="text-xs text-gray-400 mt-2">Generated on {new Date().toLocaleString()}</p>
                        </div>
                    </footer>
                </div>
            </DialogContent>
        </Dialog>
    );
}
