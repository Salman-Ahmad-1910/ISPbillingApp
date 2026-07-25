'use client';

import { useState, useEffect, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiPoint {
  label: string;
  value: number;
}

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `PKR ${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 1000000) return `PKR ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `PKR ${(value / 1000).toFixed(1)}K`;
  return `PKR ${value.toLocaleString()}`;
};

const MiniTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="rounded-lg border border-border bg-popover px-2 py-1 shadow-lg">
        <p className="text-[10px] font-semibold tabular-nums">{formatCurrency(val)}</p>
      </div>
    );
  }
  return null;
};

export function TotalCollectionChart() {
  const { companyId } = useCompany();
  const [data, setData] = useState<ApiPoint[]>([]);
  const [totalAllTime, setTotalAllTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    api.get(`/dashboard/collection-chart?companyId=${companyId}&period=yearly`)
      .then((response) => {
        const points = response.data?.data?.data || [];
        setData(points);
        const total = points.length > 0 ? points[points.length - 1].value : 0;
        setTotalAllTime(total);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setTotalAllTime(0);
        setLoading(false);
      });
  }, [companyId]);

  const chartData = useMemo(() => {
    return data.map((p, i) => ({ idx: i, value: p.value, label: p.label }));
  }, [data]);

  const changeInfo = useMemo(() => {
    if (data.length < 2) return { changeAbs: 0, changePct: 0, isUp: true };
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const abs = last - first;
    const pct = first !== 0 ? (abs / first) * 100 : (abs > 0 ? 100 : 0);
    return { changeAbs: abs, changePct: pct, isUp: abs >= 0 };
  }, [data]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Total Collections (All Time)</span>
        </div>
        <div className="pt-1">
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatCurrency(totalAllTime)}
          </div>
          <div className={cn('text-xs font-medium tabular-nums', changeInfo.isUp ? 'text-[#0f9d58]' : 'text-[#d93025]')}>
            {changeInfo.isUp ? '▲' : '▼'} {formatCurrency(Math.abs(changeInfo.changeAbs))} ({changeInfo.isUp ? '+' : ''}{changeInfo.changePct.toFixed(1)}%)
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        {loading ? (
          <div className="h-[80px] flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground/50" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[80px] flex items-center justify-center text-muted-foreground text-xs">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="totalCollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f9d58" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0f9d58" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<MiniTooltip />} cursor={false} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0f9d58"
                strokeWidth={2}
                fill="url(#totalCollGrad)"
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
