import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useBudgets, useCategories, useTransactions } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useSettings } from '@/store/settings';
import { confirmDialog, errorMessage, toast } from '@/store/ui';
import { deleteBudget, saveBudget } from '@/services/finance';
import { budgetStatuses, type BudgetStatus } from '@/utils/stats';
import { addMonths, formatMonthYear, startOfMonth, todayISO, endOfMonth, daysBetween } from '@/utils/date';
import { minorToInput, parseMoney } from '@/utils/money';
import type { Budget } from '@/types';
import { CategoryIcon, Field, PageHeader, ProgressBar, Skeleton } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { MoneyInput } from '@/components/MoneyInput';
import { cn } from '@/utils/misc';

export default function Budgets() {
  const budgets = useBudgets();
  const txs = useTransactions();
  const { list: categories, map: catMap } = useCategories();
  const warn = useSettings((s) => s.budgetWarnPercent);
  const { money } = useFormat();
  const [month, setMonth] = useState(startOfMonth(todayISO()));
  const [editing, setEditing] = useState<Budget | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const statuses = useMemo(() => {
    if (!budgets || !txs) return undefined;
    return budgetStatuses(budgets, txs, month, catMap, warn).sort((a, b) => b.percent - a.percent);
  }, [budgets, txs, month, catMap, warn]);

  const summary = useMemo(() => {
    if (!statuses) return null;
    const limit = statuses.reduce((s, x) => s + x.budget.limit, 0);
    const spent = statuses.reduce((s, x) => s + x.spent, 0);
    return { limit, spent, remaining: limit - spent, pct: limit ? (spent / limit) * 100 : 0, alerts: statuses.filter((s) => s.state !== 'ok').length };
  }, [statuses]);

  const expenseCats = (categories ?? []).filter((c) => c.type === 'expense');
  const freeCats = expenseCats.filter((c) => !budgets?.some((b) => b.categoryId === c.id));
  const isCurrent = month === startOfMonth(todayISO());
  const daysLeft = isCurrent ? daysBetween(todayISO(), endOfMonth(month)) + 1 : 0;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  async function remove(s: BudgetStatus) {
    const ok = await confirmDialog({
      title: 'Budjetni o‘chirish',
      message: `“${s.category?.name ?? 'Kategoriya'}” uchun oylik limit o‘chiriladi. Tranzaksiyalar o‘zgarmaydi.`,
      confirmLabel: 'O‘chirish',
      danger: true,
    });
    if (!ok) return;
    await deleteBudget(s.budget.id);
    toast.success('Budjet o‘chirildi');
  }

  return (
    <div>
      <PageHeader
        title="Budjetlar"
        subtitle="Kategoriyalar bo‘yicha oylik xarajat limitlari"
        actions={
          <button className="btn btn-primary btn-sm h-10" onClick={openNew} disabled={!freeCats.length}>
            <Plus size={16} /> Budjet qo‘shish
          </button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl bg-surface border border-line/70 p-1 shadow-card">
          <button className="icon-btn h-9 w-9" onClick={() => setMonth(addMonths(month, -1))} aria-label="Oldingi oy">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[132px] text-center text-sm font-semibold">{formatMonthYear(month)}</span>
          <button className="icon-btn h-9 w-9" onClick={() => setMonth(addMonths(month, 1))} aria-label="Keyingi oy">
            <ChevronRight size={18} />
          </button>
        </div>
        {!isCurrent && (
          <button className="btn btn-ghost btn-sm" onClick={() => setMonth(startOfMonth(todayISO()))}>
            Joriy oy
          </button>
        )}
      </div>

      {!statuses ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-3xl" />)}</div>
      ) : statuses.length === 0 ? (
        <div className="card">
          <EmptyState
            art="target"
            title="Budjetlar belgilanmagan"
            description="Masalan: Oziq-ovqat — 2 000 000 so‘m, Transport — 500 000 so‘m. Limitga yaqinlashganda ilova sizni ogohlantiradi."
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={18} /> Birinchi budjetni qo‘shish</button>}
          />
        </div>
      ) : (
        <>
          {summary && (
            <div className="card mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryItem label="Umumiy limit" value={money(summary.limit)} />
                <SummaryItem label="Sarflangan" value={money(summary.spent)} />
                <SummaryItem label="Qolgan" value={money(summary.remaining)} tone={summary.remaining < 0 ? 'text-expense' : 'text-income'} />
                <SummaryItem label={isCurrent ? 'Oy tugashiga' : 'Ogohlantirishlar'} value={isCurrent ? `${daysLeft} kun` : `${summary.alerts} ta`} />
              </div>
              <ProgressBar className="mt-4" value={summary.pct} tone={summary.pct > 100 ? 'over' : summary.pct >= warn ? 'warn' : 'accent'} label="Umumiy budjet" />
              <p className="mt-2 text-[13px] text-muted">
                Umumiy budjetning <b className="tabular text-ink">{summary.pct.toFixed(0)}%</b> qismi sarflandi
                {summary.alerts > 0 && <> · <span className="text-warn font-medium">{summary.alerts} ta budjet diqqat talab qiladi</span></>}
              </p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {statuses.map((s) => (
              <BudgetCard
                key={s.budget.id}
                s={s}
                onEdit={() => {
                  setEditing(s.budget);
                  setFormOpen(true);
                }}
                onDelete={() => remove(s)}
              />
            ))}
          </div>
        </>
      )}

      <BudgetForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} freeCats={freeCats} allCats={expenseCats} />
    </div>
  );
}

