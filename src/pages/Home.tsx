import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, Lock, Search } from 'lucide-react';
import { useAccounts, useCategories, useSecurityConfig, useTransactions, useTransfers } from '@/hooks/useData';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDistribution } from '@/services/finance';
import { useFormat } from '@/hooks/useFormat';
import { useLock, useTxForm } from '@/store/ui';
import { accountBalances, balanceSeries, computeTotals, inRange, type BalancePoint } from '@/utils/stats';
import { addDays, endOfMonth, formatDayHeading, MONTHS, startOfMonth, todayISO } from '@/utils/date';
import { useSettings } from '@/store/settings';
import { getIcon } from '@/utils/icons';
import { cn } from '@/utils/misc';
import { Amount } from '@/components/Amount';
import { BalanceChart } from '@/components/BalanceChart';
import { ActionPill } from '@/components/ActionPill';
import { CategoryIcon, Skeleton } from '@/components/ui/primitives';
import { BackupReminder, DueRecurring } from '@/components/HomeBanners';
import { Logo } from '@/components/Logo';

type ChartRange = 'week' | 'month' | '3m' | 'ytd' | 'all';
const RANGES: { value: ChartRange; label: string }[] = [
  { value: 'week', label: 'Hafta' },
  { value: 'month', label: 'Oy' },
  { value: '3m', label: '3 oy' },
  { value: 'ytd', label: 'Yil' },
  { value: 'all', label: 'Hammasi' },
];

