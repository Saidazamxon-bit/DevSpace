import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, Check, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAccounts, useTransactions, useTransfers } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { useSettings } from '@/store/settings';
import { confirmDialog, errorMessage, toast, useTransferForm } from '@/store/ui';
import {
  ACCOUNT_KINDS, ACCOUNT_NAME_MAX, addAccount, countAccountUsage, deleteAccount, deleteTransfer, updateAccount,
} from '@/services/finance';
import { db } from '@/database/db';
import { accountBalances } from '@/utils/stats';
import { getIcon, CATEGORY_COLORS } from '@/utils/icons';
import { minorToInput } from '@/utils/money';
import { cn } from '@/utils/misc';
import type { Account, AccountKind } from '@/types';
import { Field, PageHeader, Skeleton } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { MoneyInput, parseSignedMoney } from '@/components/MoneyInput';
import { Amount } from '@/components/Amount';

const ACCOUNT_ICONS = ['credit-card', 'banknote', 'piggy-bank', 'wallet', 'landmark', 'coins', 'dollar', 'hand-coins', 'smartphone', 'briefcase'];

/** Hisoblar: Karta, Naqd, Jamg‘arma va foydalanuvchi qo‘shgan hisoblar, ular orasidagi o‘tkazmalar */
export default function Accounts() {
  const { list: accounts, map: accMap } = useAccounts();
  const txs = useTransactions();
  const transfers = useTransfers();
  const { money, day } = useFormat();
  const [form, setForm] = useState<{ open: boolean; editing: Account | null }>({ open: false, editing: null });
  const openTransfer = useTransferForm((x) => x.setOpen);

  const balances = useMemo(
    () => (accounts && txs && transfers ? accountBalances(accounts, txs, transfers) : null),
    [accounts, txs, transfers],
  );
  const total = balances ? [...balances.values()].reduce((s, x) => s + x, 0) : 0;

  async function removeTransfer(id: string) {
    const ok = await confirmDialog({ title: 'O‘tkazmani o‘chirish', message: 'Hisoblar qoldig‘i shunga qarab qayta hisoblanadi.', confirmLabel: 'O‘chirish', danger: true });
    if (!ok) return;
    const t = await deleteTransfer(id);
    toast.success('O‘tkazma o‘chirildi', undefined, t ? { label: 'Qaytarish', onClick: () => void db.transfers.put(t) } : undefined);
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Hisoblar"
        info="accounts"
        back={false}
        actions={
          <button className="btn btn-primary btn-sm h-10 px-3" onClick={() => setForm({ open: true, editing: null })}>
            <Plus size={16} /> <span className="hidden sm:inline">Yangi hisob</span>
          </button>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4">
        {/* Jami */}
        <div className="rounded-3xl bg-accent px-6 py-5 text-accent-ink shadow-card">
          <p className="text-[13px] font-medium opacity-80">Jami mablag‘</p>
          <p className="mt-1 text-[32px] font-bold leading-tight" data-testid="accounts-total">
            {balances ? <Amount value={total} /> : '…'}
          </p>
          <button
            type="button"
            onClick={() => openTransfer(true)}
            disabled={(accounts?.length ?? 0) < 2}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black/10 px-4 text-sm font-semibold transition-colors hover:bg-black/15 disabled:opacity-50 dark:bg-black/20"
          >
            <ArrowLeftRight size={16} /> Hisoblar orasida o‘tkazma
          </button>
        </div>

        {/* Hisoblar ro‘yxati */}
        {!accounts || !balances ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : (
          <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/70 bg-surface">
            {accounts.map((a) => {
              const Icon = getIcon(a.icon);
              const bal = balances.get(a.id) ?? 0;
              return (
                <li key={a.id} className="flex items-center">
                  <Link to={`/transactions?account=${a.id}&period=all`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60" data-account={a.id}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: a.color }}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">{a.name}</p>
                      <p className="text-[12px] text-muted">
                        {(() => {
                          const kindLabel = ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label ?? '';
                          const share = total > 0 && bal > 0 ? `${Math.round((bal / total) * 100)}% jami mablag‘dan` : '';
                          return [kindLabel !== a.name ? kindLabel : '', share].filter(Boolean).join(' · ') || ' ';
                        })()}
                      </p>
                    </div>
                    <span className={cn('text-[16px] font-bold', bal < 0 ? 'text-expense' : 'text-ink')} data-testid={`acc-balance-${a.id}`}>
                      <Amount value={bal} />
                    </span>
                  </Link>
                  <button className="icon-btn mr-2 h-9 w-9" onClick={() => setForm({ open: true, editing: a })} aria-label={`${a.name} — tahrirlash`}>
                    <Pencil size={16} />
                  </button>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={() => setForm({ open: true, editing: null })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-accent hover:bg-surface-2/60">
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-accent/40">
                  <Plus size={20} />
                </span>
                <span className="flex-1 text-[15px] font-semibold">Hisob qo‘shish</span>
                <ChevronRight size={18} className="text-subtle" />
              </button>
            </li>
          </ul>
        )}

        {/* O‘tkazmalar */}
        {transfers && transfers.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-subtle">O‘tkazmalar</h2>
            <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/70 bg-surface">
              {transfers.slice(0, 30).map((t) => (
                <li key={t.id} className="group flex items-center gap-3 px-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                    <ArrowLeftRight size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-ink">
                      {accMap.get(t.fromId)?.name ?? '—'} <ArrowRight size={14} className="shrink-0 text-subtle" /> {accMap.get(t.toId)?.name ?? '—'}
                    </p>
                    <p className="truncate text-[12px] text-muted">
                      {day(t.date)}
                      {t.note && ` · ${t.note}`}
                    </p>
                  </div>
                  <span className="tabular text-[15px] font-semibold text-ink">{money(t.amount)}</span>
                  <button className="icon-btn h-8 w-8 hover:bg-expense/10 hover:text-expense" onClick={() => void removeTransfer(t.id)} aria-label="O‘tkazmani o‘chirish">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <AccountForm open={form.open} editing={form.editing} balance={form.editing ? balances?.get(form.editing.id) ?? 0 : 0} others={(accounts ?? []).filter((a) => a.id !== form.editing?.id)} onClose={() => setForm({ open: false, editing: null })} />
    </div>
  );
}

function AccountForm({ open, editing, balance, others, onClose }: { open: boolean; editing: Account | null; balance: number; others: Account[]; onClose: () => void }) {
  const numberFormat = useSettings((s) => s.numberFormat);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('card');
  const [icon, setIcon] = useState('credit-card');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [current, setCurrent] = useState('');
  const [reassign, setReassign] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
    setName(editing?.name ?? '');
    setKind(editing?.kind ?? 'card');
    setIcon(editing?.icon ?? 'credit-card');
    setColor(editing?.color ?? CATEGORY_COLORS[6]);
    setCurrent(editing ? (balance < 0 ? '−' : '') + minorToInput(Math.abs(balance), numberFormat) : '');
    setReassign(others[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const bal = parseSignedMoney(current);
    if (!bal.ok) return setError(bal.error);
    if (!name.trim()) return setError('Hisob nomini kiriting');
    setBusy(true);
    try {
      const input = { name, kind, icon, color, currentBalance: bal.value };
      if (editing) await updateAccount(editing.id, input);
      else await addAccount(input);
      toast.success(editing ? 'Hisob yangilandi' : 'Hisob qo‘shildi');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    const used = await countAccountUsage(editing.id);
    const target = others.find((o) => o.id === reassign);
    const ok = await confirmDialog({
      title: 'Hisobni o‘chirish',
      message:
        used > 0 || balance !== 0
          ? `“${editing.name}” dagi barcha yozuvlar va qoldiq “${target?.name ?? ''}” hisobiga ko‘chiriladi. Jami mablag‘ o‘zgarmaydi.`
          : `“${editing.name}” hisobi o‘chiriladi.`,
      confirmLabel: 'O‘chirish',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAccount(editing.id, reassign || undefined);
      toast.success('Hisob o‘chirildi');
      onClose();
    } catch (err) {
      toast.error('O‘chirib bo‘lmadi', errorMessage(err));
    }
  }

  const PreviewIcon = getIcon(icon);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Hisobni tahrirlash' : 'Yangi hisob'}
      footer={
        <>
          {editing && others.length > 0 && (
            <button type="button" className="btn btn-secondary px-3.5 text-expense" onClick={() => void remove()} aria-label="Hisobni o‘chirish">
              <Trash2 size={18} />
            </button>
          )}
          <button type="submit" form="acc-form" className="btn btn-primary h-12 flex-1" disabled={busy}>
            Saqlash
          </button>
        </>
      }
    >
      <form id="acc-form" onSubmit={submit} className="space-y-5" noValidate>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <span className="grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: color }}>
            <PreviewIcon size={22} />
          </span>
          <p className="truncate font-semibold">{name.trim() || 'Hisob nomi'}</p>
        </div>

        <Field label="Nomi" htmlFor="acc-name">
          <input id="acc-name" className="input" maxLength={ACCOUNT_NAME_MAX} value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Masalan: Humo karta" />
        </Field>

        <div>
          <span className="label">Turi</span>
          <div role="radiogroup" aria-label="Turi" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
            {ACCOUNT_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => {
                  setKind(k.value);
                  setIcon(k.icon);
                }}
                className={cn('h-9 rounded-lg text-[13px] font-semibold', kind === k.value ? 'bg-surface text-ink shadow-card' : 'text-muted')}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <Field label={editing ? 'Hozirgi qoldiq' : 'Hozir bu hisobda qancha bor?'} htmlFor="acc-balance" hint={editing ? 'Haqiqiy qoldiqni kiriting — ilova o‘zi to‘g‘rilaydi.' : 'Qarz bo‘lsa, minus bilan kiriting.'}>
          <MoneyInput id="acc-balance" value={current} onChange={setCurrent} allowNegative />
        </Field>

        <div>
          <span className="label">Ikonka</span>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Ikonka">
            {ACCOUNT_ICONS.map((n) => {
              const I = getIcon(n);
              return (
                <button key={n} type="button" role="radio" aria-checked={icon === n} aria-label={n} onClick={() => setIcon(n)}
                  className={cn('grid h-11 place-items-center rounded-xl transition-colors', icon === n ? 'text-white' : 'bg-surface-2 text-muted hover:text-ink')}
                  style={icon === n ? { background: color } : undefined}
                >
                  <I size={19} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="label">Rang</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rang">
            {CATEGORY_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={c === color} aria-label={c} onClick={() => setColor(c)}
                className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90" style={{ background: c }}>
                {c === color && <Check size={16} className="text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {editing && others.length > 0 && (
          <Field label="O‘chirilsa, yozuvlar qaysi hisobga o‘tsin" htmlFor="acc-reassign">
            <select id="acc-reassign" className="input" value={reassign} onChange={(e) => setReassign(e.target.value)}>
              {others.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </Field>
        )}

        {error && <p className="text-[13px] text-expense" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