function SummaryItem({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className={cn('tabular mt-0.5 text-base lg:text-lg font-bold tracking-tight truncate', tone ?? 'text-ink')}>{value}</p>
    </div>
  );
}

function BudgetCard({ s, onEdit, onDelete }: { s: BudgetStatus; onEdit: () => void; onDelete: () => void }) {
  const { money } = useFormat();
  const stateText = s.state === 'over' ? 'Limit oshdi' : s.state === 'warn' ? 'Limitga yaqin' : 'Me’yorda';
  return (
    <div className={cn('card group', s.state === 'over' && 'border-expense/40', s.state === 'warn' && 'border-warn/40')}>
      <div className="flex items-center gap-3">
        <CategoryIcon icon={s.category?.icon ?? 'more'} color={s.category?.color ?? '#94a3b8'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{s.category?.name ?? 'Noma’lum'}</p>
          <p className={cn('flex items-center gap-1 text-[12px] font-medium', s.state === 'over' ? 'text-expense' : s.state === 'warn' ? 'text-warn' : 'text-income')}>
            {s.state !== 'ok' && <AlertTriangle size={12} />}
            {stateText}
          </p>
        </div>
        <div className="flex">
          <button className="icon-btn h-9 w-9" onClick={onEdit} aria-label="Tahrirlash"><Pencil size={16} /></button>
          <button className="icon-btn h-9 w-9 hover:text-expense hover:bg-expense/10" onClick={onDelete} aria-label="O‘chirish"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <p className="tabular text-lg font-bold text-ink">{money(s.spent)}</p>
        <p className="tabular text-[13px] text-muted">/ {money(s.budget.limit)}</p>
      </div>
      <ProgressBar className="mt-2" value={s.percent} tone={s.state === 'over' ? 'over' : s.state === 'warn' ? 'warn' : 'accent'} label={`${s.category?.name} budjeti`} />
      <div className="mt-2 flex justify-between text-[12px]">
        <span className="tabular font-semibold text-muted">{s.percent.toFixed(0)}%</span>
        <span className={cn('tabular font-medium', s.remaining < 0 ? 'text-expense' : 'text-muted')}>
          {s.remaining < 0 ? `${money(-s.remaining)} ortiqcha` : `${money(s.remaining)} qoldi`}
        </span>
      </div>
    </div>
  );
}

function BudgetForm({ open, onClose, editing, freeCats, allCats }: { open: boolean; onClose: () => void; editing: Budget | null; freeCats: { id: string; name: string; icon: string; color: string }[]; allCats: { id: string; name: string; icon: string; color: string }[] }) {
  const numberFormat = useSettings((s) => s.numberFormat);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [errors, setErrors] = useState<{ cat?: string; limit?: string }>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setCategoryId(editing.categoryId);
      setLimit(minorToInput(editing.limit, numberFormat));
    } else {
      setCategoryId(freeCats[0]?.id ?? '');
      setLimit('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const options = editing ? allCats.filter((c) => c.id === editing.categoryId || freeCats.some((f) => f.id === c.id)) : freeCats;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = parseMoney(limit);
    const errs: typeof errors = {};
    if (!categoryId) errs.cat = 'Kategoriyani tanlang';
    if (!r.ok) errs.limit = r.error;
    setErrors(errs);
    if (!r.ok || errs.cat) return;
    try {
      await saveBudget(categoryId, r.value, editing?.id);
      toast.success(editing ? 'Budjet yangilandi' : 'Budjet qo‘shildi');
      onClose();
    } catch (err) {
      toast.error('Saqlab bo‘lmadi', errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Budjetni tahrirlash' : 'Yangi budjet'}
      description="Tanlangan kategoriya uchun har oylik xarajat limiti"
      footer={
        <>
          <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="budget-form" className="btn btn-primary flex-1 sm:flex-none">Saqlash</button>
        </>
      }
    >
      <form id="budget-form" onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <span className="label">Kategoriya</span>
          {options.length === 0 ? (
            <p className="text-sm text-muted">Barcha xarajat kategoriyalariga budjet belgilangan.</p>
          ) : (
            <div role="radiogroup" className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {options.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={c.id === categoryId}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2.5 transition-all active:scale-95',
                    c.id === categoryId ? 'border-accent bg-accent/[0.07] ring-2 ring-accent/20' : 'border-line hover:bg-surface-2/60',
                  )}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <span className="w-full truncate text-center text-[12px] font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          {errors.cat && <p className="mt-1.5 text-[13px] text-expense">{errors.cat}</p>}
        </div>
        <Field label="Oylik limit" htmlFor="b-limit" error={errors.limit}>
          <MoneyInput id="b-limit" value={limit} onChange={setLimit} large error={!!errors.limit} />
        </Field>
      </form>
    </Modal>
  );
}
