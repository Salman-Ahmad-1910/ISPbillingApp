'use client';

import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useGenericMutation } from '@/hooks/api/use-generic-mutation';
import { Headphones, Plus, Search, Filter, Loader2, TicketCheck, Clock, CircleCheck, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import type { SupportTicket } from '@/lib/types';

export default function SupportTicketsPage() {
    const { companyId } = useCompany();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    
    // Advanced pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageInput, setPageInput] = useState<string>('');

    const { data: tickets, isLoading, refetch } = useGenericQuery<SupportTicket[]>(
        '/admin/support-tickets',
        companyId
    );

    const createTicket = useGenericMutation<SupportTicket>({
        url: '/admin/support-tickets',
        method: 'POST',
        queryKey: ['support-tickets', companyId],
    });

    const updateTicket = useGenericMutation<SupportTicket>({
        url: '/admin/support-tickets',
        method: 'PUT',
        queryKey: ['support-tickets', companyId],
    });

    const kpiData = useMemo(() => [
        { title: 'Total Tickets', value: tickets?.length || 0, icon: TicketCheck, gradient: 'from-blue-500 to-cyan-600' },
        { title: 'Open', value: tickets?.filter(t => t.status === 'open').length || 0, icon: Clock, gradient: 'from-amber-500 to-orange-600' },
        { title: 'Closed', value: tickets?.filter(t => t.status === 'closed').length || 0, icon: CircleCheck, gradient: 'from-emerald-500 to-green-600' },
        { title: 'High Priority', value: tickets?.filter(t => t.priority === 'high').length || 0, icon: AlertTriangle, gradient: 'from-rose-500 to-red-600' },
    ], [tickets]);

    const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const ticketData = {
            subject: formData.get('subject') as string,
            message: formData.get('message') as string,
            priority: formData.get('priority') as string,
            status: 'open',
        };

        try {
            await createTicket.mutateAsync(ticketData as any);
            toast({
                title: 'Success',
                description: 'Support ticket created successfully.',
            });
            setIsCreateOpen(false);
            refetch();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create ticket',
            });
        }
    };

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        try {
            await updateTicket.mutateAsync({ id: ticketId, status: newStatus } as any);
            toast({
                title: 'Success',
                description: 'Ticket status updated successfully.',
            });
            refetch();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update ticket',
            });
        }
    };

    const filteredTickets = useMemo(() => tickets?.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ticket.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesPriority;
    }) || [], [tickets, searchTerm, statusFilter, priorityFilter]);

    // Pagination helpers
    const totalPages = Math.ceil(filteredTickets.length / pageSize);

    const getPaginatedData = () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredTickets.slice(startIndex, endIndex);
    };

    const getVisiblePages = () => {
        const pages = [];
        const startPage = Math.max(1, currentPage - 3);
        const endPage = Math.min(totalPages, currentPage + 3);
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        return pages;
    };

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            setPageInput(value);
        }
    };

    const handlePageSubmit = () => {
        const page = parseInt(pageInput);
        if (page && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setPageInput('');
        }
    };

    const handlePageKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handlePageSubmit();
        }
    };

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, priorityFilter]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-yellow-100 text-yellow-800';
            case 'closed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-orange-100 text-orange-800';
            case 'low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
                        <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
                        <p className="text-sm text-muted-foreground">Manage customer support tickets and requests</p>
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
                    <Headphones className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
                    <p className="text-sm text-muted-foreground">Manage customer support tickets and requests</p>
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

            {/* Filters and Search */}
            <Card className="transition-all duration-300 hover:shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search tickets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="min-w-[150px]">
                            <Label htmlFor="status">Status</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-[150px]">
                            <Label htmlFor="priority">Priority</Label>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:shadow-md transition-all duration-300">
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Ticket
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] rounded-xl shadow-lg">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <line x1="12" y1="19" x2="12" y2="23" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <line x1="8" y1="23" x2="16" y2="23" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            Create Support Ticket
                                        </DialogTitle>
                                        <DialogDescription>
                                            Create a new support ticket for assistance.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateTicket} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Subject</Label>
                                            <Input
                                                id="subject"
                                                name="subject"
                                                placeholder="Brief description of the issue"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="priority">Priority</Label>
                                            <Select name="priority" defaultValue="medium">
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="message">Message</Label>
                                            <Textarea
                                                id="message"
                                                name="message"
                                                placeholder="Detailed description of the issue"
                                                rows={4}
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:shadow-md transition-all duration-300">
                                                Create Ticket
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tickets List */}
            <div className="space-y-4">
                {filteredTickets.length === 0 ? (
                    <Card>
                        <CardContent className="flex items-center justify-center h-32">
                            <p className="text-muted-foreground">No support tickets found</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {getPaginatedData().map((ticket) => (
                            <Card key={ticket.id} className="transition-all duration-300 hover:shadow-md">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                                            <div className="flex gap-2">
                                                <Badge className={getStatusColor(ticket.status)}>
                                                    {ticket.status}
                                                </Badge>
                                                <Badge className={getPriorityColor(ticket.priority)}>
                                                    {ticket.priority}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {ticket.status === 'open' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(ticket.id, 'closed')}
                                                    className="transition-all duration-300 hover:shadow-md"
                                                >
                                                    Mark as Closed
                                                </Button>
                                            )}
                                            {ticket.status === 'closed' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(ticket.id, 'open')}
                                                    className="transition-all duration-300 hover:shadow-md"
                                                >
                                                    Reopen
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground mb-4">{ticket.message}</p>
                                    <div className="text-sm text-muted-foreground">
                                        Created: {new Date(ticket.createdAt).toLocaleString()}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        
                        {/* Advanced Pagination */}
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTickets.length)} of {filteredTickets.length} tickets
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                
                                {/* Page numbers - show current page ± 3 */}
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
                                    
                                    {/* Show ellipsis if there are more pages */}
                                    {currentPage + 3 < totalPages && (
                                        <>
                                            <span className="px-2 text-muted-foreground">...</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(totalPages)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {totalPages}
                                            </Button>
                                        </>
                                    )}
                                </div>
                                
                                {/* Page input */}
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="text"
                                        placeholder="Go to"
                                        value={pageInput}
                                        onChange={handlePageInputChange}
                                        onKeyPress={handlePageKeyPress}
                                        className="w-16 h-8 text-center"
                                        min={1}
                                        max={totalPages}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePageSubmit}
                                        disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                                        className="h-8 px-2"
                                    >
                                        Go
                                    </Button>
                                </div>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
