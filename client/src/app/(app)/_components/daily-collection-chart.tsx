'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface DailyCollectionChartProps {
    data: any[];
}

export function DailyCollectionChart({ data }: DailyCollectionChartProps) {
    return (
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Daily Collection (Last 7 Days)</CardTitle>
                <CardDescription>Amount collected by recovery officers and dealers.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `PKR ${Number(value) / 1000}k`} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))'}}/>
                    <Bar dataKey="collection" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
