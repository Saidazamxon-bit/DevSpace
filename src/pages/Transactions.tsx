import { useDeferredValue, useMemo, useState } from 'react';
import { Download, Filter, Plus, Search, Trash2, X } from 'lucide-react';
import { useCategories, useTransactions } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useTxForm, confirmDialog, toast } from '@/store/ui';
import { useSettings } from '@/store/settings';
import { deleteTransaction, restoreTransaction, PAYMENT_LABEL, PAYMENT_METHODS } from '@/services/finance';
import { transactionsToCsv, backupFilename } from '@/services/backup';
import { computeTotals } from '@/utils/stats';
import { cn, downloadBlob, normalizeSearch } from '@/utils/misc';
import { formatMoney } from '@/utils/money';
import type { PaymentMethod, Transaction, TxType } from '@/types';
import { PageHeader, Segmented, Skeleton } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionItem } from '@/components/TransactionItem';

type Sort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
const PAGE = 40;

interface Filters {
  q: string;
  type: 'all' | TxType;
  category: string;
  payment: 'all' | PaymentMethod;
  from: string;
  to: string;
  sort: Sort;
}
const EMPTY: Filters = { q: '', type: 'all', category: 'all', payment: 'all', from: '', to: '', sort: 'date-desc' };

export default function Transactions() {
  const txs = useTransactions();
  const { list: categories, map: catMap } = useCategories();
  const { money, day } = useFormat();
  const currency = useSettings((s) => s.currency);
  const numberFormat = useSettings((s) => s.numberFormat);
  const openNew = useTxForm((s) => s.openNew);
  const openEdit = useTxForm((s) => s.openEdit);

  const [f, setF] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(f.q);
  const set = (p: Partial<Filters>) => {
    setF((x) => ({ ...x, ...p }));
    setLimit(PAGE);
  };

  const filtered = useMemo(() => {
    if (!txs) return undefined;
    const nq = normalizeSearch(q);
    const digits = nq.replace(/[^\d]/g, '');
    let out = txs.filter((t) => {
      if (f.type !== 'all' && t.type !== f.type) return false;
      if (f.category !== 'all' && t.categoryId !== f.category) return false;
      if (f.payment !== 'all' && t.paymentMethod !== f.payment) return false;
      if (f.from && t.date < f.from) return false;
      if (f.to && t.date > f.to) return false;
      if (nq) {
        const cat = catMap.get(t.categoryId)?.name ?? '';
        const hay = normalizeSearch(`${t.note} ${cat} ${PAYMENT_LABEL[t.paymentMethod]}`);
        const amountMatch = digits.length >= 2 && String(Math.floor(t.amount / 100)).includes(digits);
        if (!hay.includes(nq) && !amountMatch) return false;
      }
      return true;
    });
    if (f.sort !== 'date-desc') {
      out = [...out].sort((a, b) => {
        switch (f.sort) {
          case 'date-asc':
            return a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1;
          case 'amount-desc':
            return b.amount - a.amount;
          case 'amount-asc':
            return a.amount - b.amount;
          default:
            return 0;
        }
      });
    }
    return out;
  }, [txs, f.type, f.category, f.payment, f.from, f.to, f.sort, q, catMap]);

  const totals = useMemo(() => computeTotals(filtered ?? []), [filtered]);
  const visible = filtered?.slice(0, limit) ?? [];
  const groupByDate = f.sort === 'date-desc' || f.sort === 'date-asc';

  const groups = useMemo(() => {
    if (!groupByDate) return null;
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
  }, [visible, groupByDate]);

  const activeFilters = [f.type !== 'all', f.category !== 'all', f.payment !== 'all', !!f.from, !!f.to].filter(Boolean).length;

  async function remove(t: Transaction) {
    const ok = await confirmDialog({
      title: 'Tranzaksiyani o‘chirish',
      message: `${formatMoney(t.amount, { currency, numberFormat })} — ${catMap.get(t.categoryId)?.name ?? ''}. Bu amalni bekor qilish mumkin emas.`,
      confirmLabel: 'O‘chirish',
      danger: true,
    });
    if (!ok) return;
    const removed = await deleteTransaction(t.id);
    toast.success('Tranzaksiya o‘chirildi', undefined, removed ? { label: 'Qaytarish', onClick: () => void restoreTransaction(removed) } : undefined);
  }

  function exportCsv() {
    if (!filtered?.length) return;
    const csv = transactionsToCsv(filtered, catMap, currency);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), backupFilename('csv', 'tranzaksiyalar'));
    toast.success('CSV fayl yuklab olindi', `${filtered.length} ta tranzaksiya`);
  }

  const catOptions = (categories ?? []).filter((c) => f.type === 'all' || c.type === f.type);

  return (
    <div>
      <PageHeader
        title="Tranzaksiyalar"
        subtitle={txs ? `Jami ${txs.length} ta yozuv` : 'Yuklanmoqda…'}
        actions={
          <>
            <button className="btn btn-outline btn-sm h-10" onClick={exportCsv} disabled={!filtered?.length} title="Filtrlangan ro‘yxatni CSV ga eksport qilish">
              <Download size={16} /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button className="btn btn-primary btn-sm h-10 hidden sm:inline-flex" onClick={() => openNew('expense')}>
              <Plus size={16} /> Qo‘shish
            </button>
          </>
        }
      />

      {/* Qidiruv va filtrlar */}
      <div className="card mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              className="input pl-10"
              placeholder="Izoh, kategoriya yoki summa bo‘yicha qidirish"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              aria-label="Qidirish"
              maxLength={60}
            />
          </div>
          <button
            type="button"
            className={cn('btn btn-outline relative px-3 lg:hidden', showFilters && 'border-accent text-accent')}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label="Filtrlar"
          >
            <Filter size={18} />
            {activeFilters > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">{activeFilters}</span>}
          </button>
        </div>

        <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] lg:items-end', !showFilters && 'hidden lg:grid')}>
          <div>
            <span className="label">Turi</span>
            <Segmented
              size="sm"
              className="w-full lg:w-auto h-11 items-center"
              value={f.type}
              onChange={(v) => set({ type: v, category: 'all' })}
              options={[
                { value: 'all', label: 'Barchasi' },
                { value: 'income', label: 'Daromad', tone: 'income' },
                { value: 'expense', label: 'Xarajat', tone: 'expense' },
              ]}
              label="Turi"
            />
          </div>
          <div>
            <label className="label" htmlFor="f-cat">Kategoriya</label>
            <select id="f-cat" className="input" value={f.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="all">Barcha kategoriyalar</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {f.type === 'all' ? (c.type === 'income' ? ' (daromad)' : ' (xarajat)') : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-pay">To‘lov turi</label>
            <select id="f-pay" className="input" value={f.payment} onChange={(e) => set({ payment: e.target.value as Filters['payment'] })}>
              <option value="all">Barchasi</option>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-from">Sanadan</label>
            <input id="f-from" type="date" className="input" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">Sanagacha</label>
            <input id="f-to" type="date" className="input" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-sort">Saralash</label>
            <select id="f-sort" className="input" value={f.sort} onChange={(e) => set({ sort: e.target.value as Sort })}>
              <option value="date-desc">Avval yangilari</option>
              <option value="date-asc">Avval eskilari</option>
              <option value="amount-desc">Summa: kattadan kichikka</option>
              <option value="amount-asc">Summa: kichikdan kattaga</option>
            </select>
          </div>
        </div>

        {(activeFilters > 0 || f.q) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3 text-[13px]">
            <p className="text-muted">
              Topildi: <b className="text-ink">{filtered?.length ?? 0}</b> ·{' '}
              <span className="text-income font-semibold tabular">{money(totals.income, { sign: 'always' })}</span> ·{' '}
              <span className="text-expense font-semibold tabular">{money(-totals.expense, { sign: 'always' })}</span>
            </p>
            <button className="inline-flex items-center gap-1 font-medium text-accent" onClick={() => set(EMPTY)}>
              <X size={14} /> Filtrlarni tozalash
            </button>
          </div>
        )}
      </div>

      {/* Ro‘yxat */}
      <div className="card-flush">
        {filtered === undefined ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : txs!.length === 0 ? (
          <EmptyState
            art="list"
            title="Tranzaksiyalar hali yo‘q"
            description="Daromad va xarajatlaringizni qo‘shing. Ular shu yerda sana bo‘yicha guruhlab ko‘rsatiladi."
            action={
              <>
                <button className="btn btn-outline" onClick={() => openNew('income')}>Daromad qo‘shish</button>
                <button className="btn btn-primary" onClick={() => openNew('expense')}>Xarajat qo‘shish</button>
              </>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState art="search" title="Hech narsa topilmadi" description="Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring." action={<button className="btn btn-secondary" onClick={() => set(EMPTY)}>Filtrlarni tozalash</button>} />
        ) : groups ? (
          <div className="divide-y divide-line/60">
            {groups.map((g) => (
              <div key={g.date} className="px-2 py-2">
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <h3 className="text-[13px] font-semibold text-muted first-letter:uppercase">{day(g.date)}</h3>
                  <span className={cn('tabular text-[13px] font-semibold', g.net >= 0 ? 'text-income' : 'text-muted')}>{money(g.net, { sign: 'always' })}</span>
                </div>
                {g.items.map((t) => (
                  <Row key={t.id} t={t} onEdit={() => openEdit(t)} onDelete={() => remove(t)}>
                    <TransactionItem tx={t} category={catMap.get(t.categoryId)} onClick={() => openEdit(t)} showDate={false} />
                  </Row>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2">
            {visible.map((t) => (
              <Row key={t.id} t={t} onEdit={() => openEdit(t)} onDelete={() => remove(t)}>
                <TransactionItem tx={t} category={catMap.get(t.categoryId)} onClick={() => openEdit(t)} />
              </Row>
            ))}
          </div>
        )}
        {filtered && filtered.length > limit && (
          <div className="border-t border-line/60 p-3 text-center">
            <button className="btn btn-secondary" onClick={() => setLimit((l) => l + PAGE)}>
              Yana ko‘rsatish ({filtered.length - limit} ta qoldi)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ children, onDelete }: { t: Transaction; children: React.ReactNode; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group relative flex items-center">
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onDelete}
        className="icon-btn hidden lg:inline-flex h-9 w-9 ml-1 mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-expense hover:bg-expense/10"
        aria-label="O‘chirish"
        title="O‘chirish"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
