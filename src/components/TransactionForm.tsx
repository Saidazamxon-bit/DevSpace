import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { MoneyInput } from './MoneyInput';
import { useTxForm, toast, confirmDialog, errorMessage } from '@/store/ui';
import { useAccounts, useCategories } from '@/hooks/useData';
import { useSettings } from '@/store/settings';
import { useFormat } from '@/hooks/useFormat';
import { addIncomeWithSplit, addRecurring, addTransaction, computeSplit, deleteTransaction, getDistribution, restoreTransaction, updateTransaction, NOTE_MAX } from '@/services/finance';
import { useLiveQuery } from 'dexie-react-hooks';
import { Switch } from './ui/primitives';
import { checkBudgetAfterExpense } from '@/services/budgetAlerts';
import type { RecurringFreq, TxType } from '@/types';
import { isValidISODate, todayISO, addDays } from '@/utils/date';
import { minorToInput } from '@/utils/money';
import { parseAmountInput } from '@/utils/keypad';

import { cn } from '@/utils/misc';
import { getIcon } from '@/utils/icons';

/** Daromad / xarajat qo‘shish va tahrirlash — pastdan chiqadigan ixcham panel */
export function TransactionForm() {
  const { open, type: initialType, categoryId: presetCategory, repeat: presetRepeat, editing, close } = useTxForm();
  const { list: categories } = useCategories();
  const { list: accounts } = useAccounts();
  const numberFormat = useSettings((s) => s.numberFormat);
  const { money } = useFormat();

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [repeat, setRepeat] = useState<'none' | RecurringFreq>('none');
  const [distribute, setDistribute] = useState(true);
  const distribution = useLiveQuery(() => getDistribution(), []);
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
      setAccountId(editing.accountId);
      setRepeat('none');
    } else {
      setType(initialType);
      setAmount('');
      setCategoryId(presetCategory ?? '');
      setDate(todayISO());
      setNote('');
      setAccountId(lastAccount());
      setRepeat(presetRepeat ?? 'none');
      setDistribute(true);
    }
  }, [open, editing, initialType, presetCategory, presetRepeat, numberFormat]);

  // Hisob topilmasa (o‘chirilgan yoki birinchi ochilish) — birinchi hisob
  useEffect(() => {
    if (accounts?.length && !accounts.some((a) => a.id === accountId)) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const options = useMemo(() => (categories ?? []).filter((c) => c.type === type), [categories, type]);

  useEffect(() => {
    if (categoryId && categories && !options.some((c) => c.id === categoryId)) setCategoryId('');
  }, [options, categoryId, categories]);

  const parsed = parseAmountInput(amount, numberFormat);
  // Daromadni avtomatik taqsimlash (faqat yangi daromad uchun)
  const canSplit = type === 'income' && !editing && !!distribution?.enabled && distribution.rules.length > 0;
  const splitOn = canSplit && distribute;
  const splitPreview = useMemo(
    () => (canSplit && parsed.ok ? computeSplit(parsed.value, distribution!.rules, accountId) : []),
    [canSplit, parsed, distribution, accountId],
  );
  const isIncome = type === 'income';
  const today = todayISO();
  const yesterday = addDays(today, -1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!parsed.ok) errs.amount = parsed.error;
    if (!categoryId) errs.category = 'Kategoriyani tanlang';
    if (!accountId) errs.account = 'Hisobni tanlang';
    if (!isValidISODate(date)) errs.date = 'Sanani to‘g‘ri kiriting';
    else if (date > addDays(today, 366)) errs.date = 'Sana bir yildan uzoq kelajakda bo‘lmasligi kerak';
    setErrors(errs);
    if (Object.keys(errs).length || !parsed.ok) {
      if (errs.amount) amountRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const input = { type, amount: parsed.value, categoryId, accountId, date, note, ...(editing ? { paymentMethod: editing.paymentMethod } : {}) };
      if (editing) {
        await updateTransaction(editing.id, input);
        toast.success('O‘zgarishlar saqlandi');
      } else {
        let parts = 0;
        if (isIncome) parts = (await addIncomeWithSplit(input, splitOn)).parts;
        else await addTransaction(input);
        if (repeat !== 'none') {
          await addRecurring({ type, amount: parsed.value, categoryId, accountId, note, freq: repeat, startDate: date, lastDate: date });
        }
        toast.success(
          isIncome ? 'Daromad qo‘shildi' : 'Xarajat qo‘shildi',
          [money(parsed.value), parts ? `${parts} ta hisobga taqsimlandi` : '', repeat !== 'none' ? `${repeat === 'monthly' ? 'har oy' : 'har hafta'} eslatiladi` : ''].filter(Boolean).join(' · '),
        );
        rememberAccount(accountId);
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

        {accounts && accounts.length > 1 && (
          <div>
            <span className="label" id="acc-label">{isIncome ? 'Qaysi hisobga' : 'Qaysi hisobdan'}</span>
            <div role="radiogroup" aria-labelledby="acc-label" className="flex flex-wrap gap-2">
              {accounts.map((a) => {
                const Icon = getIcon(a.icon);
                const active = a.id === accountId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAccountId(a.id)}
                    className={cn('inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors', active ? 'border-transparent text-white' : 'border-line text-muted hover:text-ink')}
                    style={active ? { background: a.color } : undefined}
                  >
                    <Icon size={16} />
                    {a.name}
                  </button>
                );
              })}
            </div>
            {errors.account && <p className="mt-1.5 text-[13px] text-expense" role="alert">{errors.account}</p>}
          </div>
        )}

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

        {canSplit && (
          <div className="rounded-2xl bg-surface-2 p-3.5" data-testid="split-preview">
            <Switch checked={distribute} onChange={setDistribute} label="Avtomatik taqsimlash" description="Foizlar bo‘yicha hisoblarga o‘tkaziladi" />
            {distribute && splitPreview.length > 0 && (
              <ul className="mt-2.5 space-y-1 border-t border-line/70 pt-2.5">
                {splitPreview.map((p) => (
                  <li key={p.rule.id} className="flex items-center justify-between gap-2 text-[14px]">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-ink">{p.rule.name}</span>
                      <span className="text-[12px] text-subtle">{p.rule.percent}%</span>
                    </span>
                    <span className="tabular font-semibold text-ink">{money(p.amount)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-2 text-[13px] text-muted">
                  <span>Hisobda qoladi</span>
                  <span className="tabular font-semibold">{money(parsed.ok ? parsed.value - splitPreview.reduce((s, p) => s + p.amount, 0) : 0)}</span>
                </li>
              </ul>
            )}
          </div>
        )}

        {!editing && (
          <div>
            <span className="label" id="rep-label">Takrorlash</span>
            <div role="radiogroup" aria-labelledby="rep-label" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
              {([
                ['none', 'Bir martalik'],
                ['weekly', 'Har hafta'],
                ['monthly', 'Har oy'],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={repeat === v}
                  onClick={() => setRepeat(v)}
                  className={cn('h-9 rounded-lg text-[13px] font-semibold', repeat === v ? 'bg-surface text-ink shadow-card' : 'text-muted')}
                >
                  {l}
                </button>
              ))}
            </div>
            {repeat !== 'none' && (
              <p className="mt-1.5 text-[12px] text-muted">Keyingi safar vaqti kelganda bosh ekranda bir bosishda tasdiqlaysiz.</p>
            )}
          </div>
        )}

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

const ACC_KEY = 'pf-last-account';
function lastAccount(): string {
  try {
    return localStorage.getItem(ACC_KEY) ?? '';
  } catch {
    return '';
  }
}
function rememberAccount(id: string) {
  try {
    localStorage.setItem(ACC_KEY, id);
  } catch {
    /* */
  }
}

