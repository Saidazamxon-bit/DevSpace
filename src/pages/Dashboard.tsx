import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, CheckCircle2, Circle, Download, PiggyBank, Plus, Target, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react';
import { useBudgets, useCategories, useInitialBalance, useOnboardingDismissed, useTransactions } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { usePeriod } from '@/hooks/usePeriod';
import { useTxForm } from '@/store/ui';
import { usePwa, isStandalone } from '@/store/pwa';
import { buildSeries, byCategory, computeBalance, computeTotals, financialHealth, inRange, lastMonthsRange } from '@/utils/stats';
import { addMonths, endOfMonth, formatLongToday, formatRange, greeting, MONTHS, PERIOD_LABELS, startOfMonth, todayISO, fromISODate } from '@/utils/date';
import { PeriodPicker } from '@/components/PeriodPicker';
import { CashflowChart } from '@/components/charts/CashflowChart';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { Legend } from '@/components/charts/ChartTooltip';
import { TransactionItem } from '@/components/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/primitives';
import { InitialBalanceModal } from '@/components/InitialBalanceModal';
import { useChartColors } from '@/hooks/useTheme';
import { setMeta, META_ONBOARDING } from '@/services/finance';
import { cn } from '@/utils/misc';
import { useSettings } from '@/store/settings';
import { Amount } from '@/components/Amount';

