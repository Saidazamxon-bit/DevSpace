import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '@/hooks/useTheme';
import type { SeriesPoint } from '@/utils/stats';
import { formatAxis } from '@/utils/money';
import { ChartTooltip } from './ChartTooltip';

/** Daromad va xarajat taqqoslanishi — guruhlangan ustunlar */
export function CashflowChart({ data, height = 260, series = ['income', 'expense'] }: { data: SeriesPoint[]; height?: number; series?: ('income' | 'expense')[] }) {
  const c = useChartColors();
  const dense = data.length > 16;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap={dense ? '18%' : '28%'}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 12 }}
            interval={dense ? 'preserveStartEnd' : 0}
            minTickGap={dense ? 8 : 2}
            dy={6}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={formatAxis} width={66} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: c.cursor, radius: 6 } as never} />
          {series.includes('income') && <Bar dataKey="income" fill={c.income} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />}
          {series.includes('expense') && <Bar dataKey="expense" fill={c.expense} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
