'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BarChartBig, CalendarIcon, Eye, Download, Printer, FileText, DollarSign, ClipboardCheck } from 'lucide-react';

const accountHeads = ['All', 'Asset', 'Liability', 'Income', 'Expense', 'Equity'];
const subHeads = ['All', 'Cash', 'Bank', 'Accounts Receivable', 'Accounts Payable', 'Service Revenue', 'Salaries', 'Rent', 'Utilities', 'Capital'];

export default function OneDayBalanceSheetPage() {
  const [accountHead, setAccountHead] = useState('All');
  const [subHead, setSubHead] = useState('All');
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleShow = () => {
    setShowReport(true);
  };

  const fd = date ? format(date, 'dd MMM yyyy') : '';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <BarChartBig className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">One Day Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">View balance sheet for a specific day</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Report Date</p>
              <p className="text-lg font-bold">{fd}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Account Head</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{accountHead}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">SubHead</p>
              <p className="text-lg font-bold">{subHead}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Account Head</Label>
              <Select value={accountHead} onValueChange={setAccountHead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {accountHeads.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SubHead</Label>
              <Select value={subHead} onValueChange={setSubHead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {subHeads.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { setDate(d); setDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button onClick={handleShow} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                <Eye className="mr-2 h-4 w-4" />
                Show
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={showReport ? '' : 'hidden'}>
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-3xl font-bold text-center mb-2">OD Balance Sheet</h2>
            <p className="text-center text-muted-foreground mb-6">
              From {fd} &nbsp; To &nbsp; {fd}
            </p>

            <div className="flex justify-center gap-3 mb-6">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>

            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">One day balance sheet will be displayed here.</p>
              <p className="text-sm mt-2">Account Head: {accountHead} &nbsp;|&nbsp; SubHead: {subHead}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
