import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '@/hooks/useTheme';
import type { SeriesPoint } from '@/utils/stats';
import { formatAxis } from '@/utils/money';
import { ChartTooltip } from './ChartTooltip';

/** Bitta ko‘rsatkich dinamikasi (daromad yoki xarajat) — chiziq + yengil soyali maydon */
export function TrendChart({ data, dataKey, height = 220 }: { data: SeriesPoint[]; dataKey: 'income' | 'expense'; height?: number }) {
  const c = useChartColors();
  const color = dataKey === 'income' ? c.income : c.expense;
  const gid = useId().replace(/:/g, '');
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} interval="preserveStartEnd" minTickGap={12} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={formatAxis} width={66} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#g${gid})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: c.surface, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
