'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import type { Connection, Area, Company } from '@/lib/types';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

import { DataTable } from './data-table';
import { getColumns } from './columns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCurrentMonthYear(): { month: string; year: string } {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: String(now.getFullYear()) };
}

function getMonthYear(dateStr?: string): { month: string; year: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { month: MONTHS[d.getMonth()], year: String(d.getFullYear()) };
}

interface BillRow {
  id: string;
  month: string;
  year: string;
  amount: number;
  subscribers: number;
  connectionType: string;
  sublocality: string;
  status: 'Created' | 'Deleted';
  date: string;
  createdBy: string;
  connections: Connection[];
}

export function ClientPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connectionsData, isLoading } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areasData } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: companiesData } = useGenericQuery<Company>('companies', companyId ?? undefined);

  const connections = connectionsData || [];
  const areas = areasData || [];
  const companies = companiesData || [];

  const currentCompany = companies.find(c => c.id === companyId);
  const companyName = currentCompany?.name || 'Unknown';

  const [filterMonth, setFilterMonth] = useState(() => getCurrentMonthYear().month);
  const [filterYear, setFilterYear] = useState(() => getCurrentMonthYear().year);
  const [filterBillType, setFilterBillType] = useState('all');
  const [filterSublocality, setFilterSublocality] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterYear, filterBillType, filterSublocality]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(String(new Date().getFullYear()));
    connections.forEach(c => {
      const my = getMonthYear(c.rechargeDate || c.installationDate);
      if (my) years.add(my.year);
    });
    return Array.from(years).sort().reverse();
  }, [connections]);

  const billRows = useMemo(() => {
    const groups: Record<string, { amount: number; subscribers: number; connectionType: string; sublocality: string; connections: Connection[] }> = {};

    const isDefaultView = filterSublocality === 'all' && filterBillType === 'all';

    const selectedMonth = filterMonth === 'all' ? getCurrentMonthYear().month : filterMonth;
    const selectedYear = filterYear === 'all' ? getCurrentMonthYear().year : filterYear;

    connections.forEach(c => {
      if (filterSublocality !== 'all' && c.sublocalityId !== filterSublocality) return;

      const subName = areas.find(a => a.id === c.sublocalityId)?.subLocality || areas.find(a => a.id === c.sublocalityId)?.locality || 'Unknown';

      let typeLabel: string;
      if (c.connectionType === 'tv_cable') {
        typeLabel = 'Cable';
      } else if (c.connectionType === 'internet') {
        typeLabel = 'Internet';
      } else {
        typeLabel = 'Both';
      }

      if (filterBillType !== 'all') {
        const typeMap: Record<string, string> = { internet: 'Internet', tv_cable: 'Cable', both: 'Both' };
        if (typeLabel !== typeMap[filterBillType]) return;
      }

      let groupKey: string;
      if (isDefaultView) {
        groupKey = typeLabel;
      } else if (filterSublocality === 'all') {
        groupKey = `${selectedMonth}_${selectedYear}_${typeLabel}`;
      } else {
        groupKey = `${selectedMonth}_${selectedYear}_${typeLabel}_${c.sublocalityId || 'all'}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { amount: 0, subscribers: 0, connectionType: typeLabel, sublocality: isDefaultView ? 'All' : subName, connections: [] };
      }

      if (c.connectionType === 'tv_cable') {
        groups[groupKey].amount += c.amount || 0;
      } else if (c.connectionType === 'internet') {
        groups[groupKey].amount += c.sameAmount || 0;
      } else {
        groups[groupKey].amount += (c.amount || 0) + (c.sameAmount || 0);
      }

      groups[groupKey].subscribers += 1;
      groups[groupKey].connections.push(c);
    });

    return Object.entries(groups).map(([key, group], idx) => ({
      id: `BC-${String(idx + 1).padStart(4, '0')}`,
      month: selectedMonth,
      year: selectedYear,
      amount: group.amount,
      subscribers: group.subscribers,
      connectionType: group.connectionType,
      sublocality: group.sublocality,
      status: 'Created' as const,
      date: new Date().toISOString().split('T')[0],
      createdBy: companyName,
      connections: group.connections,
    }));
  }, [connections, areas, companyName, filterMonth, filterYear, filterBillType, filterSublocality]);

  const totalPages = Math.ceil(billRows.length / pageSize);
  const paginatedData = billRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getVisiblePages = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, currentPage + 3);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) setPageInput(value);
  };

  const handlePageSubmit = () => {
    const page = parseInt(pageInput);
    if (page && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  const handlePageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePageSubmit();
  };

  const handleCreate = async () => {
    if (billRows.length === 0) {
      toast({ variant: 'destructive', title: 'No subscribers', description: 'No subscribers match the current filters.' });
      return;
    }

    const totalSubscribers = billRows.reduce((sum, r) => sum + r.subscribers, 0);
    const confirmed = window.confirm(`Create ${billRows.length} bill entry(ies) for ${totalSubscribers} subscriber(s)?`);
    if (!confirmed) return;

    setIsCreating(true);
    try {
      const groupedBills = billRows.map(row => ({
        connectionIds: row.connections.map(c => c.id),
        connectionType: row.connectionType,
        amount: row.amount,
        subscribers: row.subscribers,
        sublocality: row.sublocality,
      }));

      await api.post(`/billing/bills/create?companyId=${companyId}`, {
        groupedBills,
        month: filterMonth === 'all' ? undefined : filterMonth,
        year: filterYear === 'all' ? undefined : filterYear,
        billType: filterBillType === 'all' ? undefined : filterBillType,
        sublocalityId: filterSublocality === 'all' ? undefined : filterSublocality,
      });
      toast({ title: 'Success', description: `${billRows.length} bill entry(ies) created for ${totalSubscribers} subscriber(s).` });
      queryClient.invalidateQueries({ queryKey: ['billing/bills', companyId] });

      const params = new URLSearchParams();
      if (filterMonth !== 'all') params.set('month', filterMonth);
      if (filterYear !== 'all') params.set('year', filterYear);
      if (filterBillType !== 'all') params.set('billType', filterBillType);
      if (filterSublocality !== 'all') params.set('sublocality', filterSublocality);
      window.open(`/transaction/bill-creator/print?${params.toString()}`, '_blank');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to create bills' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (billRows.length === 0) {
      toast({ variant: 'destructive', title: 'No subscribers', description: 'No subscribers match the current filters.' });
      return;
    }
    const confirmed = window.confirm(`Delete ${billRows.length} bill entry(ies)?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const groupedBills = billRows.map(row => ({
        connectionIds: row.connections.map(c => c.id),
        connectionType: row.connectionType,
        amount: row.amount,
        subscribers: row.subscribers,
        sublocality: row.sublocality,
      }));

      await api.post(`/billing/bills/delete?companyId=${companyId}`, {
        groupedBills,
        month: filterMonth === 'all' ? undefined : filterMonth,
        year: filterYear === 'all' ? undefined : filterYear,
        billType: filterBillType === 'all' ? undefined : filterBillType,
        sublocalityId: filterSublocality === 'all' ? undefined : filterSublocality,
      });
      toast({ title: 'Success', description: `${billRows.length} bill entry(ies) deleted.` });
      queryClient.invalidateQueries({ queryKey: ['billing/bills', companyId] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete bills' });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = getColumns();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading bill data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterBillType} onValueChange={setFilterBillType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Bill Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="internet">Internet</SelectItem>
              <SelectItem value="tv_cable">Cable</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSublocality} onValueChange={setFilterSublocality}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sublocality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sublocality</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>{area.subLocality || area.locality || area.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{billRows.length} entry(ies) | {billRows.reduce((sum, r) => sum + r.subscribers, 0)} subscriber(s)</span>
            <Button
              onClick={handleCreate}
              disabled={isCreating || billRows.length === 0}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Create
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting || billRows.length === 0}
              variant="destructive"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </div>
        </div>

        <DataTable columns={columns} data={paginatedData} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show entries</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {billRows.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, billRows.length)} of {billRows.length} entries
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
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
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 p-0">
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
              />
              <Button
                variant="outline" size="sm"
                onClick={handlePageSubmit}
                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                className="h-8 px-2"
              >
                Go
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
