'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import type { Staff } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface PaySalaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staff: Staff | null;
    month: string;
    year: number;
}

export function PaySalaryDialog({ open, onOpenChange, staff, month, year }: PaySalaryDialogProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [otherAllowance, setOtherAllowance] = useState('');
    const [deduction, setDeduction] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        if (open) {
            setOtherAllowance('');
            setDeduction('');
        }
    }, [open]);

    const salary = staff?.salary || 0;
    const basicPay = staff?.basicPay ?? salary;
    const leaveAllow = staff?.leaveAllow || 0;

    const netPay = useMemo(() => {
        return (basicPay || salary) + leaveAllow + (Number(otherAllowance) || 0) - (Number(deduction) || 0);
    }, [basicPay, salary, leaveAllow, otherAllowance, deduction]);

    const handlePay = async () => {
        if (!staff || !companyId) return;
        setIsPaying(true);
        try {
            await api.post('/hr/salary', {
                staffId: staff.id,
                staffName: staff.name,
                month,
                year,
                salary,
                basicPay,
                leaveAllow,
                otherAllowance: Number(otherAllowance) || 0,
                deduction: Number(deduction) || 0,
                netPay,
                paymentMode: staff.paymentMode || 'cash',
                paidAt: new Date().toISOString().split('T')[0],
                companyId,
            });
            toast({ title: 'Success', description: `${staff.name}'s salary for ${month} ${year} has been paid.` });
            queryClient.invalidateQueries({ queryKey: ['hr/salary', companyId] });
            onOpenChange(false);
        } catch (error: any) {
            console.error('Pay salary error:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description:
                    error.response?.data?.error ||
                    error.response?.data?.message ||
                    (typeof error.response?.data === 'string' ? error.response.data : '') ||
                    'Failed to pay salary',
            });
        } finally {
            setIsPaying(false);
        }
    };

    const rowCls = 'flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-xl shadow-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                            <Wallet className="h-4 w-4" />
                        </div>
                        Pay Salary
                    </DialogTitle>
                </DialogHeader>

                {staff && (
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">{staff.name}</span>
                                <span className="text-muted-foreground">{month} {year}</span>
                            </div>
                            {staff.fatherName && (
                                <p className="mt-0.5 text-xs text-muted-foreground">Father Name: {staff.fatherName}</p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">Department: {staff.department}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Salary</Label>
                                <div className={rowCls}>PKR {salary.toLocaleString()}</div>
                            </div>
                            <div className="space-y-2">
                                <Label>Leave Allowance</Label>
                                <div className={rowCls}>PKR {leaveAllow.toLocaleString()}</div>
                            </div>
                            <div className="space-y-2">
                                <Label>Other Allowance</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={otherAllowance}
                                    onChange={(e) => setOtherAllowance(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Deduction</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={deduction}
                                    onChange={(e) => setDeduction(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-white">
                            <span className="text-sm font-medium">Net Pay</span>
                            <span className="text-lg font-bold">PKR {netPay.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPaying}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePay}
                        disabled={isPaying || !staff}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
                    >
                        {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPaying ? 'Paying...' : 'Confirm Payment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
