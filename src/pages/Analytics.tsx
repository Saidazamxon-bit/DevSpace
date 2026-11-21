import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, List, Plus } from 'lucide-react';
import { useBudgets, useCategories, useTransactions } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useSettings } from '@/store/settings';
import { useTxForm } from '@/store/ui';
import { periodRange, usePeriodStore } from '@/store/period';
import { budgetStatuses, byCategory, computeTotals, inRange } from '@/utils/stats';
import { describeRange, startOfMonth, todayISO, formatMonthYear } from '@/utils/date';
import type { TxType } from '@/types';
import { cn } from '@/utils/misc';
import { PageHeader, CategoryIcon, ProgressBar, Skeleton } from '@/components/ui/primitives';
import { PeriodBar } from '@/components/PeriodBar';
import { BreakdownDonut } from '@/components/BreakdownDonut';
import { Amount } from '@/components/Amount';
import { InfoButton } from '@/components/InfoButton';

type Tab = 'expense' | 'budget' | 'income';
const TABS: { value: Tab; label: string }[] = [
  { value: 'expense', label: 'Xarajatlar' },
  { value: 'budget', label: 'Budjet' },
  { value: 'income', label: 'Daromadlar' },
];

/** Tahlil: kategoriyalar bo‘yicha taqsimot (donut), budjet holati */
export default function Analytics() {
  const txs = useTransactions();
  const budgets = useBudgets();
  const { map: catMap } = useCategories();
  const warn = useSettings((s) => s.budgetWarnPercent);
  const dateFormat = useSettings((s) => s.dateFormat);
  const { money } = useFormat();
  const openNew = useTxForm((s) => s.openNew);
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'income' ? 'income' : params.get('tab') === 'budget' ? 'budget' : 'expense';
  const setTab = (t: Tab) => setParams(t === 'expense' ? {} : { tab: t }, { replace: true });

  const { preset, offset, custom, setPreset, shift, setCustom } = usePeriodStore();
  const range = useMemo(() => periodRange(preset, offset, custom), [preset, offset, custom]);
  const [selected, setSelected] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    setSelected(null);
    setAll(false);
  }, [tab, range.from, range.to]);

  const type: TxType = tab === 'income' ? 'income' : 'expense';
  const data = useMemo(() => {
    if (!txs) return null;
    const list = inRange(txs, range);
    return { slices: byCategory(list, type, catMap), totals: computeTotals(list) };
  }, [txs, range, type, catMap]);

  const month = startOfMonth(todayISO());
  const budgetData = useMemo(() => {
    if (!budgets || !txs) return null;
    const st = budgetStatuses(budgets, txs, month, catMap, warn).sort((a, b) => b.percent - a.percent);
    const limit = st.reduce((s, x) => s + x.budget.limit, 0);
    const spent = st.reduce((s, x) => s + x.spent, 0);
    return { st, limit, spent, pct: limit ? (spent / limit) * 100 : 0 };
  }, [budgets, txs, month, catMap, warn]);

  const sel = selected ? data?.slices.find((s) => s.categoryId === selected) : undefined;
  const total = type === 'income' ? data?.totals.income ?? 0 : data?.totals.expense ?? 0;
  const rows = data ? (all ? data.slices : data.slices.slice(0, 5)) : [];
  const periodText = describeRange(preset, range, dateFormat);

  return (
    <div className="pb-6">
      <PageHeader title="Tahlil" back={false} />

      <div className="mx-auto max-w-xl space-y-4">
        {/* Xarajat · Budjet · Daromad */}
        <div role="tablist" aria-label="Tahlil turi" className="glass relative mx-auto grid max-w-sm grid-cols-3 rounded-full p-1">
          <span
            aria-hidden
            className="glass-bubble absolute top-1 bottom-1 rounded-full transition-[left] duration-300 ease-[cubic-bezier(.3,1.3,.5,1)]"
            style={{ left: `calc(4px + (100% - 8px) * ${TABS.findIndex((t) => t.value === tab)} / 3)`, width: 'calc((100% - 8px) / 3)' }}
          />
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn('relative z-10 h-10 rounded-full text-[14px] font-semibold transition-colors', tab === t.value ? 'text-ink' : 'text-muted')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== 'budget' && (
          <>
            <PeriodBar preset={preset} range={range} custom={custom} onPreset={setPreset} onShift={shift} onCustom={setCustom} />

            <section className="card" aria-label={type === 'income' ? 'Daromadlar' : 'Xarajatlar'}>
              <p className="text-[13px] font-medium text-muted">{type === 'income' ? 'Daromadlar' : 'Xarajatlar'}</p>
              {!data ? (
                <Skeleton className="mx-auto mt-4 aspect-square w-48 rounded-full" />
              ) : (
                <div className="mt-2" onClick={() => setSelected(null)}>
                  <BreakdownDonut slices={data.slices} selected={selected} onSelect={setSelected}>
                    {sel ? (
                      <div className="flex flex-col items-center gap-0.5 animate-fade-in">
                        <CategoryIcon icon={sel.icon} color={sel.color} size="sm" />
                        <p className="max-w-full truncate text-[12px] font-semibold text-muted">{sel.name}</p>
                        <p className="whitespace-nowrap font-bold text-ink" style={{ fontSize: 'clamp(14px, 7.5cqw, 20px)' }}>
                          <Amount value={sel.total} />
                        </p>
                        <p className="text-[11px] text-subtle">{sel.percent.toFixed(1).replace('.', ',')}% · {sel.count} ta</p>
                      </div>
                    ) : (
                      <div data-testid="center-totals">
                        <p className="whitespace-nowrap font-bold text-ink" style={{ fontSize: 'clamp(16px, 8cqw, 24px)' }} data-testid="period-expense">
                          <Amount value={total} />
                        </p>
                        <p className="text-[12px] text-muted first-letter:uppercase">
                          {type === 'income' ? 'tushum' : 'sarflandi'} · {periodText.toLowerCase()}
                        </p>
                      </div>
                    )}
                  </BreakdownDonut>
                </div>
              )}

              {data && data.slices.length === 0 ? (
                <div className="pt-4 text-center">
                  <p className="font-semibold text-ink">Bu davrda {type === 'income' ? 'daromad' : 'xarajat'} yo‘q</p>
                  <button type="button" onClick={() => openNew(type)} className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-[14px] font-semibold text-ink">
                    <Plus size={16} /> {type === 'income' ? 'Daromad' : 'Xarajat'} qo‘shish
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-1">
                  {rows.map((r) => (
                    <li key={r.categoryId}>
                      <Link
                        to={`/transactions?category=${r.categoryId}`}
                        className={cn('flex items-center gap-3 rounded-2xl px-1.5 py-2 transition-colors hover:bg-surface-2/70', selected === r.categoryId && 'bg-surface-2')}
                      >
                        <CategoryIcon icon={r.icon} color={r.color} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-ink">{r.name}</span>
                          <span className="block text-[12px] text-muted">
                            {r.percent.toFixed(0)}% · {r.count} ta
                          </span>
                        </span>
                        <span className="text-[16px] font-bold text-ink">
                          <Amount value={r.total} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {data && data.slices.length > 5 && (
                <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 h-11 w-full rounded-full bg-surface-2 text-[14px] font-semibold text-muted hover:text-ink">
                  {all ? 'Kamroq ko‘rsatish' : `Ko‘proq ko‘rish (${data.slices.length - 5})`}
                </button>
              )}
            </section>

            {data && (
              <div className="grid grid-cols-2 gap-3">
                <div className="card !p-4">
                  <p className="text-[12px] text-muted">Daromad</p>
                  <p className="mt-1 text-[17px] font-bold text-income"><Amount value={data.totals.income} /></p>
                </div>
                <div className="card !p-4">
                  <p className="text-[12px] text-muted">Qoldiq (daromad − xarajat)</p>
                  <p className={cn('mt-1 text-[17px] font-bold', data.totals.net >= 0 ? 'text-ink' : 'text-expense')}>
                    <Amount value={data.totals.net} sign="always" />
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'budget' && (
          <section className="card" aria-label="Budjet">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
                Budjet · {formatMonthYear(month)} <InfoButton topic="budgets" />
              </p>
              <Link to="/budgets" className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-accent">
                Boshqarish <ChevronRight size={15} />
              </Link>
            </div>
            {!budgetData ? (
              <Skeleton className="mt-4 h-40 w-full" />
            ) : budgetData.st.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-semibold text-ink">Budjetlar belgilanmagan</p>
                <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">Kategoriyalar uchun oylik limit qo‘ying — ilova oshib ketishidan oldin ogohlantiradi.</p>
                <Link to="/budgets" className="btn btn-primary mt-4 rounded-full">
                  <Plus size={16} /> Budjet qo‘shish
                </Link>
              </div>
            ) : (
              <>
                <div className="relative mx-auto mt-3 aspect-square w-44" style={{ containerType: 'inline-size' }}>
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(var(--surface-2))" strokeWidth="9" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={budgetData.pct > 100 ? 'rgb(var(--expense))' : budgetData.pct >= warn ? 'rgb(var(--warn))' : 'rgb(var(--accent))'}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.min(100, budgetData.pct) * 2.639} 263.9`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[28px] font-bold text-ink">{Math.round(budgetData.pct)}%</p>
                    <p className="text-[12px] text-muted">sarflandi</p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[14px] text-muted">
                  <b className="text-ink">{money(budgetData.spent)}</b> / {money(budgetData.limit)}
                </p>
                <ul className="mt-4 space-y-3">
                  {budgetData.st.map((b) => (
                    <li key={b.budget.id} className="flex items-center gap-3">
                      <CategoryIcon icon={b.category?.icon ?? 'more'} color={b.category?.color ?? '#94a3b8'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[15px] font-semibold text-ink">{b.category?.name}</span>
                          <span className={cn('text-[13px] font-semibold', b.state === 'over' ? 'text-expense' : b.state === 'warn' ? 'text-warn' : 'text-muted')}>
                            {b.remaining < 0 ? `${money(-b.remaining, { compact: true })} ortiq` : `${money(b.remaining, { compact: true })} qoldi`}
                          </span>
                        </div>
                        <ProgressBar className="mt-1.5" value={b.percent} tone={b.state === 'over' ? 'over' : b.state === 'warn' ? 'warn' : 'accent'} label={`${b.category?.name} budjeti`} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <Link to="/transactions" className="flex h-12 items-center justify-center gap-2 rounded-full bg-surface text-[14px] font-semibold text-muted shadow-soft hover:text-ink">
          <List size={17} /> Barcha tranzaksiyalar
        </Link>
      </div>
    </div>
  );
}
