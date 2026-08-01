'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import {
    CalendarDays,
    CheckCircle2,
    XCircle,
    Clock,
    Palmtree,
    Save,
    Loader2,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

import type { Staff, Attendance } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

const STATUSES = ['present', 'absent', 'late', 'leave'] as const;

interface RowState {
    status: string;
    checkIn: string;
    checkOut: string;
    id?: string;
}

const statusOptions = [
    { value: 'present', label: 'Present', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'absent', label: 'Absent', badge: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'late', label: 'Late', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'leave', label: 'Leave', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
];

export default function StaffAttendancePage() {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [rows, setRows] = useState<Record<string, RowState>>({});
    const [isSaving, setIsSaving] = useState(false);

    const { data: staffResponse = [], isLoading: isLoadingStaff } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);
    const { data: attendanceResponse = [], isLoading: isLoadingAttendance, isFetching: isFetchingAttendance } = useGenericQuery<Attendance>(
        'hr/attendance',
        companyId ?? undefined,
        { date }
    );

    const staff = useMemo(
        () => (Array.isArray(staffResponse) ? staffResponse : []).filter((s) => s.status !== 'left'),
        [staffResponse]
    );
    const attendance = useMemo(() => (Array.isArray(attendanceResponse) ? attendanceResponse : []), [attendanceResponse]);

    // Initialize the attendance rows from existing records (default to present for a fresh date)
    useEffect(() => {
        if (isFetchingAttendance || isLoadingStaff) return;
        if (staff.length === 0) return;
        const next: Record<string, RowState> = {};
        staff.forEach((s) => {
            const rec = attendance.find((a) => a.staffId === s.id && a.date === date);
            next[s.id] = rec
                ? { status: rec.status, checkIn: rec.checkIn || '', checkOut: rec.checkOut || '', id: rec.id }
                : { status: 'present', checkIn: '', checkOut: '' };
        });
        setRows(next);
    }, [staff, attendance, isFetchingAttendance, isLoadingStaff]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { present: 0, absent: 0, late: 0, leave: 0 };
        staff.forEach((s) => {
            const r = rows[s.id];
            if (r && STATUSES.includes(r.status as any)) {
                c[r.status] = (c[r.status] || 0) + 1;
            }
        });
        return c;
    }, [rows, staff]);

    const kpiCards = [
        { label: 'Present', value: counts.present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Absent', value: counts.absent, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
        { label: 'Late', value: counts.late, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Leave', value: counts.leave, icon: Palmtree, color: 'text-blue-600', bg: 'bg-blue-100' },
    ];

    const updateRow = (staffId: string, field: keyof RowState, value: string) => {
        setRows((prev) => ({ ...prev, [staffId]: { ...prev[staffId], [field]: value } }));
    };

    const handleSave = async () => {
        if (!companyId) return;
        setIsSaving(true);
        try {
            for (const s of staff) {
                const r = rows[s.id];
                if (!r) continue;
                const payload = {
                    staffId: s.id,
                    staffName: s.name,
                    date,
                    status: r.status,
                    checkIn: r.checkIn || '',
                    checkOut: r.checkOut || '',
                    companyId,
                };
                if (r.id) {
                    await api.put(`/hr/attendance/${r.id}`, { ...payload, id: r.id });
                } else {
                    await api.post('/hr/attendance', payload);
                }
            }
            toast({ title: 'Success', description: `Attendance for ${date} saved successfully.` });
            queryClient.invalidateQueries({ queryKey: ['hr/attendance', companyId] });
        } catch (error: any) {
            console.error('Save attendance error:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description:
                    error.response?.data?.error ||
                    error.response?.data?.message ||
                    (typeof error.response?.data === 'string' ? error.response.data : '') ||
                    'Failed to save attendance',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = companyId && (isLoadingStaff || isLoadingAttendance);

    if (isLoading) {
        return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading attendance..." /></div>;
    }

    return (
        <>
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                        <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Staff Attendance</h1>
                        <p className="text-sm text-muted-foreground">Take daily attendance for all staff members.</p>
                    </div>
                </div>
                <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
            </div>

            <Card className="mb-6 hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                        <div className="space-y-2">
                            <Label>Attendance Date</Label>
                            <Input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-56" />
                        </div>
                        <div className="flex-1" />
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || staff.length === 0}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save Attendance'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {kpiCards.map((metric) => (
                    <div key={metric.label} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                            <div className={`rounded-lg ${metric.bg} p-2.5 transition-all duration-300 group-hover:scale-110`}>
                                <metric.icon className={`h-5 w-5 ${metric.color}`} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold">{metric.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Card className="hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between rounded-t-xl border-b bg-gradient-to-r from-blue-50 to-transparent px-5 py-4">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-100 p-2">
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold">Daily Attendance</h3>
                        <span className="text-sm text-muted-foreground">{date}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{staff.length} staff members</span>
                </div>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">#</TableHead>
                                    <TableHead>Staff</TableHead>
                                    <TableHead>Father Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No staff members found. Add staff from the Staff page first.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staff.map((member, index) => {
                                        const r = rows[member.id] || { status: 'present', checkIn: '', checkOut: '' };
                                        return (
                                            <TableRow key={member.id}>
                                                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{member.name}</div>
                                                    <div className="text-xs text-muted-foreground">{member.designation || member.department}</div>
                                                </TableCell>
                                                <TableCell>{member.fatherName || '—'}</TableCell>
                                                <TableCell>
                                                    <Select value={r.status} onValueChange={(v) => updateRow(member.id, 'status', v)}>
                                                        <SelectTrigger className="w-32">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent portal={false}>
                                                            {statusOptions.map((s) => (
                                                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="time"
                                                        value={r.checkIn}
                                                        onChange={(e) => updateRow(member.id, 'checkIn', e.target.value)}
                                                        className="w-32"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="time"
                                                        value={r.checkOut}
                                                        onChange={(e) => updateRow(member.id, 'checkOut', e.target.value)}
                                                        className="w-32"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
