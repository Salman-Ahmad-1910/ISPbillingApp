'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import {
    ClipboardList,
    CheckCircle2,
    XCircle,
    Clock,
    Palmtree,
    Search,
    Filter,
    Printer,
    Fingerprint,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import type { Attendance, Company } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { AttendancePrintDialog, type AttendanceSummary } from './_components/attendance-print-dialog';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    present: { label: 'Present', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    absent: { label: 'Absent', className: 'bg-red-100 text-red-700 border-red-200' },
    late: { label: 'Late', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    leave: { label: 'Leave', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const formatDate = (date: string) => {
    if (!date) return '—';
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function AttendanceReportPage() {
    const { companyId, companies } = useCompany();

    const currentYear = new Date().getFullYear();
    const [month, setMonth] = useState<string>(() => new Date().toLocaleString('en-US', { month: 'long' }));
    const [year, setYear] = useState<number>(currentYear);
    const [applied, setApplied] = useState<{ month: string; year: number } | null>(null);
    const [printType, setPrintType] = useState<'monthly' | 'daily' | null>(null);

    const { data: attendanceResponse = [], isLoading: isLoadingAttendance } = useGenericQuery<Attendance>(
        'hr/attendance',
        companyId ?? undefined
    );

    const attendance = useMemo(() => (Array.isArray(attendanceResponse) ? attendanceResponse : []), [attendanceResponse]);

    const company: Company | undefined = useMemo(
        () => companies.find((c) => c.id === companyId),
        [companies, companyId]
    );

    const monthNum = MONTHS.indexOf(applied?.month || month) + 1;

    const filteredRecords = useMemo(() => {
        if (!applied) return [];
        return attendance
            .filter((a) => {
                const parts = String(a.date).split('-');
                if (parts.length < 2) return false;
                return parseInt(parts[0], 10) === applied.year && parseInt(parts[1], 10) === monthNum;
            })
            .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.staffName.localeCompare(b.staffName));
    }, [attendance, applied, monthNum]);

    const summaryRows: AttendanceSummary[] = useMemo(() => {
        const map = new Map<string, AttendanceSummary>();
        filteredRecords.forEach((r) => {
            const key = r.staffId;
            if (!map.has(key)) {
                map.set(key, { staffId: key, name: r.staffName || 'Unknown', present: 0, absent: 0, late: 0, leave: 0, total: 0 });
            }
            const entry = map.get(key)!;
            if (r.status === 'present') entry.present++;
            else if (r.status === 'absent') entry.absent++;
            else if (r.status === 'late') entry.late++;
            else if (r.status === 'leave') entry.leave++;
            entry.total++;
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredRecords]);

    const kpis = useMemo(() => {
        let present = 0, absent = 0, late = 0, leave = 0;
        filteredRecords.forEach((r) => {
            if (r.status === 'present') present++;
            else if (r.status === 'absent') absent++;
            else if (r.status === 'late') late++;
            else if (r.status === 'leave') leave++;
        });
        return { total: filteredRecords.length, present, absent, late, leave };
    }, [filteredRecords]);

    const years = useMemo(() => {
        const list: number[] = [];
        for (let y = currentYear; y >= 2020; y--) list.push(y);
        return list;
    }, [currentYear]);

    const kpiCards = [
        { label: 'Total Records', value: kpis.total, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Present', value: kpis.present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Absent', value: kpis.absent, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
        { label: 'Late', value: kpis.late, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Leave', value: kpis.leave, icon: Palmtree, color: 'text-violet-600', bg: 'bg-violet-100' },
    ];

    const handleShow = () => {
        setApplied({ month, year });
    };

    if (companyId && isLoadingAttendance) {
        return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading attendance..." /></div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Attendance Report</h1>
                        <p className="text-sm text-muted-foreground">View and print the monthly attendance report.</p>
                    </div>
                </div>
                <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
            </div>

            <Card className="mb-2 hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        Filter Report
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Month</label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent portal={false}>
                                    {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Year</label>
                            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent portal={false}>
                                    {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                onClick={handleShow}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:from-blue-600 hover:to-blue-700"
                            >
                                <Search className="mr-2 h-4 w-4" />
                                Show
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!applied ? (
                <Card className="hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-md">
                                <ClipboardList className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold">Select Filters</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Choose a month and year, then press Show to view the monthly attendance report.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                        {kpiCards.map((metric) => (
                            <div key={metric.label} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                                    <div className={`rounded-lg ${metric.bg} p-2 transition-all duration-300 group-hover:scale-110`}>
                                        <metric.icon className={`h-4 w-4 ${metric.color}`} />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <p className="text-lg font-bold leading-tight">{metric.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-xl font-bold">Monthly Attendance Report</h2>
                            <p className="text-sm text-muted-foreground">{applied.month} {applied.year}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setPrintType('monthly')} className="bg-white">
                                <Printer className="mr-2 h-4 w-4" />
                                Print Monthly
                            </Button>
                            <Button variant="outline" onClick={() => setPrintType('daily')} className="bg-white">
                                <Printer className="mr-2 h-4 w-4" />
                                Print Daily
                            </Button>
                        </div>
                    </div>

                    <Card className="mb-6 hover:shadow-md transition-all duration-300">
                        <div className="rounded-t-xl border-b bg-gradient-to-r from-blue-50 to-transparent px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="rounded-lg bg-blue-100 p-2">
                                    <ClipboardList className="h-4 w-4 text-blue-600" />
                                </div>
                                <h3 className="font-semibold">Staff Monthly Summary</h3>
                                <Badge variant="secondary">{summaryRows.length}</Badge>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>#</TableHead>
                                            <TableHead>Staff</TableHead>
                                            <TableHead>Present</TableHead>
                                            <TableHead>Absent</TableHead>
                                            <TableHead>Late</TableHead>
                                            <TableHead>Leave</TableHead>
                                            <TableHead>Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summaryRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                    No attendance records found for {applied.month} {applied.year}.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            summaryRows.map((row, index) => (
                                                <TableRow key={row.staffId}>
                                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{row.name}</div>
                                                    </TableCell>
                                                    <TableCell className="text-emerald-600 font-medium">{row.present}</TableCell>
                                                    <TableCell className="text-rose-600 font-medium">{row.absent}</TableCell>
                                                    <TableCell className="text-amber-600 font-medium">{row.late}</TableCell>
                                                    <TableCell className="text-violet-600 font-medium">{row.leave}</TableCell>
                                                    <TableCell className="font-medium">{row.total}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all duration-300">
                        <div className="rounded-t-xl border-b bg-gradient-to-r from-emerald-50 to-transparent px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="rounded-lg bg-emerald-100 p-2">
                                    <Fingerprint className="h-4 w-4 text-emerald-600" />
                                </div>
                                <h3 className="font-semibold">Daily Attendance Details</h3>
                                <Badge variant="secondary">{filteredRecords.length}</Badge>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Staff</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Check In</TableHead>
                                            <TableHead>Check Out</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    No attendance records found for {applied.month} {applied.year}.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredRecords.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell className="whitespace-nowrap">{formatDate(record.date)}</TableCell>
                                                    <TableCell className="font-medium">{record.staffName || '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge className={STATUS_BADGES[record.status]?.className}>
                                                            {STATUS_BADGES[record.status]?.label || record.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{record.checkIn || '—'}</TableCell>
                                                    <TableCell>{record.checkOut || '—'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <AttendancePrintDialog
                type="monthly"
                open={printType === 'monthly'}
                onOpenChange={(open) => setPrintType(open ? 'monthly' : null)}
                company={company}
                month={applied?.month || month}
                year={applied?.year || year}
                summaryRows={summaryRows}
                records={filteredRecords}
            />
            <AttendancePrintDialog
                type="daily"
                open={printType === 'daily'}
                onOpenChange={(open) => setPrintType(open ? 'daily' : null)}
                company={company}
                month={applied?.month || month}
                year={applied?.year || year}
                summaryRows={summaryRows}
                records={filteredRecords}
            />
        </div>
    );
}
