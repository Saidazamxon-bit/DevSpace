import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Field, Segmented, CategoryIcon } from './ui/primitives';
import { MoneyInput } from './MoneyInput';
import { useTxForm, toast, confirmDialog, errorMessage } from '@/store/ui';
import { useCategories } from '@/hooks/useData';
import { useSettings } from '@/store/settings';
import { useFormat } from '@/hooks/useFormat';
import { addTransaction, deleteTransaction, restoreTransaction, updateTransaction, NOTE_MAX, PAYMENT_METHODS } from '@/services/finance';
import { checkBudgetAfterExpense } from '@/services/budgetAlerts';
import type { PaymentMethod, TxType } from '@/types';
import { isValidISODate, todayISO, addDays } from '@/utils/date';
import { minorToInput, parseMoney } from '@/utils/money';
import { cn } from '@/utils/misc';
import { Link } from 'react-router-dom';

export function TransactionForm() {
  const { open, type: initialType, editing, close } = useTxForm();
  const { list: categories } = useCategories();
  const numberFormat = useSettings((s) => s.numberFormat);
  const { money } = useFormat();

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('card');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Formani ochilganda to‘ldirish
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
      setCategoryId('');
      setDate(todayISO());
      setNote('');
      setPayment(lastPayment());
    }
  }, [open, editing, initialType, numberFormat]);

  const options = useMemo(() => (categories ?? []).filter((c) => c.type === type), [categories, type]);

  // Tanlangan kategoriya turi mos kelmasa — tozalash
  useEffect(() => {
    if (categoryId && !options.some((c) => c.id === categoryId)) setCategoryId('');
  }, [options, categoryId]);

  const parsed = parseMoney(amount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!parsed.ok) errs.amount = parsed.error;
    if (!categoryId) errs.category = 'Kategoriyani tanlang';
    if (!isValidISODate(date)) errs.date = 'Sanani to‘g‘ri kiriting';
    else if (date > addDays(todayISO(), 366)) errs.date = 'Sana bir yildan uzoq kelajakda bo‘lmasligi kerak';
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
        toast.success(type === 'income' ? 'Daromad qo‘shildi' : 'Xarajat qo‘shildi', money(parsed.value));
      }
      rememberPayment(payment);
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

  return (
    <Modal
      open={open}
      onClose={close}
      title={editing ? 'Tranzaksiyani tahrirlash' : type === 'income' ? 'Daromad qo‘shish' : 'Xarajat qo‘shish'}
      footer={
        <>
          {editing && (
            <button type="button" className="btn btn-ghost text-expense hover:text-expense mr-auto px-3" onClick={remove}>
              <Trash2 size={18} />
              <span className="hidden sm:inline">O‘chirish</span>
            </button>
          )}
          <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={close}>
            Bekor qilish
          </button>
          <button type="submit" form="tx-form" className="btn btn-primary flex-1 sm:flex-none sm:min-w-32" disabled={saving}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </>
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-5" noValidate>
        <Segmented
          label="Tranzaksiya turi"
          className="w-full"
          value={type}
          onChange={setType}
          options={[
            { value: 'expense', label: <span className="inline-flex items-center gap-1.5"><ArrowUpRight size={16} />Xarajat</span>, tone: 'expense' },
            { value: 'income', label: <span className="inline-flex items-center gap-1.5"><ArrowDownLeft size={16} />Daromad</span>, tone: 'income' },
          ]}
        />

        <Field label="Summa" htmlFor="tx-amount" error={errors.amount}>
          <MoneyInput ref={amountRef} id="tx-amount" value={amount} onChange={setAmount} large error={!!errors.amount} autoFocus={!editing} />
        </Field>

        <div>
          <span className="label" id="cat-label">Kategoriya</span>
          {options.length === 0 ? (
            <p className="text-sm text-muted">
              Kategoriyalar yo‘q.{' '}
              <Link to="/categories" className="text-accent font-medium" onClick={close}>
                Kategoriya yaratish
              </Link>
            </p>
          ) : (
            <div role="radiogroup" aria-labelledby="cat-label" className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {options.map((c) => {
                const active = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center transition-all duration-150 active:scale-95',
                      active ? 'border-accent bg-accent/[0.07] ring-2 ring-accent/20' : 'border-line hover:border-subtle/60 hover:bg-surface-2/60',
                    )}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className={cn('w-full truncate text-[12px] font-medium leading-tight', active ? 'text-ink' : 'text-muted')}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          {errors.category && <p className="mt-1.5 text-[13px] text-expense" role="alert">{errors.category}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Sana" htmlFor="tx-date" error={errors.date}>
            <input id="tx-date" type="date" className={cn('input', errors.date && 'input-error')} value={date} max={addDays(todayISO(), 366)} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <div>
            <span className="label">To‘lov turi</span>
            <Segmented size="sm" className="w-full h-11 items-center" value={payment} onChange={setPayment} options={PAYMENT_METHODS} label="To‘lov turi" />
          </div>
        </div>

        <Field label="Izoh (ixtiyoriy)" htmlFor="tx-note" hint={`${note.length}/${NOTE_MAX}`}>
          <textarea
            id="tx-note"
            rows={2}
            className="input"
            placeholder="Masalan: Korzinkadan xarid"
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}

const PAY_KEY = 'pf-last-payment';
function lastPayment(): PaymentMethod {
  try {
    const v = localStorage.getItem(PAY_KEY) as PaymentMethod | null;
    if (v && PAYMENT_METHODS.some((p) => p.value === v)) return v;
  } catch {
    /* */
  }
  return 'card';
}
function rememberPayment(p: PaymentMethod) {
  try {
    localStorage.setItem(PAY_KEY, p);
  } catch {
    /* */
  }
}
