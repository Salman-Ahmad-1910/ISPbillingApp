'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Warehouse, CalendarIcon, Eye, Download, Printer, Package, CheckCircle, AlertTriangle } from 'lucide-react';

const categories = ['All', 'Hardware', 'Software', 'Accessories', 'Networking'];

export default function AbstractStockPage() {
  const [category, setCategory] = useState('All');
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
        <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 text-white shadow-sm">
          <Warehouse className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abstract Stock</h1>
          <p className="text-sm text-muted-foreground">View stock summary across all products.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-sky-500/50 via-blue-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Products</p>
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
              <p className="text-xs font-medium text-muted-foreground">In Stock</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">--</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">--</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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

            <div className="flex items-end">
              <Button onClick={() => setShowReport(true)} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                <Eye className="mr-2 h-4 w-4" />
                Show
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showReport && (
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-3xl font-bold text-center mb-2">Abstract Stock Report</h2>
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
              <p className="text-lg">Abstract stock report will be displayed here.</p>
              <p className="text-sm mt-2">Category: {category}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
