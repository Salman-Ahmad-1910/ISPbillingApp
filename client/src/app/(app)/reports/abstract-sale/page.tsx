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
import { Receipt, CalendarIcon, Eye, Download, Printer, ShoppingCart, CheckCircle, TrendingUp } from 'lucide-react';

const saleTypes = ['All', 'POS', 'Installment', 'Return'];
const paymentMethods = ['All', 'Cash', 'Card', 'Online'];

export default function AbstractSalePage() {
  const [saleType, setSaleType] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDate, setToDate] = useState<Date>(new Date());
  const [toDateOpen, setToDateOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const fd = fromDate ? format(fromDate, 'dd MMM yyyy') : '';
  const td = toDate ? format(toDate, 'dd MMM yyyy') : '';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abstract Sale</h1>
          <p className="text-sm text-muted-foreground">View sale summary across all transactions.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold">--</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">--</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">--</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Sale Type</Label>
              <Select value={saleType} onValueChange={setSaleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {saleTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !fromDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate} onSelect={(d) => { if (d) { setFromDate(d); setFromDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !toDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={toDate} onSelect={(d) => { if (d) { setToDate(d); setToDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex mt-6">
            <Button onClick={() => setShowReport(true)} className="w-32 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              <Eye className="mr-2 h-4 w-4" />
              Show
            </Button>
          </div>
        </CardContent>
      </Card>

      {showReport && (
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-3xl font-bold text-center mb-2">Abstract Sale Report</h2>
            <p className="text-center text-muted-foreground mb-6">
              From {fd} &nbsp; To &nbsp; {td}
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
              <p className="text-lg">Abstract sale report will be displayed here.</p>
              <p className="text-sm mt-2">Sale type: {saleType} | Payment: {paymentMethod}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
