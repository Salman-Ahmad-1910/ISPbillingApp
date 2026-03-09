'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SubscriberGrowthChartProps {
    data: any[];
}

export function SubscriberGrowthChart({ data }: SubscriberGrowthChartProps) {
    return (
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>New Subscriber Growth</CardTitle>
                <CardDescription>Number of new subscribers per month.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))'}}/>
                    <Legend />
                    <Line type="monotone" dataKey="new" stroke="hsl(var(--primary))" strokeWidth={2} name="New Subscribers" />
                </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
