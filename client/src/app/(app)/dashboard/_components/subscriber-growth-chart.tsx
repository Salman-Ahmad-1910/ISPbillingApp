'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiPoint {
  label: string; // 'YYYY-MM-DD HH24:MI:SS' (daily) | 'YYYY-MM-DD' (weekly/monthly) | 'YYYY-MM' (yearly)
  value: number;
}

interface ChartPoint {
  hour?: number; // numeric 0-24, daily only
  label?: string;
  value: number;
  timestamp?: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAILY_TICKS = [0, 6, 12, 18, 24];

const PERIOD_TABS: { key: string; label: string }[] = [
  { key: 'daily', label: '1D' },
  { key: 'weekly', label: '1W' },
  { key: 'monthly', label: '1M' },
  { key: 'yearly', label: '1Y' },
];

function parseServerDate(label: string): Date {
  // Postgres TO_CHAR gives 'YYYY-MM-DD HH24:MI:SS' - needs a 'T' for
  // consistent cross-browser Date parsing.
  return new Date(label.includes(' ') ? label.replace(' ', 'T') : label);
}

function formatAxisLabel(label: string, period: string): string {
  if (!label) return label;
  if (period === 'weekly') {
    const d = new Date(label);
    if (!isNaN(d.getTime())) return DAY_NAMES[d.getDay()];
    return label;
  }
  if (period === 'monthly') {
    const d = new Date(label);
    if (!isNaN(d.getTime())) return d.getDate().toString();
    return label;
  }
  if (period === 'yearly') {
    const parts = label.split('-');
    if (parts.length >= 2) return MONTH_NAMES[parseInt(parts[1]) - 1] || label;
    return label;
  }
  return label;
}

function formatTooltipLabel(point: ChartPoint, period: string): string {
  if (period === 'daily' && point.timestamp) {
    return new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const label = point.label ?? '';
  if (period === 'weekly') {
    const d = new Date(label);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  if (period === 'monthly') {
    const d = new Date(label);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  if (period === 'yearly') {
    const parts = label.split('-');
    if (parts.length >= 2) return MONTH_NAMES[parseInt(parts[1]) - 1] + ' ' + parts[0];
  }
  return label;
}

// Google Finance-style crosshair: a thin vertical dashed line plus a dot on
// the curve, rendered as the recharts Tooltip cursor + a custom active dot.
const CrosshairDot = (colorLine: string) => (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={colorLine} fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={4} fill={colorLine} stroke="white" strokeWidth={2} />
    </g>
  );
};

const CustomTooltip = ({ active, payload, period }: any) => {
  if (active && payload && payload.length) {
    const point: ChartPoint = payload[0].payload;
    const val = Math.round(payload[0].value);
    const displayLabel = formatTooltipLabel(point, period);
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
        <p className="text-[11px] text-muted-foreground mb-0.5">{displayLabel}</p>
        <p className="text-base font-semibold text-foreground tabular-nums">
          {val} <span className="text-xs font-normal text-muted-foreground">active</span>
        </p>
      </div>
    );
  }
  return null;
};

interface SubscriberGrowthChartProps {
  /** The exact number shown on the Active Subscribers KPI card - keeps the two in sync.
   *  Optional: if the parent doesn't pass it, the chart falls back to its own latest fetched value. */
  liveActiveCount?: number;
}

export function SubscriberGrowthChart({ liveActiveCount }: SubscriberGrowthChartProps) {
  const { companyId } = useCompany();
  const [period, setPeriod] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [rawData, setRawData] = useState<ApiPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const isCurrentMonth = !selectedMonth || selectedMonth === today.toISOString().slice(0, 7);
  const monthOptions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthOptions.push(m.toISOString().slice(0, 7));
  }

  const fetchData = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    let url = `/dashboard/subscriber-growth-chart?companyId=${companyId}&period=${period}`;
    if (period === 'monthly' && selectedMonth) url += `&month=${selectedMonth}`;
    api.get(url)
      .then((response) => {
        setRawData(response.data.data.data || []);
        setLoading(false);
      })
      .catch(() => {
        setRawData([]);
        setLoading(false);
      });
  }, [companyId, period, selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh to stay in step with the Active Subscribers card's own poll.
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // If the parent passes a valid liveActiveCount, use it. Otherwise fall back
  // to the chart's own last fetched value, so this component never breaks on
  // its own even if the surrounding page hasn't been updated to pass it.
  const hasValidLiveCount = typeof liveActiveCount === 'number' && !Number.isNaN(liveActiveCount);
  const fallbackCount = rawData.length > 0 ? rawData[rawData.length - 1].value : 0;
  const effectiveLiveCount = hasValidLiveCount ? (liveActiveCount as number) : fallbackCount;

  // Build render-ready points, and - for whatever window currently includes
  // "now" - snap the last point to the live count so the chart never lags
  // behind the KPI card even if the last backend poll is a beat stale.
  const data: ChartPoint[] = useMemo(() => {
    const windowIncludesNow = period !== 'monthly' || isCurrentMonth;

    let points: ChartPoint[];
    if (period === 'daily') {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      points = rawData.map((p) => {
        const d = parseServerDate(p.label);
        return { hour: (d.getTime() - startOfDay) / 3600000, value: p.value, timestamp: d.getTime() };
      });
    } else {
      points = rawData.map((p) => ({ label: p.label, value: p.value, timestamp: parseServerDate(p.label).getTime() }));
    }

    if (windowIncludesNow && points.length > 0) {
      points[points.length - 1] = { ...points[points.length - 1], value: effectiveLiveCount };
    }
    return points;
  }, [rawData, period, isCurrentMonth, effectiveLiveCount, today]);

  // Google-style summary line: current value + absolute/percent change over the visible window.
  const { startValue, endValue, changeAbs, changePct, isUp } = useMemo(() => {
    if (data.length === 0) return { startValue: 0, endValue: 0, changeAbs: 0, changePct: 0, isUp: true };
    const start = data[0].value;
    const end = period === 'daily' || isCurrentMonth ? effectiveLiveCount : data[data.length - 1].value;
    const abs = end - start;
    const pct = start !== 0 ? (abs / start) * 100 : 0;
    return { startValue: start, endValue: end, changeAbs: abs, changePct: pct, isUp: abs >= 0 };
  }, [data, period, isCurrentMonth, effectiveLiveCount]);

  // Google Finance greens/reds
  const lineColor = isUp ? '#0f9d58' : '#d93025';
  const gradientColor = isUp ? '#0f9d58' : '#d93025';

  const yDomain = (() => {
    if (data.length === 0) return [0, 10];
    const vals = data.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = Math.max((max - min) * 0.25, 1);
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  })();

  return (
    <Card className="lg:col-span-3 border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Active Subscribers</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2 pt-1">
          <div>
            <div className="text-3xl font-semibold tabular-nums tracking-tight">{Math.round(endValue)}</div>
            <div className={cn('text-sm font-medium tabular-nums', isUp ? 'text-[#0f9d58]' : 'text-[#d93025]')}>
              {isUp ? '▲' : '▼'} {Math.abs(Math.round(changeAbs))} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
            </div>
          </div>
          {period === 'monthly' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {monthOptions.map((m) => {
                  const d = new Date(m + '-01');
                  return (
                    <SelectItem key={m} value={m}>
                      {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-0" ref={chartRef}>
        {loading ? (
          <div className="h-[260px] flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-muted border-t-foreground/50" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Users className="h-7 w-7 opacity-30 mx-auto" />
              <p className="text-sm font-medium">No subscribers yet</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradientColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={gradientColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              {period === 'daily' ? (
                <XAxis
                  type="number"
                  dataKey="hour"
                  domain={[0, 24]}
                  ticks={DAILY_TICKS}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickMargin={8}
                  tickFormatter={(h: number) => `${h}:00`}
                />
              ) : (
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={40}
                  tickFormatter={(val: string) => formatAxisLabel(val, period)}
                />
              )}

              <YAxis hide domain={yDomain} />

              <Tooltip
                content={<CustomTooltip period={period} />}
                cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }}
                wrapperStyle={{ zIndex: 50 }}
              />
              <Area
                type="stepAfter"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#growthGrad)"
                dot={false}
                activeDot={CrosshairDot(lineColor)}
                isAnimationActive={true}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Google Finance-style period tabs */}
        <div className="mt-2 flex items-center justify-center gap-1 border-t pt-2">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setPeriod(tab.key); if (tab.key !== 'monthly') setSelectedMonth(''); }}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                period === tab.key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
