'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Target } from 'lucide-react';

interface GaugeMeterProps {
  currentAmount: number;
  targetAmount: number;
  onTargetSave: (target: number) => void;
}

const COLOR_STOPS = [
  { pct: 0, r: 239, g: 68, b: 68 },
  { pct: 20, r: 249, g: 115, b: 22 },
  { pct: 40, r: 234, g: 179, b: 8 },
  { pct: 60, r: 132, g: 204, b: 22 },
  { pct: 80, r: 22, g: 163, b: 74 },
];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function getColor(pct: number): string {
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (pct <= b.pct) {
      const t = (pct - a.pct) / (b.pct - a.pct);
      return `rgb(${lerp(a.r, b.r, t)},${lerp(a.g, b.g, t)},${lerp(a.b, b.b, t)})`;
    }
  }
  const last = COLOR_STOPS[COLOR_STOPS.length - 1];
  return `rgb(${last.r},${last.g},${last.b})`;
}

export function GaugeMeter({ currentAmount, targetAmount, onTargetSave }: GaugeMeterProps) {
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [targetInput, setTargetInput] = useState(targetAmount > 0 ? targetAmount.toString() : '');
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

  useEffect(() => {
    if (animationRef.current) clearInterval(animationRef.current);
    const start = animatedPercent;
    const end = percentage;
    const diff = end - start;
    if (Math.abs(diff) < 0.1) {
      setAnimatedPercent(end);
      return;
    }
    const duration = 1200;
    const steps = 80;
    const increment = diff / steps;
    let step = 0;
    animationRef.current = setInterval(() => {
      step++;
      if (step >= steps) {
        setAnimatedPercent(end);
        clearInterval(animationRef.current!);
      } else {
        setAnimatedPercent(start + increment * step);
      }
    }, duration / steps);
    return () => { if (animationRef.current) clearInterval(animationRef.current); };
  }, [percentage]);

  const handleSaveTarget = () => {
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0) {
      onTargetSave(val);
      setShowTargetDialog(false);
    }
  };

  const getStatusLabel = (pct: number) => {
    if (pct >= 100) return 'Target Achieved!';
    if (pct >= 80) return 'Almost There';
    if (pct >= 60) return 'Good Progress';
    if (pct >= 40) return 'On Track';
    if (pct >= 20) return 'Getting Started';
    return 'Just Started';
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const outerR = 68;
  const innerR = 8;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const SEGMENTS = 200;

  const gradientArcs = Array.from({ length: SEGMENTS }, (_, i) => {
    const fromPct = (i / SEGMENTS) * 100;
    const toPct = ((i + 1) / SEGMENTS) * 100;
    const midPct = (fromPct + toPct) / 2;
    const color = getColor(midPct);
    const a1 = startAngle + (fromPct / 100) * totalAngle;
    const a2 = startAngle + (toPct / 100) * totalAngle;
    const os1 = polarToCartesian(a1, outerR);
    const os2 = polarToCartesian(a2, outerR);
    const is1 = polarToCartesian(a1, innerR);
    const is2 = polarToCartesian(a2, innerR);
    const largeArc = (a2 - a1) > 180 ? 1 : 0;
    const d = `M ${os1.x} ${os1.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${os2.x} ${os2.y} L ${is2.x} ${is2.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${is1.x} ${is1.y} Z`;
    return { d, color };
  });

  const ticks = Array.from({ length: 101 }, (_, i) => i);
  const majorTicks = [0, 20, 40, 60, 80, 100];
  const midTicks = [10, 30, 50, 70, 90];

  const needleAngle = startAngle + (animatedPercent / 100) * totalAngle;
  const needleTip = polarToCartesian(needleAngle, outerR + 2);
  const needleBaseLen = 8;
  const base1 = { x: cx + needleBaseLen * Math.cos(((needleAngle + 90) * Math.PI) / 180), y: cy + needleBaseLen * Math.sin(((needleAngle + 90) * Math.PI) / 180) };
  const base2 = { x: cx + needleBaseLen * Math.cos(((needleAngle - 90) * Math.PI) / 180), y: cy + needleBaseLen * Math.sin(((needleAngle - 90) * Math.PI) / 180) };

  const getTickLength = (tick: number) => {
    if (majorTicks.includes(tick)) return 16;
    if (midTicks.includes(tick)) return 10;
    return 5;
  };

  const getTickWidth = (tick: number) => {
    if (majorTicks.includes(tick)) return 2;
    if (midTicks.includes(tick)) return 1.5;
    return 0.8;
  };

  return (
    <>
      <div className="flex flex-col items-center gap-0 relative rounded-xl border bg-card shadow-sm p-0 pt-0 overflow-hidden">
        <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`} className="drop-shadow-sm">
          <defs>
            <filter id="needleShadow">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Smooth gradient arc — each segment colored by exact % position */}
          {gradientArcs.map((seg, i) => (
            <path key={i} d={seg.d} fill={seg.color} />
          ))}

          {/* Calibration ticks */}
          {ticks.map((tick) => {
            const angle = startAngle + (tick / 100) * totalAngle;
            const tickLen = getTickLength(tick);
            const tickW = getTickWidth(tick);
            const tipR = outerR - 1;
            const baseR = tipR - tickLen;
            const tip = { x: cx + tipR * Math.cos((angle * Math.PI) / 180), y: cy + tipR * Math.sin((angle * Math.PI) / 180) };
            const base = { x: cx + baseR * Math.cos((angle * Math.PI) / 180), y: cy + baseR * Math.sin((angle * Math.PI) / 180) };
            return (
              <line
                key={tick}
                x1={base.x} y1={base.y}
                x2={tip.x} y2={tip.y}
                stroke="#1f2937"
                strokeWidth={tickW}
                strokeLinecap="round"
              />
            );
          })}

          {/* Labels for major ticks */}
          {majorTicks.map((tick) => {
            const angle = startAngle + (tick / 100) * totalAngle;
            const labelR = outerR + 14;
            const label = { x: cx + labelR * Math.cos((angle * Math.PI) / 180), y: cy + labelR * Math.sin((angle * Math.PI) / 180) };
            return (
              <text
                key={tick}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fontWeight="600"
                fill="#6b7280"
              >
                {tick}
              </text>
            );
          })}

          {/* Needle */}
          <polygon
            points={`${needleTip.x},${needleTip.y} ${base1.x},${base1.y} ${cx},${cy} ${base2.x},${base2.y}`}
            fill="#1f2937"
            filter="url(#needleShadow)"
          />

          {/* Center hub */}
          <circle cx={cx} cy={cy} r={7} fill="#374151" />
          <circle cx={cx} cy={cy} r={4.5} fill="#6b7280" />
          <circle cx={cx} cy={cy} r={2} fill="#9ca3af" />
        </svg>

        {/* Digital display */}
        <div className="text-center -mt-4 relative z-10 px-2">
          <div className="text-xl font-extrabold tracking-tight" style={{ color: getColor(animatedPercent) }}>
            {animatedPercent.toFixed(1)}%
          </div>
          <p className="text-[9px] font-medium leading-tight" style={{ color: getColor(animatedPercent) }}>
            {getStatusLabel(animatedPercent)}
          </p>
          <p className="text-[9px] text-muted-foreground leading-tight">
            PKR {formatCurrency(currentAmount)} / {formatCurrency(targetAmount)}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1 mt-0.5 mb-2 border-dashed hover:border-solid transition-all"
          onClick={() => { setTargetInput(targetAmount > 0 ? targetAmount.toString() : ''); setShowTargetDialog(true); }}
        >
          <Target className="h-3 w-3" />
          Set Target
        </Button>
      </div>

      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Collection Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Target Amount (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="e.g. 500000.00"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">Enter the total collection target. Supports decimal points.</p>
            </div>
            <Button onClick={handleSaveTarget} disabled={!targetInput || parseFloat(targetInput) <= 0} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              Save Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