export default function Dashboard() {
  const txs = useTransactions();
  const { map: catMap } = useCategories();
  const initial = useInitialBalance();
  const budgets = useBudgets();
  const dismissed = useOnboardingDismissed();
  const { money } = useFormat();
  const dateFormat = useSettings((s) => s.dateFormat);
  const openNew = useTxForm((s) => s.openNew);
  const openEdit = useTxForm((s) => s.openEdit);
  const period = usePeriod('month');
  const colors = useChartColors();
  const [ibOpen, setIbOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  // Manifest yorliqlari: ./#/?add=expense
  useEffect(() => {
    const add = params.get('add');
    if (add === 'income' || add === 'expense') {
      openNew(add);
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams, openNew]);

  const today = todayISO();
  const loading = txs === undefined || initial === undefined;

  const data = useMemo(() => {
    if (!txs) return null;
    const periodTx = inRange(txs, period.range);
    const totals = computeTotals(periodTx);
    const monthTotals = computeTotals(inRange(txs, { from: startOfMonth(today), to: endOfMonth(today) }));
    const prevMonth = addMonths(today, -1);
    const prevTotals = computeTotals(inRange(txs, { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) }));
    return {
      balance: computeBalance(initial ?? 0, txs),
      totals,
      monthTotals,
      prevTotals,
      series: buildSeries(txs, period.range),
      slices: byCategory(periodTx, 'expense', catMap),
      monthly: buildSeries(txs, lastMonthsRange(6, today), 'month').reverse(),
      recent: txs.slice(0, 6),
      health: financialHealth(totals),
    };
  }, [txs, period.range, initial, catMap, today]);

  const now = new Date();
  const hasTx = (txs?.length ?? 0) > 0;
  const showOnboarding = dismissed === false && (!hasTx || !budgets?.length || !initial);
  const periodLabel = period.preset === 'custom' ? formatRange(period.range, dateFormat) : PERIOD_LABELS[period.preset].toLowerCase();

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Salomlashuv */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{formatLongToday(now)}</p>
          <h1 className="mt-0.5 text-2xl lg:text-[28px] font-bold tracking-tight">{greeting(now)}!</h1>
        </div>
        <Link to="/transactions" className="hidden sm:inline-flex btn btn-outline btn-sm h-10">
          Barcha operatsiyalar <ArrowRight size={16} />
        </Link>
      </div>

      {/* Asosiy kartalar: balans (2×2) + daromad, xarajat, oy natijasi, moliyaviy holat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="hero col-span-2 lg:row-span-2 relative overflow-hidden rounded-[1.75rem] p-5 lg:p-7 shadow-lift min-h-[190px] flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] lg:text-sm font-medium text-white/70">Umumiy balans</span>
            <button
              type="button"
              onClick={() => setIbOpen(true)}
              className="rounded-full bg-white/10 px-3 py-1 text-[11px] lg:text-[12px] font-semibold text-white/80 hover:bg-white/20 transition-colors"
              title="Boshlang‘ich balansni o‘zgartirish"
            >
              Boshlang‘ich: {loading ? '…' : money(initial ?? 0, { compact: true })}
            </button>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-10 w-56 !bg-white/10" />
          ) : (
            <p data-testid="balance" className="mt-2 text-[34px] lg:text-[44px] font-bold tracking-tight leading-[1.1]"><Amount value={data!.balance} /></p>
          )}
          {data && (
            <p className={cn('mt-1.5 text-[13px] lg:text-sm font-medium', data.monthTotals.net >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
              {money(data.monthTotals.net, { sign: 'always' })} bu oy
            </p>
          )}
          {data && (
            <div className="hidden lg:grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[12px] text-white/60"><ArrowDownLeft size={14} className="text-emerald-300" /> Bu oy daromad</p>
                <p className="tabular mt-1 font-semibold">{money(data.monthTotals.income)}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[12px] text-white/60"><ArrowUpRight size={14} className="text-rose-300" /> Bu oy xarajat</p>
                <p className="tabular mt-1 font-semibold">{money(data.monthTotals.expense)}</p>
              </div>
            </div>
          )}
          <div className="mt-auto pt-5 flex gap-2.5">
            <button className="flex-1 h-11 rounded-full bg-white text-[#111] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-white/90 active:scale-95 transition-all" onClick={() => openNew('income')}>
              <ArrowDownLeft size={17} /> Daromad
            </button>
            <button className="flex-1 h-11 rounded-full bg-white/10 border border-white/15 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-white/15 active:scale-95 transition-all" onClick={() => openNew('expense')}>
              <ArrowUpRight size={17} /> Xarajat
            </button>
          </div>
        </div>

        <StatCard
          label="Jami daromad"
          sub={periodLabel}
          value={data?.totals.income}
          icon={TrendingUp}
          tone="income"
          loading={loading}
        />
        <StatCard
          label="Jami xarajat"
          sub={periodLabel}
          value={data?.totals.expense}
          icon={TrendingDown}
          tone="expense"
          loading={loading}
        />
        <StatCard
          label="Joriy oy natijasi"
          sub={MONTHS[now.getMonth()]}
          value={data?.monthTotals.net}
          signed
          icon={PiggyBank}
          tone={data && data.monthTotals.net < 0 ? 'expense' : 'accent'}
          loading={loading}
          className="col-span-2 sm:col-span-1"
          foot={data && <MonthCompare cur={data.monthTotals.expense} prev={data.prevTotals.expense} />}
        />
        <section className="card min-w-0 col-span-2 sm:col-span-1" aria-labelledby="health-title">
          <h2 id="health-title" className="text-[13px] font-medium text-muted mb-3">Moliyaviy holat · <span className="first-letter:uppercase">{periodLabel}</span></h2>
          {data ? <HealthBlock health={data.health} /> : <Skeleton className="h-20 w-full" />}
        </section>
      </div>

      {showOnboarding && !loading && (
        <Onboarding
          hasInitial={!!initial}
          hasTx={hasTx}
          hasBudget={!!budgets?.length}
          onInitial={() => setIbOpen(true)}
          onAdd={() => openNew('income')}
        />
      )}

      {/* Davr tanlash */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker preset={period.preset} onPreset={period.setPreset} custom={period.custom} onCustom={period.setCustom} />
        <p className="text-[13px] text-muted">{formatRange(period.range, dateFormat)}</p>
      </div>

      {/* Grafiklar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="card lg:col-span-2" aria-labelledby="cf-title">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <h2 id="cf-title" className="section-title">Daromad va xarajat</h2>
              <p className="text-[13px] text-muted mt-0.5">Sof natija: <span className={cn('tabular font-semibold', (data?.totals.net ?? 0) >= 0 ? 'text-income' : 'text-expense')}>{data ? money(data.totals.net, { sign: 'always' }) : '…'}</span></p>
            </div>
            <Legend items={[{ label: 'Daromad', color: colors.income }, { label: 'Xarajat', color: colors.expense }]} />
          </div>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : data!.totals.count === 0 ? (
            <EmptyState art="chart" title="Bu davrda operatsiyalar yo‘q" description="Tranzaksiya qo‘shing yoki boshqa davrni tanlang." className="py-8" />
          ) : (
            <CashflowChart data={data!.series} />
          )}
        </section>

        <section className="card" aria-labelledby="cat-title">
          <div className="flex items-center justify-between mb-4">
            <h2 id="cat-title" className="section-title">Xarajatlar kategoriyasi</h2>
            <Link to="/analytics" className="text-[13px] font-medium text-accent hover:underline">Batafsil</Link>
          </div>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : data!.slices.length === 0 ? (
            <EmptyState compact title="Xarajatlar yo‘q" description="Tanlangan davrda xarajat qayd etilmagan." />
          ) : (
            <CategoryDonut slices={data!.slices} total={data!.totals.expense} title="Xarajat" limit={5} stack />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Oxirgi tranzaksiyalar */}
        <section className="card-flush lg:col-span-2" aria-labelledby="recent-title">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 id="recent-title" className="section-title">Oxirgi operatsiyalar</h2>
            {hasTx && (
              <Link to="/transactions" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                Barchasi <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <div className="px-2 pb-3">
            {loading ? (
              <div className="space-y-3 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !hasTx ? (
              <EmptyState
                art="wallet"
                title="Hali operatsiyalar yo‘q"
                description="Birinchi daromad yoki xarajatingizni qo‘shing — balans va statistika avtomatik hisoblanadi."
                action={
                  <button className="btn btn-primary" onClick={() => openNew('expense')}>
                    <Plus size={18} /> Tranzaksiya qo‘shish
                  </button>
                }
              />
            ) : (
              data!.recent.map((t) => <TransactionItem key={t.id} tx={t} category={catMap.get(t.categoryId)} onClick={() => openEdit(t)} />)
            )}
          </div>
        </section>

        <div className="space-y-4">
          {/* Oylik statistika */}
          <section className="card" aria-labelledby="monthly-title">
            <h2 id="monthly-title" className="section-title mb-3">Oylik statistika</h2>
            {data ? (
              <ul className="space-y-2.5">
                {data.monthly.map((m) => {
                  const max = Math.max(1, ...data.monthly.map((x) => Math.max(x.income, x.expense)));
                  return (
                    <li key={m.key}>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-medium text-ink">{MONTHS[fromISODate(m.key + '-01').getMonth()]}</span>
                        <span className={cn('tabular font-semibold', m.net >= 0 ? 'text-income' : 'text-expense')}>{money(m.net, { sign: 'always', compact: true })}</span>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(m.income / max) * 100}%`, background: colors.income }} /></div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(m.expense / max) * 100}%`, background: colors.expense }} /></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </section>
        </div>
      </div>

      <InitialBalanceModal open={ibOpen} onClose={() => setIbOpen(false)} current={initial ?? 0} />
    </div>
  );
}

function StatCard({
  label, sub, value, icon: Icon, tone, loading, signed, className, foot,
}: {
  label: string;
  sub: string;
  value?: number;
  icon: typeof Wallet;
  tone: 'income' | 'expense' | 'accent';
  loading: boolean;
  signed?: boolean;
  className?: string;
  foot?: React.ReactNode;
}) {
  const toneCls = tone === 'income' ? 'bg-income/10 text-income' : tone === 'expense' ? 'bg-expense/10 text-expense' : 'bg-accent/10 text-accent';
  return (
    <div className={cn('card flex flex-col min-w-0', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted leading-snug">{label}</p>
          <p className="text-[12px] text-subtle truncate first-letter:uppercase">{sub}</p>
        </div>
        <span className={cn('grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl', toneCls)}>
          <Icon size={18} />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-3/4" />
      ) : (
        <p className="mt-3 text-[19px] sm:text-xl lg:text-[22px] font-bold tracking-tight text-ink leading-tight"><Amount value={value ?? 0} sign={signed ? 'always' : 'auto'} /></p>
      )}
      {foot && <div className="mt-1">{foot}</div>}
    </div>
  );
}

function MonthCompare({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <p className="text-[12px] text-subtle">O‘tgan oy bilan taqqoslash uchun ma’lumot yo‘q</p>;
  const diff = ((cur - prev) / prev) * 100;
  const up = diff > 0;
  return (
    <p className="text-[12px] text-muted">
      Xarajat o‘tgan oyga nisbatan{' '}
      <span className={cn('font-semibold', up ? 'text-expense' : 'text-income')}>
        {up ? '+' : '−'}
        {Math.abs(diff).toFixed(0)}%
      </span>
    </p>
  );
}

function HealthBlock({ health }: { health: ReturnType<typeof financialHealth> }) {
  const tone = health.level === 'good' ? 'text-income bg-income/10' : health.level === 'fair' ? 'text-accent bg-accent/10' : health.level === 'poor' ? 'text-expense bg-expense/10' : 'text-muted bg-surface-2';
  const pct = Math.max(0, Math.min(100, health.savingsRate));
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', tone)}>
          <Target size={20} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{health.title}</p>
          {health.level !== 'none' && (
            <p className="text-[13px] text-muted">
              Tejash ulushi: <span className="tabular font-semibold text-ink">{health.savingsRate.toFixed(0)}%</span>
            </p>
          )}
        </div>
      </div>
      {health.level !== 'none' && (
        <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className={cn('h-full rounded-full', health.level === 'good' ? 'bg-income' : health.level === 'fair' ? 'bg-accent' : 'bg-expense')} style={{ width: `${Math.max(3, pct)}%` }} />
        </div>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-muted">{health.message}</p>
    </div>
  );
}

function Onboarding({ hasInitial, hasTx, hasBudget, onInitial, onAdd }: { hasInitial: boolean; hasTx: boolean; hasBudget: boolean; onInitial: () => void; onAdd: () => void }) {
  const installEvent = usePwa((s) => s.installEvent);
  const steps = [
    { done: hasInitial, title: 'Boshlang‘ich balansni kiriting', desc: 'Hozir qo‘lingizdagi va kartangizdagi mablag‘.', action: <button className="btn btn-sm btn-secondary" onClick={onInitial}>Kiritish</button> },
    { done: hasTx, title: 'Birinchi tranzaksiyani qo‘shing', desc: 'Daromad yoki xarajatni yozib boring.', action: <button className="btn btn-sm btn-secondary" onClick={onAdd}>Qo‘shish</button> },
    { done: hasBudget, title: 'Oylik budjet belgilang', desc: 'Kategoriyalar bo‘yicha limit qo‘ying.', action: <Link to="/budgets" className="btn btn-sm btn-secondary">Budjetlar</Link> },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <section className="card relative animate-fade-up" aria-labelledby="ob-title">
      <button className="icon-btn absolute right-3 top-3 h-8 w-8" aria-label="Yo‘riqnomani yopish" onClick={() => void setMeta(META_ONBOARDING, true)}>
        <X size={16} />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Wallet size={20} /></span>
        <div>
          <h2 id="ob-title" className="font-semibold">Personal Finance’ga xush kelibsiz!</h2>
          <p className="text-[13px] text-muted">Boshlash uchun 3 ta oddiy qadam · {doneCount}/3 bajarildi</p>
        </div>
      </div>
      <ol className="mt-4 grid gap-2 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className={cn('flex items-center gap-3 rounded-2xl border border-line/70 p-3', s.done && 'opacity-60')}>
            {s.done ? <CheckCircle2 size={22} className="shrink-0 text-income" /> : <Circle size={22} className="shrink-0 text-subtle" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{s.title}</p>
              <p className="text-[12px] text-muted">{s.desc}</p>
            </div>
            {!s.done && s.action}
          </li>
        ))}
      </ol>
      {installEvent && !isStandalone() && (
        <button className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent" onClick={() => void installEvent.prompt()}>
          <Download size={15} /> Ilovani qurilmaga o‘rnatish
        </button>
      )}
    </section>
  );
}