/** Asosiy ekran: jami mablag‘ va uning o‘zgarishi, shu oy natijasi, oxirgi operatsiyalar */
export default function Home() {
  const txs = useTransactions();
  const { map: catMap } = useCategories();
  const { list: accounts } = useAccounts();
  const transfers = useTransfers();
  const { money } = useFormat();
  const dateFormat = useSettings((s) => s.dateFormat);
  const openNew = useTxForm((s) => s.openNew);
  const openEdit = useTxForm((s) => s.openEdit);
  const navigate = useNavigate();
  const security = useSecurityConfig();
  const setLocked = useLock((s) => s.setLocked);
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState<ChartRange>('month');
  const [hover, setHover] = useState<BalancePoint | null>(null);
  const [showAccounts, setShowAccounts] = useState(false);
  const distribution = useLiveQuery(() => getDistribution(), []);
  const today = todayISO();

  // Manifest yorliqlari: ./#/?add=expense
  useEffect(() => {
    const add = params.get('add');
    if (add === 'income' || add === 'expense') {
      openNew(add);
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams, openNew]);

  const data = useMemo(() => {
    if (!txs || !accounts || !transfers) return null;
    const balances = accountBalances(accounts, txs, transfers);
    const total = [...balances.values()].reduce((s, x) => s + x, 0);
    const initialTotal = accounts.reduce((s, a) => s + a.initialBalance, 0);
    const earliest = txs.length ? txs[txs.length - 1].date : addDays(today, -29);
    const from =
      range === 'week' ? addDays(today, -6)
      : range === 'month' ? addDays(today, -29)
      : range === '3m' ? addDays(today, -89)
      : range === 'ytd' ? `${today.slice(0, 4)}-01-01`
      : earliest < addDays(today, -6) ? earliest : addDays(today, -6);
    const series = balanceSeries(initialTotal, txs, from, today);
    const first = series[0]?.value ?? total;
    const change = total - first;
    const month = computeTotals(inRange(txs, { from: startOfMonth(today), to: endOfMonth(today) }));
    return {
      balances,
      total,
      series,
      change,
      pct: first !== 0 ? (change / Math.abs(first)) * 100 : null,
      month,
      recent: txs.slice(0, 6),
      hasAny: txs.length > 0,
    };
  }, [txs, accounts, transfers, range, today]);

  const monthName = MONTHS[new Date().getMonth()];

  return (
    <div className="relative pb-[calc(5rem+var(--safe-bottom))]">
      {/* Yumshoq yashil fon (aksent rangida) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-px h-[250px] rounded-b-[2.75rem] opacity-95 dark:opacity-60 sm:-inset-x-6"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, rgb(var(--accent) / 0.95) 0%, rgb(var(--accent) / 0.75) 45%, rgb(var(--accent) / 0.25) 80%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 top-0 h-[230px] opacity-[0.12] sm:-inset-x-6"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 30%, transparent 0 60px, #fff 61px 62px, transparent 63px 110px, #fff 111px 112px, transparent 113px 170px, #fff 171px 172px, transparent 173px)',
        }}
      />

      {/* Yuqori panel */}
      <header className="relative z-10 flex h-16 items-center gap-2 pt-[var(--safe-top)] text-white">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur">
          <Logo size={26} />
        </span>
        <span className="flex-1 truncate text-[16px] font-bold tracking-tight">Personal Finance</span>
        {security?.pinHash && (
          <button type="button" onClick={() => setLocked(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur transition-colors hover:bg-white/30" aria-label="Ilovani qulflash">
            <Lock size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/transactions?search=1')}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur transition-colors hover:bg-white/30"
          aria-label="Qidirish"
        >
          <Search size={19} />
        </button>
      </header>

      <div className="relative z-10 mt-2 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {/* Jami mablag‘ */}
          <section className="card px-4 pb-4 pt-5 text-center" aria-labelledby="nw-title">
            <p id="nw-title" className="text-[13px] font-medium text-muted first-letter:uppercase">
              {hover ? formatDayHeading(hover.date, dateFormat) : 'Jami mablag‘'}
            </p>
            <Link to="/accounts" className="mt-1 block text-[34px] font-bold leading-tight tracking-tight text-ink" data-testid="balance-panel">
              <span data-testid="balance">{data ? <Amount value={hover ? hover.value : data.total} /> : '…'}</span>
            </Link>
            {data && !hover && (
              <p className="mt-1 flex items-center justify-center gap-2 text-[14px] font-semibold">
                <span className={data.change >= 0 ? 'text-income' : 'text-expense'}>{money(data.change, { sign: 'always' })}</span>
                {data.pct !== null && (
                  <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-bold', data.change >= 0 ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense')}>
                    {data.change >= 0 ? '+' : '−'}
                    {Math.abs(data.pct).toFixed(Math.abs(data.pct) < 10 ? 1 : 0).replace('.', ',')}%
                  </span>
                )}
              </p>
            )}
            {data && hover && <p className="mt-1 text-[14px] text-muted">Shu kun oxiridagi qoldiq</p>}

            <div className="mt-3">{data ? <BalanceChart points={data.series} onHover={setHover} /> : <Skeleton className="h-[130px] w-full" />}</div>

            <div role="radiogroup" aria-label="Grafik davri" className="mt-2 flex justify-center gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={range === r.value}
                  onClick={() => setRange(r.value)}
                  className={cn('h-8 rounded-full px-3 text-[13px] font-semibold transition-colors', range === r.value ? 'bg-surface-2 text-ink' : 'text-subtle hover:text-ink')}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAccounts((v) => !v)}
              aria-expanded={showAccounts}
              className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-full bg-surface-2 text-[14px] font-semibold text-muted transition-colors hover:text-ink"
            >
              Hisoblar bo‘yicha <ChevronDown size={16} className={cn('transition-transform', showAccounts && 'rotate-180')} />
            </button>
            {showAccounts && data && accounts && (
              <ul className="mt-2 space-y-1 text-left animate-fade-in">
                {accounts.map((a) => {
                  const Icon = getIcon(a.icon);
                  const bal = data.balances.get(a.id) ?? 0;
                  return (
                    <li key={a.id}>
                      <Link to={`/transactions?account=${a.id}&period=all`} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2/70">
                        <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: a.color }}>
                          <Icon size={17} />
                        </span>
                        <span className="flex-1 text-[15px] font-medium text-ink">{a.name}</span>
                        <span className={cn('text-[15px] font-semibold', bal < 0 ? 'text-expense' : 'text-ink')}>
                          <Amount value={bal} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link to="/accounts" className="flex items-center justify-center gap-1 py-2 text-[13px] font-semibold text-accent">
                    Hisoblarni boshqarish <ChevronRight size={15} />
                  </Link>
                </li>
              </ul>
            )}
            {data && !data.hasAny && data.total === 0 && (
              <Link to="/accounts" className="mt-3 flex items-center justify-center gap-1 text-[13px] font-semibold text-accent">
                Hisoblaringizda qancha pul borligini kiriting <ChevronRight size={15} />
              </Link>
            )}
          </section>

          <div className="space-y-2 empty:hidden">
            <DueRecurring />
            {txs && <BackupReminder txs={txs} />}
          </div>

          {/* Shu oy */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/analytics?tab=income" className="card !p-4 transition-transform active:scale-[0.98]">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-income/15 text-income"><ArrowDownLeft size={14} /></span>
                Daromad · {monthName}
              </span>
              <span className="mt-2 block text-[18px] font-bold text-ink">{data ? <Amount value={data.month.income} /> : '…'}</span>
            </Link>
            <Link to="/analytics" className="card !p-4 transition-transform active:scale-[0.98]">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-expense/15 text-expense"><ArrowUpRight size={14} /></span>
                Xarajat · {monthName}
              </span>
              <span className="mt-2 block text-[18px] font-bold text-ink" data-testid="month-expense">{data ? <Amount value={data.month.expense} /> : '…'}</span>
            </Link>
          </div>

          {/* Daromad taqsimoti */}
          <Link to="/distribution" className="card block !p-4 transition-transform active:scale-[0.99]" data-testid="dist-card">
            <span className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted">Daromadni taqsimlash</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', distribution?.enabled ? 'bg-income/15 text-income' : 'bg-surface-2 text-subtle')}>
                {distribution?.enabled ? 'Yoqilgan' : 'O‘chiq'}
              </span>
            </span>
            {distribution && distribution.rules.length > 0 ? (
              <>
                <span className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                  {distribution.rules.map((r) => (
                    <span key={r.id} className="h-full" style={{ width: `${r.percent}%`, background: accounts?.find((a) => a.id === r.accountId)?.color ?? '#94a3b8' }} />
                  ))}
                </span>
                <span className="mt-2 block truncate text-[13px] text-ink">
                  {distribution.rules.map((r) => `${r.name} ${r.percent}%`).join(' · ')}
                </span>
              </>
            ) : (
              <span className="mt-1 block text-[14px] text-ink">
                Daromad tushishi bilan avtomatik bo‘ling: uyga, investitsiyaga, ehsonga… <span className="font-semibold text-accent">Sozlash →</span>
              </span>
            )}
          </Link>
        </div>

        {/* Oxirgi operatsiyalar */}
        <section className="card !px-3 !pb-3" aria-labelledby="recent-title">
          <div className="flex items-center justify-between px-2 pb-1">
            <h2 id="recent-title" className="text-[13px] font-medium text-muted">Oxirgi operatsiyalar</h2>
            {data?.hasAny && (
              <Link to="/transactions" className="text-[13px] font-semibold text-accent">
                Barchasi
              </Link>
            )}
          </div>
          {!data ? (
            <div className="space-y-3 p-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data.hasAny ? (
            <div className="px-3 py-8 text-center">
              <p className="font-semibold text-ink">Hali yozuvlar yo‘q</p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted">
                Pastdagi <b className="text-expense">−</b> tugmasi bilan xarajat, <b className="text-accent">+</b> bilan daromad qo‘shing. <b>⇄</b> — hisoblar orasida o‘tkazma.
              </p>
            </div>
          ) : (
            <ul>
              {data.recent.map((t) => {
                const cat = catMap.get(t.categoryId);
                const income = t.type === 'income';
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => openEdit(t)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2/70">
                      <CategoryIcon icon={cat?.icon ?? 'more'} color={cat?.color ?? '#94a3b8'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{t.note || cat?.name || 'Yozuv'}</span>
                        <span className="block truncate text-[12px] text-muted first-letter:uppercase">
                          {formatDayHeading(t.date, dateFormat)}
                          {t.note && cat ? ` · ${cat.name}` : ''}
                        </span>
                      </span>
                      <span className={cn('tabular shrink-0 text-[15px] font-bold', income ? 'text-income' : 'text-ink')}>
                        {money(income ? t.amount : -t.amount, { sign: 'always' })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ActionPill />
    </div>
  );
}
