import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Field } from './ui/primitives';
import { MoneyInput } from './MoneyInput';
import { useAccounts, useTransactions, useTransfers } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useSettings } from '@/store/settings';
import { errorMessage, toast, useTransferForm } from '@/store/ui';
import { addTransfer, NOTE_MAX } from '@/services/finance';
import { accountBalances } from '@/utils/stats';
import { getIcon } from '@/utils/icons';
import { addDays, todayISO } from '@/utils/date';
import { parseAmountInput } from '@/utils/keypad';
import { cn } from '@/utils/misc';
import type { Account } from '@/types';

/** Hisoblar orasida o‘tkazma — ilovaning istalgan joyidan ochiladi (⇄ tugmasi) */
export function TransferForm() {
  const open = useTransferForm((s) => s.open);
  const setOpen = useTransferForm((s) => s.setOpen);
  const onClose = () => setOpen(false);
  const { list } = useAccounts();
  const accounts = list ?? [];
  const txs = useTransactions();
  const transfers = useTransfers();
  const balances = useMemo(() => (list && txs && transfers ? accountBalances(list, txs, transfers) : null), [list, txs, transfers]);
  const numberFormat = useSettings((s) => s.numberFormat);
  const { money } = useFormat();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (accounts.length < 2) {
      toast.info('O‘tkazma uchun kamida ikkita hisob kerak', 'Hisoblar bo‘limida yangi hisob qo‘shing.');
      setOpen(false);
      return;
    }
    setFromId(accounts[0]?.id ?? '');
    setToId(accounts[1]?.id ?? '');
    setAmount('');
    setDate(todayISO());
    setNote('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = parseAmountInput(amount, numberFormat);
    if (!r.ok) return setError(r.error);
    if (fromId === toId) return setError('Turli hisoblarni tanlang');
    try {
      await addTransfer({ fromId, toId, amount: r.value, date, note });
      toast.success('O‘tkazma bajarildi', money(r.value));
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span className="flex items-center gap-2.5"><ArrowLeftRight size={20} className="text-accent" /> O‘tkazma</span>}
      description="Masalan: kartadan naqd yechish yoki jamg‘armaga qo‘yish"
      footer={<button type="submit" form="tr-form" className="btn btn-primary h-12 flex-1">O‘tkazish</button>}
    >
      <form id="tr-form" onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="sr-only" htmlFor="tr-amount">Summa</label>
          <MoneyInput id="tr-amount" value={amount} onChange={(v) => { setAmount(v); setError(''); }} large autoFocus />
        </div>
        <AccountPicker accounts={accounts} balances={balances} label="Qayerdan" value={fromId} onChange={(id) => { setFromId(id); if (id === toId) setToId(accounts.find((a) => a.id !== id)?.id ?? ''); }} />
        <AccountPicker accounts={accounts} balances={balances} label="Qayerga" value={toId} onChange={setToId} exclude={fromId} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sana" htmlFor="tr-date">
            <input id="tr-date" type="date" className="input" value={date} max={addDays(todayISO(), 366)} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Izoh" htmlFor="tr-note">
            <input id="tr-note" className="input" maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ixtiyoriy" />
          </Field>
        </div>
        {error && <p className="text-[13px] text-expense" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}


/** Hisob tanlash tugmalari (forma ichida e’lon qilinmaydi — aks holda har yangilanishda qayta yaratilib, bosish yo‘qoladi) */
function AccountPicker({
  accounts,
  balances,
  value,
  onChange,
  label,
  exclude,
}: {
  accounts: Account[];
  balances: Map<string, number> | null;
  value: string;
  onChange: (id: string) => void;
  label: string;
  exclude?: string;
}) {
  const { money } = useFormat();
  return (
    <div>
      <span className="label">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {accounts.map((a) => {
          const Icon = getIcon(a.icon);
          const active = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={a.id === exclude}
              onClick={() => onChange(a.id)}
              className={cn('inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors disabled:opacity-35', active ? 'border-transparent text-white' : 'border-line text-muted hover:text-ink')}
              style={active ? { background: a.color } : undefined}
            >
              <Icon size={16} />
              {a.name}
              {balances && <span className={cn('text-[11px] font-medium', active ? 'text-white/80' : 'text-subtle')}>{money(balances.get(a.id) ?? 0, { compact: true, plain: true })}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
