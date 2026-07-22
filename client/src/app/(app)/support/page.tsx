'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, LifeBuoy, Send, Clock, CheckCircle2, AlertCircle, Headphones, Ticket, MessageCircle, HelpCircle } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supportTicketSchema } from "@/lib/schemas";
import { useGenericQuery } from "@/hooks/api/use-generic-query";
import api from "@/lib/api";
import { useCompany } from "@/context/company-context";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LoadingSpinner } from '@/components/shared/loading-spinner';

type SupportTicketValues = z.infer<typeof supportTicketSchema>;

const statCardClasses = "group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg";

export default function SupportPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading: isLoadingTickets } = useGenericQuery<any>(
    'admin/support-tickets',
    companyId ?? undefined
  );

  const form = useForm<SupportTicketValues>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: "",
      message: "",
      priority: "medium",
      status: "open",
    },
  });

  async function onSubmit(values: SupportTicketValues) {
    try {
      if (!companyId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a company first.",
        });
        return;
      }

      await api.post(`/admin/support-tickets`, {
        ...values,
        companyId,
      });

      toast({
        title: "Success",
        description: "Your support ticket has been submitted.",
      });

      form.reset();
      queryClient.invalidateQueries({ queryKey: [companyId, 'admin/support-tickets'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit ticket. Please try again.",
      });
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'closed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-sm text-muted-foreground">Get help and find answers to your questions.</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Submit a Ticket</CardTitle>
                  <CardDescription>Describe your issue and our team will get back to you.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief description of the issue" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please provide details about your issue..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                  >
                    {form.formState.isSubmitting ? (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Submit Ticket
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Recent Tickets</CardTitle>
                  <CardDescription>Track the status of your reported issues.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTickets ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all duration-300">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{ticket.subject}</h4>
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{ticket.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted on {format(new Date(ticket.createdAt), 'PPpp')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-1.5 text-sm capitalize">
                          {getStatusIcon(ticket.status)}
                          {ticket.status}
                        </div>
                      </div>
                    </div>
                  )).reverse()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tickets found. Submit a ticket above to get help.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="hover:text-emerald-600 transition-colors">
                    How do I add a new company?
                  </AccordionTrigger>
                  <AccordionContent>
                    You can add a new company by navigating to Administration &gt; Companies and clicking the "Add Company" button. Only Super Admins have this permission.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="hover:text-emerald-600 transition-colors">
                    How can I change my password?
                  </AccordionTrigger>
                  <AccordionContent>
                    To change your password, click on your profile avatar in the top-right corner, select "Profile", and you will find an option to update your security settings, including your password.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="hover:text-emerald-600 transition-colors">
                    Where can I see my billing details?
                  </AccordionTrigger>
                  <AccordionContent>
                    Your subscription and billing details are available under the "Billing" section in the user menu, accessible from the top-right corner.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 border-l pl-8">
          <div className="sticky top-8 space-y-8">
            <Card className="hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Contact Us</CardTitle>
                    <CardDescription>We're here to help.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Phone Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Our team is available 9am-5pm on weekdays.
                    </p>
                    <a href="tel:+123456789" className="text-sm text-emerald-600 hover:underline font-medium">
                      +1 (234) 567-89
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Email Support</h4>
                    <p className="text-sm text-muted-foreground">
                      We'll get back to you within 24 hours.
                    </p>
                    <a href="mailto:support@fintrack.com" className="text-sm text-emerald-600 hover:underline font-medium">
                      support@fintrack.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
                    <LifeBuoy className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Help Center</h4>
                    <p className="text-sm text-muted-foreground">
                      Find articles and guides.
                    </p>
                    <a href="#" className="text-sm text-emerald-600 hover:underline font-medium">
                      Visit Help Center
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
