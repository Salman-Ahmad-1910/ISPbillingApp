'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import {
    Wallet,
    Users,
    DollarSign,
    AlertCircle,
    Scale,
    Gift,
    Search,
    Filter,
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

import type { Staff, SalaryPayment } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { PaySalaryDialog } from './_components/pay-salary-dialog';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatPKR = (value: number) =>
    'PKR ' + new Intl.NumberFormat('en-US').format(value || 0);

export default function StaffSalaryPage() {
    const { companyId } = useCompany();

    const currentYear = new Date().getFullYear();
    const [month, setMonth] = useState<string>(() => new Date().toLocaleString('en-US', { month: 'long' }));
    const [year, setYear] = useState<number>(currentYear);
    const [department, setDepartment] = useState<string>('all');
    const [applied, setApplied] = useState<{ month: string; year: number; department: string } | null>(null);
    const [payStaff, setPayStaff] = useState<Staff | null>(null);
    const [isPayOpen, setIsPayOpen] = useState(false);

    const { data: staffResponse = [], isLoading: isLoadingStaff } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);
    const { data: paymentsResponse = [], isLoading: isLoadingPayments } = useGenericQuery<SalaryPayment>(
        applied ? 'hr/salary' : null,
        companyId ?? undefined,
        applied ? { month: applied.month, year: applied.year } : undefined
    );

    const staff = useMemo(() => (Array.isArray(staffResponse) ? staffResponse : []), [staffResponse]);
    const payments = useMemo(() => (Array.isArray(paymentsResponse) ? paymentsResponse : []), [paymentsResponse]);

    const departments = useMemo(() => {
        const set = new Set<string>();
        staff.forEach((s) => {
            if (s.department) set.add(s.department);
        });
        return Array.from(set).sort();
    }, [staff]);

    const filteredStaff = useMemo(() => {
        if (!applied) return [];
        if (applied.department === 'all') return staff;
        return staff.filter((s) => s.department === applied.department);
    }, [staff, applied]);

    const paidStaffIds = useMemo(() => new Set(payments.map((p) => p.staffId)), [payments]);

    const unpaidStaff = useMemo(
        () => filteredStaff.filter((s) => !paidStaffIds.has(s.id)),
        [filteredStaff, paidStaffIds]
    );
    const paidStaff = useMemo(
        () => filteredStaff.filter((s) => paidStaffIds.has(s.id)),
        [filteredStaff, paidStaffIds]
    );

    const kpis = useMemo(() => {
        const totalSalary = filteredStaff.reduce((sum, s) => sum + (s.salary || 0), 0);
        const unpaidSalary = unpaidStaff.reduce((sum, s) => sum + (s.salary || 0), 0);
        const totalDeduction = payments.reduce((sum, p) => sum + (p.deduction || 0), 0);
        const otherAllowance = filteredStaff.reduce((sum, s) => sum + (s.leaveAllow || 0), 0);
        return {
            totalStaff: filteredStaff.length,
            totalSalary,
            unpaidSalary,
            totalDeduction,
            otherAllowance,
        };
    }, [filteredStaff, unpaidStaff, payments]);

    const years = useMemo(() => {
        const list: number[] = [];
        for (let y = currentYear; y >= 2020; y--) list.push(y);
        return list;
    }, [currentYear]);

    const kpiCards = [
        { label: 'Total Staff', value: kpis.totalStaff, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Total Salary', value: formatPKR(kpis.totalSalary), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Salary Unpaid', value: formatPKR(kpis.unpaidSalary), icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
        { label: 'Total Deduction', value: formatPKR(kpis.totalDeduction), icon: Scale, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Other Allowance', value: formatPKR(kpis.otherAllowance), icon: Gift, color: 'text-purple-600', bg: 'bg-purple-100' },
    ];

    const handleShow = () => {
        setApplied({ month, year, department });
    };

    const handlePay = (member: Staff) => {
        setPayStaff(member);
        setIsPayOpen(true);
    };

    if (companyId && isLoadingStaff) {
        return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading salary..." /></div>;
    }

    return (
        <>
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Staff Salary</h1>
                        <p className="text-sm text-muted-foreground">View staff salaries and monthly payouts.</p>
                    </div>
                </div>
                <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
            </div>

            <Card className="mb-6 hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        Filter Staff
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Department</label>
                            <Select value={department} onValueChange={setDepartment}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent portal={false}>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
                                <Wallet className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold">Select Filters</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Choose a month, year and department, then press Show to view the salary report.
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
                                    {isLoadingPayments ? (
                                        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                                    ) : (
                                        <p className="text-lg font-bold leading-tight">{metric.value}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Unpaid Staff */}
                        <Card className="hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between rounded-t-xl border-b bg-gradient-to-r from-rose-50 to-transparent px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-rose-100 p-2">
                                        <AlertCircle className="h-4 w-4 text-rose-600" />
                                    </div>
                                    <h3 className="font-semibold">Unpaid Staff</h3>
                                    <Badge variant="secondary">{unpaidStaff.length}</Badge>
                                </div>
                                <span className="text-sm text-muted-foreground">{formatPKR(kpis.unpaidSalary)}</span>
                            </div>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Staff</TableHead>
                                                <TableHead>Father Name</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {unpaidStaff.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                        All salaries have been paid for this month.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                unpaidStaff.map((member, index) => (
                                                    <TableRow key={member.id}>
                                                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{member.name}</div>
                                                            <div className="text-xs text-muted-foreground">{member.designation || member.department}</div>
                                                        </TableCell>
                                                        <TableCell>{member.fatherName || '—'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handlePay(member)}
                                                                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
                                                            >
                                                                Pay
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Paid Staff */}
                        <Card className="hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between rounded-t-xl border-b bg-gradient-to-r from-emerald-50 to-transparent px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-emerald-100 p-2">
                                        <DollarSign className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <h3 className="font-semibold">Paid Staff</h3>
                                    <Badge variant="secondary">{paidStaff.length}</Badge>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {formatPKR(paidStaff.reduce((sum, s) => sum + (s.salary || 0), 0))}
                                </span>
                            </div>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Staff</TableHead>
                                                <TableHead>Father Name</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paidStaff.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                        No salaries have been paid yet for this month.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paidStaff.map((member, index) => (
                                                    <TableRow key={member.id}>
                                                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{member.name}</div>
                                                            <div className="text-xs text-muted-foreground">{member.designation || member.department}</div>
                                                        </TableCell>
                                                        <TableCell>{member.fatherName || '—'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            <PaySalaryDialog
                open={isPayOpen}
                onOpenChange={setIsPayOpen}
                staff={payStaff}
                month={applied?.month || month}
                year={applied?.year || year}
            />
        </>
    );
}
