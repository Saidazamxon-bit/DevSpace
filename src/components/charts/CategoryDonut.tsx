import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartColors } from '@/hooks/useTheme';
import { useFormat } from '@/hooks/useFormat';
import { foldSlices, type CategorySlice } from '@/utils/stats';
import { CategoryIcon } from '../ui/primitives';
import { cn } from '@/utils/misc';

function SliceTooltip({ active, payload }: { active?: boolean; payload?: { payload: CategorySlice }[] }) {
  const { money } = useFormat();
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-xl border border-line/80 bg-surface/95 backdrop-blur px-3 py-2 shadow-lift text-[13px]">
      <p className="flex items-center gap-1.5 font-semibold text-ink">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
        {s.name}
      </p>
      <p className="tabular text-muted mt-0.5">
        {money(s.total)} · {s.percent.toFixed(1).replace('.', ',')}%
      </p>
    </div>
  );
}

/** Kategoriyalar bo‘yicha taqsimot: donut + ro‘yxat (identifikatsiya faqat rangga tayanmaydi) */
export function CategoryDonut({ slices, total, title = 'Jami', limit = 6, stack }: { slices: CategorySlice[]; total: number; title?: string; limit?: number; stack?: boolean }) {
  const c = useChartColors();
  const { money } = useFormat();
  const [active, setActive] = useState<number | null>(null);
  const data = foldSlices(slices, limit);
  return (
    <div className={cn('flex flex-col items-center gap-5', stack ? 'sm:flex-row lg:flex-col' : 'sm:flex-row')}>
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke={c.surface}
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive={false}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((s, i) => (
                <Cell key={s.categoryId} fill={s.color} opacity={active === null || active === i ? 1 : 0.45} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[12px] text-muted">{title}</p>
            <p className="tabular text-[15px] font-bold text-ink leading-tight">{money(total, { compact: true })}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2.5">
        {data.map((s, i) => (
          <li key={s.categoryId} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <div className="flex items-center gap-2.5">
              <CategoryIcon icon={s.icon} color={s.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{s.name}</span>
                  <span className="tabular shrink-0 text-sm font-semibold text-ink">{money(s.total)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, s.percent)}%`, background: s.color }} />
                    </div>
                  </div>
                  <span className="tabular w-11 text-right text-[12px] text-muted">{s.percent.toFixed(1).replace('.', ',')}%</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

