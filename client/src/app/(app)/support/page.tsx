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
import { Mail, Phone, LifeBuoy, Headphones, HelpCircle } from 'lucide-react';

export default function SupportPage() {
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
