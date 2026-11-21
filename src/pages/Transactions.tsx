import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Search, Trash2, X } from 'lucide-react';
import { useAccounts, useCategories, useTransactions } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useTxForm, confirmDialog, toast } from '@/store/ui';
import { useSettings } from '@/store/settings';
import { periodRange, usePeriodStore } from '@/store/period';
import { deleteTransaction, restoreTransaction } from '@/services/finance';
import { transactionsToCsv, backupFilename } from '@/services/backup';
import { computeTotals } from '@/utils/stats';
import { cn, downloadBlob, normalizeSearch } from '@/utils/misc';
import { formatMoney } from '@/utils/money';
import type { DateRange, PeriodPreset, Transaction, TxType } from '@/types';
import { CategoryIcon, PageHeader, Skeleton } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionItem } from '@/components/TransactionItem';
import { PeriodBar } from '@/components/PeriodBar';

const PAGE = 50;

/** Tranzaksiyalar ro‘yxati: ko‘rish, tahrirlash, o‘chirish, sana/kategoriya/tur bo‘yicha filtr, qidiruv */
export default function Transactions() {
  const txs = useTransactions();
  const { list: categories, map: catMap } = useCategories();
  const { map: accMap } = useAccounts();
  const { money, day } = useFormat();
  const currency = useSettings((s) => s.currency);
  const numberFormat = useSettings((s) => s.numberFormat);
  const openEdit = useTxForm((s) => s.openEdit);
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  // Davr bosh ekrandagidan boshlanadi; kategoriya orqali kelinganda ham shu davr
  const home = usePeriodStore();
  const [preset, setPreset] = useState<PeriodPreset>(params.get('search') || params.get('period') === 'all' ? 'all' : home.preset);
  const [offset, setOffset] = useState(home.offset);
  const [custom, setCustom] = useState<DateRange>(home.custom);
  const range = useMemo(() => periodRange(preset, offset, custom), [preset, offset, custom]);

  const categoryId = params.get('category') ?? 'all';
  const accountId = params.get('account') ?? 'all';
  const [type, setType] = useState<'all' | TxType>('all');
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    if (params.get('search')) searchRef.current?.focus();
  }, [params]);
  useEffect(() => setLimit(PAGE), [range.from, range.to, categoryId, accountId, type, dq]);

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === 'all') next.delete('category');
    else next.set('category', id);
    next.delete('search');
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    if (!txs) return undefined;
    const nq = normalizeSearch(dq);
    const digits = nq.replace(/[^\d]/g, '');
    return txs.filter((t) => {
      if (t.date < range.from || t.date > range.to) return false;
      if (categoryId !== 'all' && t.categoryId !== categoryId) return false;
      if (accountId !== 'all' && t.accountId !== accountId) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (nq) {
        const hay = normalizeSearch(`${t.note} ${catMap.get(t.categoryId)?.name ?? ''}`);
        const amountMatch = digits.length >= 2 && String(Math.floor(t.amount / 100)).includes(digits);
        if (!hay.includes(nq) && !amountMatch) return false;
      }
      return true;
    });
  }, [txs, range.from, range.to, categoryId, accountId, type, dq, catMap]);

  const totals = useMemo(() => computeTotals(filtered ?? []), [filtered]);
  const visible = filtered?.slice(0, limit) ?? [];
  const groups = useMemo(() => {
    const g: { date: string; items: Transaction[]; net: number }[] = [];
    for (const t of visible) {
      let last = g[g.length - 1];
      if (!last || last.date !== t.date) {
        last = { date: t.date, items: [], net: 0 };
        g.push(last);
      }
      last.items.push(t);
      last.net += t.type === 'income' ? t.amount : -t.amount;
    }
    return g;
  }, [visible]);

  async function remove(t: Transaction) {
    const ok = await confirmDialog({
      title: 'Tranzaksiyani o‘chirish',
      message: `${formatMoney(t.amount, { currency, numberFormat })} — ${catMap.get(t.categoryId)?.name ?? ''}. O‘chirilsinmi?`,
      confirmLabel: 'O‘chirish',
      danger: true,
    });
    if (!ok) return;
    const removed = await deleteTransaction(t.id);
    toast.success('Tranzaksiya o‘chirildi', undefined, removed ? { label: 'Qaytarish', onClick: () => void restoreTransaction(removed) } : undefined);
  }

  function exportCsv() {
    if (!filtered?.length) return toast.info('Eksport uchun yozuvlar yo‘q');
    const csv = transactionsToCsv(filtered, catMap, currency, accMap);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), backupFilename('csv', 'tranzaksiyalar'));
    toast.success('CSV fayl yuklab olindi', `${filtered.length} ta tranzaksiya`);
  }

  const cat = categoryId !== 'all' ? catMap.get(categoryId) : undefined;
  const acc = accountId !== 'all' ? accMap.get(accountId) : undefined;
  const catOptions = (categories ?? []).filter((c) => type === 'all' || c.type === type);

  return (
    <div className="pb-10">
      <PageHeader
        title={cat ? cat.name : acc ? acc.name : 'Tranzaksiyalar'}
        info="transactions"
        subtitle={filtered ? `${filtered.length} ta yozuv` : undefined}
        actions={
          <button className="icon-btn" onClick={exportCsv} aria-label="CSV ga eksport" title="CSV ga eksport">
            <Download size={20} />
          </button>
        }
      />

      <div className="mx-auto max-w-2xl space-y-3">
        <PeriodBar
          preset={preset}
          range={range}
          custom={custom}
          onPreset={(p) => {
            setPreset(p);
            setOffset(0);
          }}
          onShift={(n) => setOffset((o) => o + n)}
          onCustom={setCustom}
          allowAll
        />

        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            ref={searchRef}
            type="search"
            className="input pl-10"
            placeholder="Izoh, kategoriya yoki summa"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Qidirish"
            maxLength={60}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Turi" className="flex w-full gap-1 rounded-xl bg-surface-2 p-1 sm:w-auto">
            {([
              ['all', 'Barchasi'],
              ['expense', 'Xarajat'],
              ['income', 'Daromad'],
            ] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={type === v}
                onClick={() => setType(v)}
                className={cn(
                  'h-8 flex-1 rounded-lg px-3 text-[13px] font-semibold sm:flex-none',
                  type === v ? cn('bg-surface shadow-card', v === 'income' ? 'text-income' : v === 'expense' ? 'text-expense' : 'text-ink') : 'text-muted',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {cat ? (
            <button type="button" onClick={() => setCategory('all')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-2 pl-1.5 pr-3 text-[13px] font-semibold" aria-label={`${cat.name} filtrini olib tashlash`}>
              <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
              {cat.name}
              <X size={14} className="text-muted" />
            </button>
          ) : (
            <select aria-label="Kategoriya" className="input h-10 w-full min-w-0 text-sm sm:w-auto sm:flex-1" value={categoryId} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Barcha kategoriyalar</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {acc && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete('account');
                setParams(next, { replace: true });
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold text-white"
              style={{ background: acc.color }}
              aria-label={`${acc.name} filtrini olib tashlash`}
            >
              {acc.name}
              <X size={14} />
            </button>
          )}
        </div>

        {filtered && filtered.length > 0 && (
          <div className="flex justify-between rounded-xl bg-surface-2/70 px-4 py-2.5 text-[13px]">
            <span className="text-muted">
              Daromad <b className="tabular text-income">{money(totals.income)}</b>
            </span>
            <span className="text-muted">
              Xarajat <b className="tabular text-expense">{money(totals.expense)}</b>
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-line/70 bg-surface">
          {filtered === undefined ? (
            <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              art={txs?.length ? 'search' : 'list'}
              title={txs?.length ? 'Hech narsa topilmadi' : 'Hali yozuvlar yo‘q'}
              description={txs?.length ? 'Davr, kategoriya yoki qidiruv so‘zini o‘zgartirib ko‘ring.' : 'Bosh ekrandagi − va + tugmalari bilan xarajat va daromad qo‘shing.'}
              compact={!!txs?.length}
            />
          ) : (
            <div className="divide-y divide-line/60">
              {groups.map((g) => (
                <div key={g.date} className="px-1.5 py-1.5">
                  <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5">
                    <h3 className="text-[12px] font-semibold uppercase tracking-wide text-subtle">{day(g.date)}</h3>
                    <span className={cn('tabular text-[12px] font-semibold', g.net >= 0 ? 'text-income' : 'text-muted')}>{money(g.net, { sign: 'always' })}</span>
                  </div>
                  {g.items.map((t) => (
                    <div key={t.id} className="group flex items-center">
                      <div className="min-w-0 flex-1">
                        <TransactionItem tx={t} category={catMap.get(t.categoryId)} account={accMap.get(t.accountId)} onClick={() => openEdit(t)} />
                      </div>
                      <button
                        type="button"
                        onClick={() => void remove(t)}
                        className="icon-btn ml-0.5 mr-1 hidden h-9 w-9 opacity-0 hover:bg-expense/10 hover:text-expense focus-visible:opacity-100 group-hover:opacity-100 lg:inline-flex"
                        aria-label="O‘chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {filtered && filtered.length > limit && (
            <div className="border-t border-line/60 p-3 text-center">
              <button className="btn btn-secondary btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
                Yana ko‘rsatish ({filtered.length - limit})
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-[12px] text-subtle">Tahrirlash yoki o‘chirish uchun yozuvga bosing</p>
      </div>
    </div>
  );
}
