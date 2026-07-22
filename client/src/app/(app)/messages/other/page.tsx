'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MailQuestion, Eye, Send, Loader2, Users, Globe, CheckCircle2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const messageTitles = [
  'Select the Message',
  'User Cradentials',
  'Defaulter',
  'Internet Card',
  'Promotion',
  'New User',
  'Internet Recharge',
];

const sublocalities = ['All', 'Gulshan', 'Saddar', 'Clifton', 'Defence', 'Korangi', 'Landhi', 'Malir'];
const statuses = ['All', 'Active', 'Inactive', 'Suspended', 'Deactivated'];
const types = ['Both', 'TV Cable', 'Internet', 'Box Number', 'Package', 'Connection Provider'];
const connectionProviders = ['All', 'PTCL', 'Transworld', 'StormFiber', 'Nayatel', 'Optix', 'ConnectComm'];

export default function OtherMessagesPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageTitle, setMessageTitle] = useState('');
  const [sublocality, setSublocality] = useState('All');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('Both');
  const [connectionProvider, setConnectionProvider] = useState('All');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  // For composing a new outbox message
  const [recipientName, setRecipientName] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [messageText, setMessageText] = useState('');

  const handleSendToOutbox = async () => {
    if (!recipientName || !recipientMobile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Recipient name and mobile are required.' });
      return;
    }
    setSending(true);
    try {
      await api.post(`/messages?companyId=${companyId}`, {
        name: recipientName,
        mobileNo: recipientMobile,
        address: recipientAddress,
        messageType: messageTitle || 'General',
        messageText,
        status: 'outbox',
        companyId,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      toast({ title: 'Success', description: 'Message sent to outbox.' });
      setRecipientName('');
      setRecipientMobile('');
      setRecipientAddress('');
      setMessageText('');
      setMessageTitle('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
    } finally {
      setSending(false);
    }
  };

  const messageTypesCount = messageTitles.filter(t => t !== 'Select the Message').length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
          <MailQuestion className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Other Messages</h1>
          <p className="text-sm text-muted-foreground">Compose and send messages to subscribers</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <MailQuestion className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Message Types</p>
              <p className="text-2xl font-bold">{messageTypesCount}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">New Message</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Compose</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Localities</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{sublocalities.length - 1}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Message Title</Label>
              <Select value={messageTitle} onValueChange={setMessageTitle}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select message title" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {messageTitles.map((title) => (
                    <SelectItem key={title} value={title}>{title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sublocality</Label>
              <Select value={sublocality} onValueChange={setSublocality}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select sublocality" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {sublocalities.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Connection Provider</Label>
              <Select value={connectionProvider} onValueChange={setConnectionProvider}>
                <SelectTrigger className="border-muted-foreground/20">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {connectionProviders.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-violet-500" />
            Compose New Message
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g., Ahmed Khan" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-muted-foreground/20" />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <input value={recipientMobile} onChange={e => setRecipientMobile(e.target.value)} placeholder="e.g., 0300-1234567" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-muted-foreground/20" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <input value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} placeholder="e.g., House 12, Block A, Gulshan" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-muted-foreground/20" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Message</Label>
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type your message..." className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-muted-foreground/20" />
            </div>
          </div>
          <div className="flex mt-6">
            <Button
              onClick={handleSendToOutbox}
              disabled={sending}
              className="w-48 bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 disabled:hover:scale-100"
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? 'Sending...' : 'Send to Outbox'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
