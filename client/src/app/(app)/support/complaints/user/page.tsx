'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, MoreHorizontal, Edit3, Trash2, Search, ListTodo, CircleCheck, Clock, Loader2, PlusCircle, AlertCircle } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import type { Connection, Area, Complaint } from '@/lib/types';
import { smartMatch } from '@/lib/search';

const DEPARTMENTS = [
  'Technical', 'CRO Support', 'Technician', 'Subscriber Support Desk', 'Subscriber Care Support', 'Finance',
] as const;

const PRIORITIES = ['Low', 'Medium', 'High'] as const;

export default function SubscriberComplaintPage() {
  const { companyId, companies } = useCompany();
  const { toast } = useToast();

  const { data: complaints = [], isLoading, refetch } = useGenericQuery<Complaint>('support/complaints', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);

  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [internetSearch, setInternetSearch] = useState('');
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const [sublocalityId, setSublocalityId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [complaintType, setComplaintType] = useState('');
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editComplaint, setEditComplaint] = useState<Complaint | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [deleteComplaint, setDeleteComplaint] = useState<Complaint | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const kpiData = useMemo(() => [
    { title: 'Total Complaints', value: complaints.length, icon: ListTodo, gradient: 'from-blue-500 to-cyan-600' },
    { title: 'Open', value: complaints.filter(c => c.status === 'open').length, icon: Clock, gradient: 'from-amber-500 to-orange-600' },
    { title: 'In Progress', value: complaints.filter(c => c.status === 'in-progress').length, icon: Loader2, gradient: 'from-violet-500 to-purple-600' },
    { title: 'Resolved', value: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length, icon: CircleCheck, gradient: 'from-emerald-500 to-green-600' },
  ], [complaints]);

  const filteredData = useMemo(() => {
    return complaints.filter((c) => {
      if (search && !smartMatch(search, [c.id], [c.subscriberName, c.description])) {
        return false;
      }
      return true;
    });
  }, [complaints, search]);

  const totalPages = Math.ceil(filteredData.length / parseInt(pageSize));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * parseInt(pageSize),
    currentPage * parseInt(pageSize)
  );

  const matchedSubscribers = useMemo(() => {
    if (!internetSearch.trim()) return [];
    return (connections as Connection[]).filter(c =>
      smartMatch(internetSearch, [c.internetId, c.id], [c.name])
    ).slice(0, 10);
  }, [connections, internetSearch]);

  const resetForm = () => {
    setInternetSearch('');
    setSelectedConn(null);
    setSublocalityId('');
    setStatusFilter('');
    setComplaintType('');
    setSubject('');
    setDepartment('');
    setPriority('');
    setOperatorId('');
    setDeadline('');
    setDescription('');
  };

  const handleAddComplaint = async () => {
    if (!selectedConn || !description.trim()) return;
    setIsSaving(true);
    try {
      await api.post('/support/complaints', {
        subscriberId: selectedConn.id,
        subscriberName: selectedConn.name,
        phone: selectedConn.cell || selectedConn.mobile || '',
        address: selectedConn.address || '',
        type: complaintType || undefined,
        subject: subject || undefined,
        department: department || undefined,
        priority: priority || undefined,
        deadline: deadline || undefined,
        category: 'service',
        description: description.trim(),
        status: 'open',
        assignedToId: operatorId || undefined,
      });
      toast({ title: 'Success', description: 'Complaint created successfully.' });
      setShowForm(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to create complaint' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editComplaint) return;
    setIsSaving(true);
    try {
      await api.put(`/support/complaints/${editComplaint.id}`, {
        ...editComplaint,
        description: editDescription,
        status: editStatus,
        assignedToId: editComplaint.assignedToId || null,
      });
      toast({ title: 'Success', description: 'Complaint updated.' });
      setShowEdit(false);
      setEditComplaint(null);
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Update failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteComplaint) return;
    setIsSaving(true);
    try {
      await api.delete(`/support/complaints/${deleteComplaint.id}`);
      toast({ title: 'Deleted', description: 'Complaint deleted.' });
      setShowDelete(false);
      setDeleteComplaint(null);
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Delete failed' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscriber Complaint</h1>
            <p className="text-sm text-muted-foreground">Manage and track subscriber complaints</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to view complaints.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscriber Complaint</h1>
            <p className="text-sm text-muted-foreground">Manage and track subscriber complaints</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriber Complaint</h1>
          <p className="text-sm text-muted-foreground">Manage and track subscriber complaints</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <div key={kpi.title} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </div>
              <div className={`rounded-lg bg-gradient-to-br ${kpi.gradient} p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, subscriber or description..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Complaint
              </Button>
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No complaints found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.subscriberName}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          item.category === 'network' ? 'bg-blue-100 text-blue-800' :
                          item.category === 'billing' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          item.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          item.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="data-[highlighted]:text-emerald-600" onClick={() => { setEditComplaint(item); setEditDescription(item.description); setEditStatus(item.status); setShowEdit(true); }}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => { setDeleteComplaint(item); setShowDelete(true); }}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredData.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * parseInt(pageSize)) + 1} to {Math.min(currentPage * parseInt(pageSize), filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Previous</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0">{page}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Subscriber Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="relative">
              <Label>Internet ID / Subscriber</Label>
              <Input
                value={internetSearch}
                onChange={(e) => { setInternetSearch(e.target.value); setSelectedConn(null); }}
                placeholder="Search by internet ID or name..."
              />
              {internetSearch && !selectedConn && matchedSubscribers.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-auto">
                  {matchedSubscribers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0"
                      onClick={() => { setSelectedConn(c); setInternetSearch(c.name || c.internetId); setSublocalityId(c.sublocalityId || ''); setStatusFilter(c.status); }}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-2 text-muted-foreground">({c.internetId})</span>
                      <span className="ml-2 text-xs text-muted-foreground">{c.cell || c.mobile}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={selectedConn?.name || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input value={selectedConn?.address || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={selectedConn?.cell || selectedConn?.mobile || ''} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Sublocality</Label>
                <Select value={sublocalityId} onValueChange={setSublocalityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sublocality" />
                  </SelectTrigger>
                  <SelectContent>
                    {(areas as Area[]).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.city} - {a.zone} - {a.locality}{a.subLocality ? ` / ${a.subLocality}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={complaintType} onValueChange={setComplaintType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="cable">Cable</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d.toLowerCase().replace(/\s+/g, '-')}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Deadline Date</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Complaint</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the complaint in detail..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddComplaint}
                disabled={isSaving || !description.trim()}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setEditComplaint(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Subscriber</Label>
              <Input value={editComplaint?.subscriberName || ''} readOnly />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowEdit(false); setEditComplaint(null); }}>Cancel</Button>
              <Button onClick={handleEdit} disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setDeleteComplaint(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Complaint
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this complaint from <strong>{deleteComplaint?.subscriberName}</strong>?</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteComplaint(null); }}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} disabled={isSaving} variant="destructive">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
