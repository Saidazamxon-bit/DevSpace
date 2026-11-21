import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, List, Minus, Plus, Search, Settings2, X } from 'lucide-react';
import { useAccounts, useCategories, useTransactions, useTransfers } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useTxForm } from '@/store/ui';
import { periodRange, usePeriodStore } from '@/store/period';
import { accountBalances, byCategory, computeTotals, inRange } from '@/utils/stats';
import type { TxType } from '@/types';
import { DonutRing } from '@/components/DonutRing';
import { PeriodBar } from '@/components/PeriodBar';
import { Amount } from '@/components/Amount';
import { CategoryIcon, Segmented, Skeleton } from '@/components/ui/primitives';
import { BackupReminder, DueRecurring } from '@/components/HomeBanners';
import { MenuButton } from '@/layouts/Menu';
import { Logo } from '@/components/Logo';
import { cn } from '@/utils/misc';

export default function Home() {
  const txs = useTransactions();
  const { list: categories, map: catMap } = useCategories();
  const { list: accounts } = useAccounts();
  const transfers = useTransfers();
  const { money } = useFormat();
  const openNew = useTxForm((s) => s.openNew);
  const navigate = useNavigate();
  const { preset, offset, custom, setPreset, shift, setCustom } = usePeriodStore();
  const range = useMemo(() => periodRange(preset, offset, custom), [preset, offset, custom]);
  const [selected, setSelected] = useState<string | null>(null);
  const [listType, setListType] = useState<TxType>('expense');
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

  const data = useMemo(() => {
    if (!txs || !accounts || !transfers) return null;
    const list = inRange(txs, range);
    const expenseSlices = byCategory(list, 'expense', catMap);
    const balances = accountBalances(accounts, txs, transfers);
    return {
      totals: computeTotals(list),
      balances,
      balance: [...balances.values()].reduce((s, x) => s + x, 0),
      expenseSlices,
      incomeSlices: byCategory(list, 'income', catMap),
      spentBy: new Map(expenseSlices.map((s) => [s.categoryId, s.total])),
      hasAny: txs.length > 0,
    };
  }, [txs, range, catMap, accounts, transfers]);

  // Davr o‘zgarsa yoki kategoriya endi bo‘lmasa — tanlovni bekor qilish
  useEffect(() => setSelected(null), [range.from, range.to]);

  const ringIcons = useMemo(() => (categories ?? []).filter((c) => c.type === 'expense').slice(0, 12), [categories]);
  const sel = selected ? data?.expenseSlices.find((s) => s.categoryId === selected) : undefined;
  const rows = listType === 'expense' ? data?.expenseSlices : data?.incomeSlices;

  const center = !data ? (
    <Skeleton className="h-16 w-28" />
  ) : sel ? (
    <div className="flex flex-col items-center gap-1 px-2 animate-fade-in">
      <CategoryIcon icon={sel.icon} color={sel.color} size="sm" />
      <p className="max-w-full truncate text-[13px] font-semibold text-ink">{sel.name}</p>
      <p className="text-lg font-bold leading-tight text-ink">
        <Amount value={sel.total} />
      </p>
      <p className="text-[12px] text-muted tabular">
        {sel.percent.toFixed(1).replace('.', ',')}% · {sel.count} ta
      </p>
      <div className="mt-1 flex gap-1.5">
        <Link to={`/transactions?category=${sel.categoryId}`} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label="Tranzaksiyalar ro‘yxati">
          <List size={16} />
        </Link>
        <button type="button" onClick={() => openNew('expense', sel.categoryId)} className="grid h-8 w-8 place-items-center rounded-full bg-expense text-white dark:text-[#2b0909]" aria-label={`${sel.name} — xarajat qo‘shish`}>
          <Plus size={16} />
        </button>
        <button type="button" onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label="Tanlovni bekor qilish">
          <X size={16} />
        </button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center px-1" data-testid="center-totals">
      <p className="font-medium uppercase tracking-wide text-subtle" style={{ fontSize: 'clamp(9px, 2.9cqw, 11px)' }}>Daromad</p>
      <p className="whitespace-nowrap font-semibold text-income leading-tight" style={{ fontSize: 'clamp(12px, 4.2cqw, 16px)' }}>
        <Amount value={data.totals.income} sign="always" />
      </p>
      <p className="mt-1 font-medium uppercase tracking-wide text-subtle" style={{ fontSize: 'clamp(9px, 2.9cqw, 11px)' }}>Xarajat</p>
      <p className="whitespace-nowrap font-bold text-expense leading-tight" style={{ fontSize: 'clamp(16px, 5.8cqw, 24px)' }} data-testid="period-expense">
        <Amount value={-data.totals.expense} sign="always" />
      </p>
      <p className="mt-1 whitespace-nowrap text-muted" style={{ fontSize: 'clamp(10px, 3.3cqw, 13px)' }}>
        Qoldiq: <span className={cn('font-semibold tabular', data.totals.net >= 0 ? 'text-ink' : 'text-expense')}>{money(data.totals.net, { sign: 'always', compact: true })}</span>
      </p>
    </div>
  );

  return (
    <div className="pb-[calc(7.5rem+var(--safe-bottom))]">
      {/* Yuqori panel */}
      <header className="sticky top-0 z-30 -mx-4 mb-2 flex h-14 items-center gap-1 bg-bg/85 px-3 pt-[var(--safe-top)] backdrop-blur-xl sm:-mx-6 sm:px-5">
        <MenuButton />
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
          <Logo size={26} />
          <span className="truncate text-[16px] font-bold tracking-tight">Personal Finance</span>
        </div>
        <button type="button" className="icon-btn" onClick={() => navigate('/transactions?search=1')} aria-label="Qidirish">
          <Search size={20} />
        </button>
        <Link to="/settings" className="icon-btn" aria-label="Sozlamalar">
          <Settings2 size={20} />
        </Link>
      </header>

      {/* Eng tepada — jami mablag‘. Bosilsa: Karta, Naqd, Jamg‘arma … */}
      <Link
        to="/accounts"
        className="mx-auto mb-3 block max-w-md rounded-3xl bg-accent px-5 py-3 text-accent-ink shadow-card transition-transform active:scale-[0.99] lg:max-w-xl"
        data-testid="balance-panel"
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium opacity-80">Jami mablag‘</span>
          <ChevronRight size={18} className="opacity-70" />
        </div>
        <p className="text-[26px] font-bold leading-tight" data-testid="balance">
          {data ? <Amount value={data.balance} /> : '…'}
        </p>
        {data && accounts && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {accounts.slice(0, 3).map((a) => (
              <span key={a.id} className="min-w-0 rounded-xl bg-black/10 px-2.5 py-1.5 dark:bg-black/20">
                <span className="flex items-center gap-1 text-[11px] font-medium opacity-80">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.color }} />
                  <span className="truncate">{a.name}</span>
                </span>
                <span className="block truncate text-[13px] font-bold">{money(data.balances.get(a.id) ?? 0, { compact: true, plain: true })}</span>
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="mx-auto mb-3 max-w-xl space-y-2 empty:hidden">
        <DueRecurring />
        {txs && <BackupReminder txs={txs} />}
      </div>

      <PeriodBar preset={preset} range={range} custom={custom} onPreset={setPreset} onShift={shift} onCustom={setCustom} />

      <div className="mt-2 grid items-start gap-6 lg:mt-6 lg:grid-cols-2 lg:gap-10">
        <section aria-label="Umumiy ko‘rinish">
          <div onClick={() => setSelected(null)}>
            <DonutRing
              slices={data?.expenseSlices ?? []}
              icons={ringIcons}
              totals={data?.spentBy ?? new Map()}
              selected={selected}
              onSelect={setSelected}
              onIconClick={(c) => openNew('expense', c.id)}
              center={center}
            />
          </div>
          <p className="mt-1 hidden text-center text-[12px] text-subtle [@media(min-height:740px)]:block">Ikonkaga bosing — shu kategoriyaga tez xarajat qo‘shiladi</p>

        </section>

        {/* Kategoriyalar ro‘yxati */}
        <section aria-labelledby="cats-title">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="cats-title" className="sr-only">Kategoriyalar bo‘yicha</h2>
            <Segmented
              size="sm"
              value={listType}
              onChange={setListType}
              label="Ro‘yxat turi"
              options={[
                { value: 'expense', label: 'Xarajatlar', tone: 'expense' },
                { value: 'income', label: 'Daromadlar', tone: 'income' },
              ]}
            />
            <Link to="/transactions" className="text-[13px] font-semibold text-accent">
              Barchasi
            </Link>
          </div>

          {!rows ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
              <p className="font-semibold text-ink">{data?.hasAny ? 'Bu davrda yozuvlar yo‘q' : 'Hali yozuvlar yo‘q'}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Pastdagi <b className="text-expense">−</b> tugmasi bilan xarajat, <b className="text-income">+</b> tugmasi bilan daromad qo‘shing.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/70 bg-surface">
              {rows.map((r) => (
                <li key={r.categoryId}>
                  <Link to={`/transactions?category=${r.categoryId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 active:bg-surface-2">
                    <CategoryIcon icon={r.icon} color={r.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink">{r.name}</p>
                      <p className="text-[12px] text-muted">
                        {r.count} ta · {r.percent.toFixed(0)}%
                      </p>
                    </div>
                    <span className={cn('text-[15px] font-semibold', listType === 'income' ? 'text-income' : 'text-ink')}>
                      <Amount value={r.total} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Pastki tugmalar: − xarajat, + daromad */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg/80 to-transparent pb-[calc(1rem+var(--safe-bottom))] pt-8">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-center gap-12">
          <button
            type="button"
            onClick={() => openNew('expense')}
            aria-label="Xarajat qo‘shish"
            className="grid h-16 w-16 place-items-center rounded-full bg-expense text-white dark:text-[#2b0909] shadow-lift transition-transform hover:brightness-110 active:scale-90"
          >
            <Minus size={30} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={() => openNew('income')}
            aria-label="Daromad qo‘shish"
            className="grid h-16 w-16 place-items-center rounded-full bg-income text-white dark:text-[#04261a] shadow-lift transition-transform hover:brightness-110 active:scale-90"
          >
            <Plus size={30} strokeWidth={2.6} />
          </button>
        </div>
      </div>

    </div>
  );
}
