import { useMemo, useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { useCategories, useTransactions } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useChartColors } from '@/hooks/useTheme';
import { useTxForm } from '@/store/ui';
import { useSettings } from '@/store/settings';
import { buildSeries, byCategory, computeTotals, inRange, lastMonthsRange, pickGranularity } from '@/utils/stats';
import { daysBetween, formatRange, startOfMonth, todayISO, addMonths } from '@/utils/date';
import type { DateRange, TxType } from '@/types';
import { PageHeader, Segmented, Skeleton } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/EmptyState';
import { CashflowChart } from '@/components/charts/CashflowChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { NetChart } from '@/components/charts/NetChart';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { Legend } from '@/components/charts/ChartTooltip';
import { cn } from '@/utils/misc';

type RangeKey = '3m' | '6m' | '12m' | 'year' | 'custom';

export default function Analytics() {
  const txs = useTransactions();
  const { map: catMap } = useCategories();
  const { money } = useFormat();
  const dateFormat = useSettings((s) => s.dateFormat);
  const colors = useChartColors();
  const openNew = useTxForm((s) => s.openNew);
  const today = todayISO();

  const [key, setKey] = useState<RangeKey>('6m');
  const [custom, setCustom] = useState<DateRange>({ from: startOfMonth(addMonths(today, -2)), to: today });
  const [catType, setCatType] = useState<TxType>('expense');
  const [table, setTable] = useState(false);

  const range: DateRange = useMemo(() => {
    switch (key) {
      case '3m': return lastMonthsRange(3, today);
      case '6m': return lastMonthsRange(6, today);
      case '12m': return lastMonthsRange(12, today);
      case 'year': return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
      case 'custom': return custom;
    }
  }, [key, custom, today]);

  const a = useMemo(() => {
    if (!txs) return null;
    const list = inRange(txs, range);
    const totals = computeTotals(list);
    const monthly = buildSeries(txs, range, 'month');
    const series = buildSeries(txs, range, pickGranularity(range));
    const months = Math.max(1, monthly.length);
    const activeMonths = monthly.filter((m) => m.expense > 0 || m.income > 0).length || 1;
    return {
      totals,
      monthly,
      series,
      avgExpense: Math.round(totals.expense / Math.min(months, activeMonths)),
      avgIncome: Math.round(totals.income / Math.min(months, activeMonths)),
      savings: totals.income > 0 ? (totals.net / totals.income) * 100 : null,
      slices: byCategory(list, catType, catMap),
      biggest: list.filter((t) => t.type === 'expense').reduce<typeof list[number] | null>((m, t) => (!m || t.amount > m.amount ? t : m), null),
    };
  }, [txs, range, catType, catMap]);

  const granLabel = daysBetween(range.from, range.to) <= 62 ? 'kunlik' : 'oylik';

  return (
    <div>
      <PageHeader title="Analitika" subtitle={formatRange(range, dateFormat)} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          label="Davr"
          value={key}
          onChange={setKey}
          className="max-w-full overflow-x-auto scrollbar-none"
          options={[
            { value: '3m', label: '3 oy' },
            { value: '6m', label: '6 oy' },
            { value: '12m', label: '12 oy' },
            { value: 'year', label: 'Bu yil' },
            { value: 'custom', label: 'Maxsus' },
          ]}
        />
        {key === 'custom' && (
          <div className="flex items-center gap-2 animate-fade-in">
            <input type="date" aria-label="Boshlanish" className="input h-10 w-auto text-sm" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} />
            <span className="text-subtle">—</span>
            <input type="date" aria-label="Tugash" className="input h-10 w-auto text-sm" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} />
          </div>
        )}
      </div>

      {!a ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-full rounded-3xl" />)}</div>
      ) : txs!.length === 0 ? (
        <div className="card">
          <EmptyState
            art="chart"
            title="Analitika uchun ma’lumot yo‘q"
            description="Grafiklar sizning haqiqiy tranzaksiyalaringiz asosida hisoblanadi. Birinchi yozuvni qo‘shing."
            action={<button className="btn btn-primary" onClick={() => openNew('expense')}>Tranzaksiya qo‘shish</button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Xulosa */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Kpi label="Jami daromad" value={money(a.totals.income)} tone="income" sub={`O‘rtacha oyiga ${money(a.avgIncome, { compact: true })}`} />
            <Kpi label="Jami xarajat" value={money(a.totals.expense)} tone="expense" sub={`O‘rtacha oyiga ${money(a.avgExpense, { compact: true })}`} />
            <Kpi label="Sof natija" value={money(a.totals.net, { sign: 'always' })} tone={a.totals.net >= 0 ? 'income' : 'expense'} sub={`${a.totals.count} ta operatsiya`} />
            <Kpi
              label="Tejash ulushi"
              value={a.savings === null ? '—' : `${a.savings.toFixed(1).replace('.', ',')}%`}
              tone="accent"
              sub={a.biggest ? `Eng katta xarajat: ${money(a.biggest.amount, { compact: true })}` : 'Xarajatlar yo‘q'}
            />
          </div>

          {/* Taqqoslash */}
          <ChartCard
            title="Daromad va xarajat taqqoslanishi"
            subtitle={`${granLabel[0].toUpperCase()}${granLabel.slice(1)} ko‘rinish`}
            right={
              <div className="flex items-center gap-3">
                <Legend items={[{ label: 'Daromad', color: colors.income }, { label: 'Xarajat', color: colors.expense }]} />
                <button className="icon-btn h-9 w-9" onClick={() => setTable((v) => !v)} aria-pressed={table} title={table ? 'Grafik ko‘rinishi' : 'Jadval ko‘rinishi'} aria-label={table ? 'Grafik ko‘rinishi' : 'Jadval ko‘rinishi'}>
                  {table ? <BarChart3 size={18} /> : <Table2 size={18} />}
                </button>
              </div>
            }
          >
            {table ? <MonthlyTable rows={a.monthly} /> : <CashflowChart data={a.series} height={280} />}
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Oylik xarajatlar" subtitle="Har oy bo‘yicha jami xarajat">
              <CashflowChart data={a.monthly} series={['expense']} height={230} />
            </ChartCard>

            <ChartCard
              title="Kategoriyalar bo‘yicha"
              right={
                <Segmented size="sm" value={catType} onChange={setCatType} label="Turi" options={[{ value: 'expense', label: 'Xarajat' }, { value: 'income', label: 'Daromad' }]} />
              }
            >
              {a.slices.length ? (
                <CategoryDonut slices={a.slices} total={catType === 'expense' ? a.totals.expense : a.totals.income} title={catType === 'expense' ? 'Xarajat' : 'Daromad'} />
              ) : (
                <EmptyState compact title="Ma’lumot yo‘q" description="Bu davrda yozuvlar topilmadi." />
              )}
            </ChartCard>

            <ChartCard title="Daromad dinamikasi" subtitle={`${granLabel[0].toUpperCase()}${granLabel.slice(1)} daromad`}>
              <TrendChart data={a.series} dataKey="income" />
            </ChartCard>

            <ChartCard title="Xarajat dinamikasi" subtitle={`${granLabel[0].toUpperCase()}${granLabel.slice(1)} xarajat`}>
              <TrendChart data={a.series} dataKey="expense" />
            </ChartCard>
          </div>

          <ChartCard
            title="Sof moliyaviy natija"
            subtitle="Daromad − xarajat, har oy bo‘yicha"
            right={<Legend items={[{ label: 'Ijobiy', color: colors.income }, { label: 'Salbiy', color: colors.expense }]} />}
          >
            <NetChart data={a.monthly} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'income' | 'expense' | 'accent' }) {
  return (
    <div className="card min-w-0">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
        <span className={cn('h-2 w-2 rounded-full', tone === 'income' ? 'bg-income' : tone === 'expense' ? 'bg-expense' : 'bg-accent')} />
        {label}
      </p>
      <p className="tabular mt-2 text-lg lg:text-xl font-bold tracking-tight text-ink break-words">{value}</p>
      <p className="mt-1 text-[12px] text-subtle truncate">{sub}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card min-w-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function MonthlyTable({ rows }: { rows: ReturnType<typeof buildSeries> }) {
  const { money } = useFormat();
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-[12px] text-muted border-b border-line">
            <th className="py-2 px-1 font-medium">Oy</th>
            <th className="py-2 px-1 font-medium text-right">Daromad</th>
            <th className="py-2 px-1 font-medium text-right">Xarajat</th>
            <th className="py-2 px-1 font-medium text-right">Sof natija</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line/50 last:border-0">
              <td className="py-2 px-1 font-medium">{r.fullLabel}</td>
              <td className="py-2 px-1 text-right text-income">{money(r.income)}</td>
              <td className="py-2 px-1 text-right text-expense">{money(r.expense)}</td>
              <td className={cn('py-2 px-1 text-right font-semibold', r.net >= 0 ? 'text-income' : 'text-expense')}>{money(r.net, { sign: 'always' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
