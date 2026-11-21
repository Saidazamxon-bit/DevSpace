import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '@/hooks/useTheme';
import type { SeriesPoint } from '@/utils/stats';
import { formatAxis } from '@/utils/money';
import { ChartTooltip } from './ChartTooltip';

/** Sof moliyaviy natija: musbat — yashil, manfiy — qizil */
export function NetChart({ data, height = 220 }: { data: SeriesPoint[]; height?: number }) {
  const c = useChartColors();
  const rows = data.map((d) => ({ ...d, netColor: d.net >= 0 ? c.income : c.expense }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} interval="preserveStartEnd" minTickGap={8} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={formatAxis} width={66} allowDecimals={false} />
          <ReferenceLine y={0} stroke={c.axis} strokeOpacity={0.5} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: c.cursor } as never} />
          <Bar dataKey="net" radius={[4, 4, 4, 4]} maxBarSize={26} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.key} fill={r.netColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
