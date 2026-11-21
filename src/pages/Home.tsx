import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Lock, Plus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useAccounts, useCategories, useSecurityConfig, useTransactions, useTransfers } from '@/hooks/useData';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDistribution } from '@/services/finance';
import { useFormat } from '@/hooks/useFormat';
import { useLock, useTxForm } from '@/store/ui';
import { accountBalances, balanceSeries, computeTotals, inRange, type BalancePoint } from '@/utils/stats';
import { addDays, endOfMonth, formatDayHeading, formatTime, MONTHS, startOfMonth, todayISO } from '@/utils/date';
import { useSettings } from '@/store/settings';
import { getIcon } from '@/utils/icons';
import { cn } from '@/utils/misc';
import { Amount } from '@/components/Amount';
import { BalanceChart } from '@/components/BalanceChart';
import { ActionPill, HeroActions } from '@/components/ActionPill';
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

const RANGE_HINT: Record<ChartRange, string> = { week: '7 kun', month: '30 kun', '3m': '3 oy', ytd: 'shu yil', all: 'jami' };

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Xayrli tong';
  if (h >= 11 && h < 17) return 'Xayrli kun';
  if (h >= 17 && h < 22) return 'Xayrli kech';
  return 'Xayrli tun';
}

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
    <div className="relative pb-[calc(5rem+var(--safe-bottom))] lg:pb-0">
      {/* Ekran yuqoriga tortilganda (iOS) bo‘sh joy ko‘rinmasin — hero rangi davom etadi */}
      <div aria-hidden className="hero-bg pointer-events-none absolute -inset-x-4 bottom-full h-[100vh] sm:-inset-x-6 lg:hidden" />

      {/* ── Hero: jami mablag‘ ── */}
      <section className="hero-bg relative -mx-4 overflow-hidden rounded-b-[2.25rem] px-5 pb-20 text-white sm:-mx-6 sm:px-7 lg:mx-0 lg:mt-6 lg:rounded-[2.25rem] lg:px-8 lg:pb-24" aria-labelledby="nw-title">
        <div aria-hidden className="hero-rings pointer-events-none absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />

        <header className="relative flex items-center gap-3 pt-[calc(var(--safe-top)+0.75rem)] lg:pt-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/20 backdrop-blur">
            <Logo size={28} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[12.5px] font-medium text-white/70">{greeting()}</span>
            <span className="block truncate text-[17px] font-bold tracking-tight">Personal Finance</span>
          </span>
          {security?.pinHash && (
            <button type="button" onClick={() => setLocked(true)} className="hero-btn" aria-label="Ilovani qulflash">
              <Lock size={18} />
            </button>
          )}
          <button type="button" onClick={() => navigate('/transactions?search=1')} className="hero-btn" aria-label="Qidirish">
            <Search size={19} />
          </button>
        </header>

        <div className="relative mt-7 text-center">
          <p id="nw-title" className="text-[13.5px] font-medium text-white/75 first-letter:uppercase">
            {hover ? formatDayHeading(hover.date, dateFormat) : 'Jami mablag‘'}
          </p>
          <Link to="/accounts" className="mt-1 block text-[42px] font-extrabold leading-[1.1] tracking-tight" data-testid="balance-panel">
            <span data-testid="balance">{data ? <Amount value={hover ? hover.value : data.total} symbolClassName="opacity-80" /> : '…'}</span>
          </Link>
          {data && !hover && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1 pl-1 pr-3 text-[13px] font-semibold ring-1 ring-inset ring-white/15 backdrop-blur">
              <span className={cn('grid h-6 w-6 place-items-center rounded-full', data.change >= 0 ? 'bg-white text-[#0b7a4f]' : 'bg-white text-[#c2393f]')}>
                {data.change >= 0 ? <TrendingUp size={14} strokeWidth={2.5} /> : <TrendingDown size={14} strokeWidth={2.5} />}
              </span>
              {money(data.change, { sign: 'always' })}
              {data.pct !== null && (
                <span className="text-white/75">
                  · {data.change >= 0 ? '+' : '−'}
                  {Math.abs(data.pct).toFixed(Math.abs(data.pct) < 10 ? 1 : 0).replace('.', ',')}%
                </span>
              )}
              <span className="text-white/60">· {RANGE_HINT[range]}</span>
            </p>
          )}
          {data && hover && <p className="mt-2.5 text-[13px] text-white/70">Shu kun oxiridagi qoldiq</p>}
          <HeroActions />
        </div>

        {/* Hisoblar: Karta · Naqd · Jamg‘arma … */}
        {data && accounts && (
          <ul className="no-scrollbar relative -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 sm:-mx-7 sm:px-7 lg:-mx-8 lg:mt-8 lg:justify-center lg:px-8" aria-label="Hisoblar">
            {accounts.map((a) => {
              const Icon = getIcon(a.icon);
              const bal = data.balances.get(a.id) ?? 0;
              return (
                <li key={a.id} className="shrink-0">
                  <Link
                    to={`/transactions?account=${a.id}&period=all`}
                    className="flex items-center gap-2.5 rounded-2xl bg-white/[0.12] py-2 pl-2 pr-3.5 ring-1 ring-inset ring-white/15 backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.98]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl text-white shadow-sm" style={{ background: a.color }}>
                      <Icon size={16} />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[11.5px] font-medium text-white/70">{a.name}</span>
                      <span className="block whitespace-nowrap text-[14px] font-bold"><Amount value={bal} /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0">
              <Link to="/accounts" className="grid h-full min-h-[48px] w-12 place-items-center rounded-2xl border border-dashed border-white/35 text-white/85 hover:bg-white/10" aria-label="Hisoblarni boshqarish">
                <Plus size={18} />
              </Link>
            </li>
          </ul>
        )}
      </section>

      <div className="relative z-10 -mt-12 grid lg:-mt-14 lg:px-4 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {/* Mablag‘ dinamikasi */}
          <section className="card px-3 pb-3 pt-4" aria-label="Mablag‘ dinamikasi">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[13px] font-medium text-muted">Mablag‘ dinamikasi</h2>
              <Link to="/analytics" className="flex items-center text-[13px] font-semibold text-accent">
                Tahlil <ChevronRight size={15} />
              </Link>
            </div>
            <div className="mt-2">{data ? <BalanceChart points={data.series} onHover={setHover} /> : <Skeleton className="h-[130px] w-full" />}</div>
            <div role="radiogroup" aria-label="Grafik davri" className="mt-3 flex rounded-full bg-surface-2 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={range === r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    'h-8 flex-1 rounded-full text-[13px] font-semibold transition-all',
                    range === r.value ? 'bg-surface text-ink shadow-sm dark:bg-white/10' : 'text-subtle hover:text-ink',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
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
                <span className="lg:hidden">Pastdagi</span>
                <span className="hidden lg:inline">Yuqoridagi</span> <b className="text-expense">−</b> tugmasi bilan xarajat, <b className="text-accent">+</b> bilan daromad qo‘shing. <b>⇄</b> — hisoblar orasida o‘tkazma.
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
                          {formatDayHeading(t.date, dateFormat)} · {formatTime(t.createdAt)}
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
