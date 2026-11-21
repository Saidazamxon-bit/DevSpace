import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { MoneyInput } from './MoneyInput';
import { useTxForm, toast, confirmDialog, errorMessage } from '@/store/ui';
import { useCategories } from '@/hooks/useData';
import { useSettings } from '@/store/settings';
import { useFormat } from '@/hooks/useFormat';
import { addTransaction, deleteTransaction, restoreTransaction, updateTransaction, NOTE_MAX } from '@/services/finance';
import { checkBudgetAfterExpense } from '@/services/budgetAlerts';
import type { PaymentMethod, TxType } from '@/types';
import { isValidISODate, todayISO, addDays } from '@/utils/date';
import { minorToInput, parseMoney } from '@/utils/money';
import { cn } from '@/utils/misc';
import { getIcon } from '@/utils/icons';

/** Daromad / xarajat qo‘shish va tahrirlash — pastdan chiqadigan ixcham panel */
export function TransactionForm() {
  const { open, type: initialType, categoryId: presetCategory, editing, close } = useTxForm();
  const { list: categories } = useCategories();
  const numberFormat = useSettings((s) => s.numberFormat);
  const { money } = useFormat();

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    if (editing) {
      setType(editing.type);
      setAmount(minorToInput(editing.amount, numberFormat));
      setCategoryId(editing.categoryId);
      setDate(editing.date);
      setNote(editing.note);
      setPayment(editing.paymentMethod);
    } else {
      setType(initialType);
      setAmount('');
      setCategoryId(presetCategory ?? '');
      setDate(todayISO());
      setNote('');
      setPayment('cash');
    }
  }, [open, editing, initialType, presetCategory, numberFormat]);

  const options = useMemo(() => (categories ?? []).filter((c) => c.type === type), [categories, type]);

  useEffect(() => {
    if (categoryId && categories && !options.some((c) => c.id === categoryId)) setCategoryId('');
  }, [options, categoryId, categories]);

  const parsed = parseMoney(amount);
  const isIncome = type === 'income';
  const today = todayISO();
  const yesterday = addDays(today, -1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!parsed.ok) errs.amount = parsed.error;
    if (!categoryId) errs.category = 'Kategoriyani tanlang';
    if (!isValidISODate(date)) errs.date = 'Sanani to‘g‘ri kiriting';
    else if (date > addDays(today, 366)) errs.date = 'Sana bir yildan uzoq kelajakda bo‘lmasligi kerak';
    setErrors(errs);
    if (Object.keys(errs).length || !parsed.ok) {
      if (errs.amount) amountRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const input = { type, amount: parsed.value, categoryId, date, note, paymentMethod: payment };
      if (editing) {
        await updateTransaction(editing.id, input);
        toast.success('O‘zgarishlar saqlandi');
      } else {
        await addTransaction(input);
        toast.success(isIncome ? 'Daromad qo‘shildi' : 'Xarajat qo‘shildi', money(parsed.value));
      }
      if (type === 'expense') void checkBudgetAfterExpense(categoryId, date);
      close();
    } catch (err) {
      toast.error('Saqlab bo‘lmadi', errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirmDialog({
      title: 'Tranzaksiyani o‘chirish',
      message: 'Bu yozuv butunlay o‘chiriladi. Davom etasizmi?',
      confirmLabel: 'O‘chirish',
      danger: true,
    });
    if (!ok) return;
    const removed = await deleteTransaction(editing.id);
    close();
    toast.success('Tranzaksiya o‘chirildi', undefined, removed ? { label: 'Qaytarish', onClick: () => void restoreTransaction(removed) } : undefined);
  }

  const dateChip = (label: string, value: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={date === value}
      onClick={() => setDate(value)}
      className={cn('h-10 rounded-xl px-3.5 text-sm font-semibold transition-colors', date === value ? 'bg-ink text-bg' : 'bg-surface-2 text-muted hover:text-ink')}
    >
      {label}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="flex items-center gap-2.5">
          <span className={cn('grid h-8 w-8 place-items-center rounded-full text-white', isIncome ? 'bg-income dark:text-[#04261a]' : 'bg-expense dark:text-[#2b0909]')}>
            {isIncome ? <Plus size={18} strokeWidth={2.6} /> : <Minus size={18} strokeWidth={2.6} />}
          </span>
          {editing ? 'Tahrirlash' : isIncome ? 'Daromad' : 'Xarajat'}
        </span>
      }
      footer={
        <>
          {editing && (
            <button type="button" className="btn btn-secondary px-3.5 text-expense" onClick={remove} aria-label="O‘chirish">
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="submit"
            form="tx-form"
            disabled={saving}
            className={cn('btn flex-1 h-12 text-[15px] text-white', isIncome ? 'bg-income dark:text-[#04261a]' : 'bg-expense dark:text-[#2b0909]', 'hover:brightness-110')}
          >
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </>
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-4" noValidate>
        {editing && (
          <div role="radiogroup" aria-label="Turi" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn('h-9 rounded-lg text-sm font-semibold', type === t ? (t === 'income' ? 'bg-surface text-income shadow-card' : 'bg-surface text-expense shadow-card') : 'text-muted')}
              >
                {t === 'income' ? 'Daromad' : 'Xarajat'}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="sr-only" htmlFor="tx-amount">Summa</label>
          <MoneyInput ref={amountRef} id="tx-amount" value={amount} onChange={setAmount} large error={!!errors.amount} autoFocus={!editing} />
          {errors.amount && <p className="mt-1.5 text-[13px] text-expense" role="alert">{errors.amount}</p>}
        </div>

        <div>
          <span className="label" id="cat-label">Kategoriya</span>
          {options.length === 0 ? (
            <p className="text-sm text-muted">
              Kategoriyalar yo‘q.{' '}
              <Link to="/categories" className="font-medium text-accent" onClick={close}>Kategoriya yaratish</Link>
            </p>
          ) : (
            <div role="radiogroup" aria-labelledby="cat-label" className="grid grid-cols-4 gap-x-1 gap-y-2.5 sm:grid-cols-5">
              {options.map((c) => {
                const active = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={c.name}
                    onClick={() => setCategoryId(c.id)}
                    className="flex flex-col items-center gap-1 rounded-xl py-1 transition-transform active:scale-95"
                  >
                    <span
                      className={cn('grid h-12 w-12 place-items-center rounded-full transition-all', active && 'ring-[3px] ring-offset-2 ring-offset-surface')}
                      style={{ background: active ? c.color : `${c.color}1f`, color: active ? '#fff' : c.color, ['--tw-ring-color' as string]: c.color }}
                    >
                      <CategoryIconGlyph icon={c.icon} />
                    </span>
                    <span className={cn('w-full truncate text-center text-[11.5px] leading-tight', active ? 'font-semibold text-ink' : 'text-muted')}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          {errors.category && <p className="mt-1.5 text-[13px] text-expense" role="alert">{errors.category}</p>}
        </div>

        <div>
          <span className="label">Sana</span>
          <div role="radiogroup" aria-label="Sana" className="flex items-center gap-2">
            {dateChip('Bugun', today)}
            {dateChip('Kecha', yesterday)}
            <input
              id="tx-date"
              type="date"
              aria-label="Boshqa sana"
              className={cn('input h-10 min-w-0 flex-1', date !== today && date !== yesterday && 'border-ink', errors.date && 'input-error')}
              value={date}
              max={addDays(today, 366)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {errors.date && <p className="mt-1.5 text-[13px] text-expense" role="alert">{errors.date}</p>}
        </div>

        <div>
          <label className="label" htmlFor="tx-note">Izoh (ixtiyoriy)</label>
          <input id="tx-note" className="input" placeholder="Masalan: Korzinkadan xarid" maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

function CategoryIconGlyph({ icon }: { icon: string }) {
  const Icon = getIcon(icon);
  return <Icon size={22} strokeWidth={2.1} />;
}
