import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Circle, HandCoins, Loader2, Minus, Plus, Sparkles, Trash2, Wand2, Zap } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAccounts, useTransactions, useTransfers } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import {
  applyDistributionTemplate,
  computeSplit,
  deleteTransfer,
  distributeExisting,
  DISTRIBUTION_TEMPLATE,
  getDistribution,
  saveDistribution,
} from '@/services/finance';
import { confirmDialog, errorMessage, toast } from '@/store/ui';
import { useSettings } from '@/store/settings';
import { getIcon } from '@/utils/icons';
import { uuid, cn } from '@/utils/misc';
import { accountBalances } from '@/utils/stats';
import { parseAmountInput } from '@/utils/keypad';
import { minorToInput } from '@/utils/money';
import type { Account, SplitRule } from '@/types';
import { PageHeader, Skeleton, Switch } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { MoneyInput } from '@/components/MoneyInput';
import { Amount } from '@/components/Amount';

const EXAMPLE = 100_000_00; // 100 000 so‘m

type SaveState = 'idle' | 'saving' | 'saved' | 'invalid';

/** Pulni foizlar bo‘yicha taqsimlash: avtomatik (har bir daromadda) yoki qo‘lda (mavjud pulni) */
export default function Distribution() {
  const saved = useLiveQuery(() => getDistribution(), []);
  const { list: accounts, map: accMap } = useAccounts();
  const { money } = useFormat();
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<SplitRule[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [manualOpen, setManualOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!saved || loaded.current) return;
    loaded.current = true;
    setEnabled(saved.enabled);
    setRules(saved.rules);
  }, [saved]);

  const sum = rules.reduce((s, r) => s + r.percent, 0);
  const invalidReason = sum > 100 ? `Jami ${sum}% — 100% dan oshmasligi kerak` : rules.some((r) => !r.name.trim()) ? 'Har bir qismga nom bering' : '';
  const example = useMemo(() => computeSplit(EXAMPLE, rules, '__source__'), [rules]);

  // O‘zgarishlar avtomatik saqlanadi (alohida “Saqlash” tugmasi shart emas)
  useEffect(() => {
    if (!loaded.current || !saved) return;
    const same = saved.enabled === (enabled && rules.length > 0) && JSON.stringify(saved.rules) === JSON.stringify(rules);
    if (same) {
      // Saqlangan holat bilan bir xil — kutilayotgan saqlash bo‘lsa ham, u endi kerak emas
      setSaveState((st) => (st === 'idle' ? 'idle' : 'saved'));
      return;
    }
    if (invalidReason) {
      setSaveState('invalid');
      return;
    }
    setSaveState('saving');
    const t = window.setTimeout(() => {
      saveDistribution({ enabled, rules })
        .then(() => setSaveState('saved'))
        .catch((e) => {
          setSaveState('invalid');
          toast.error('Saqlab bo‘lmadi', errorMessage(e));
        });
    }, 450);
    return () => window.clearTimeout(t);
  }, [enabled, rules, saved, invalidReason]);

  const update = (id: string, patch: Partial<SplitRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function applyTemplate() {
    if (rules.length) {
      const ok = await confirmDialog({
        title: 'Tavsiya etilgan reja',
        message: 'Hozirgi qismlar 20% · 40% · 10% · 5% · 5% rejasi bilan almashtiriladi. Kerakli hisoblar (Uy uchun, Investitsiya, …) yaratiladi.',
        confirmLabel: 'Qo‘llash',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const cfg = await applyDistributionTemplate();
      setEnabled(cfg.enabled);
      setRules(cfg.rules);
      toast.success('Reja qo‘llandi', '5 ta hisob tayyor. Foizlarni o‘zingizga moslang.');
    } catch (e) {
      toast.error('Xatolik', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function addRule() {
    const used = new Set(rules.map((r) => r.accountId));
    const acc = accounts?.find((a) => !used.has(a.id)) ?? accounts?.[0];
    if (!acc) return;
    setRules((rs) => [...rs, { id: uuid(), name: acc.name, percent: Math.max(0, Math.min(10, 100 - sum)), accountId: acc.id }]);
  }

  if (!saved || !accounts) {
    return (
      <div>
        <PageHeader title="Daromadni taqsimlash" info="distribution" />
        <Skeleton className="mx-auto h-60 max-w-xl rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <PageHeader title="Daromadni taqsimlash" info="distribution" />
      <div className="mx-auto max-w-xl space-y-4">
        {/* Qisqa tushuntirish */}
        <section className="hero-bg relative overflow-hidden rounded-[1.75rem] p-5 text-white">
          <div aria-hidden className="hero-rings pointer-events-none absolute inset-0" />
          <h2 className="relative text-[19px] font-bold leading-snug tracking-tight">Pulingizni maqsadlarga bo‘ling</h2>
          <p className="relative mt-1 text-[14px] leading-relaxed text-white/85">
            Foizlarni bir marta belgilang. Keyin pul o‘zi kerakli hisoblarga o‘tadi — har bir daromadda avtomatik yoki o‘zingiz xohlagan paytda.
          </p>
          <ol className="relative mt-4 grid grid-cols-2 gap-2 text-[12.5px] font-semibold">
            <li className="rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-inset ring-white/15">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">1-qadam</span>
              Foizlarni belgilang
            </li>
            <li className="rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-inset ring-white/15">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">2-qadam</span>
              Avto yoki qo‘lda bo‘ling
            </li>
          </ol>
        </section>

        {rules.length === 0 ? (
          <section className="card text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <Sparkles size={26} />
            </span>
            <h2 className="mt-3 text-[18px] font-bold text-ink">Rejangizni tuzing</h2>
            <p className="mx-auto mt-1 max-w-sm text-[14px] leading-relaxed text-muted">
              Tavsiya etilgan reja: {DISTRIBUTION_TEMPLATE.map((t) => `${t.name.toLowerCase()} ${t.percent}%`).join(', ')}. Hisoblar avtomatik yaratiladi, foizlarni keyin o‘zgartirasiz.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button className="btn btn-primary h-12 rounded-full px-6" onClick={() => void applyTemplate()} disabled={busy}>
                <Wand2 size={18} /> Tavsiya etilgan rejani qo‘llash
              </button>
              <button className="btn btn-secondary h-12 rounded-full px-6" onClick={addRule}>
                <Plus size={18} /> O‘zim sozlayman
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* 1. Reja */}
            <section className="card !px-3.5" aria-labelledby="plan-title">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 id="plan-title" className="flex items-center gap-2 text-[16px] font-bold text-ink">
                  <StepBadge n={1} /> Foizlar
                </h2>
                <SaveBadge state={saveState} />
              </div>

              <div className="mt-3 flex h-3.5 w-full overflow-hidden rounded-full bg-surface-2 px-0" role="img" aria-label={`Jami ${sum}% taqsimlanadi`}>
                {rules.map((r) => (
                  <span key={r.id} className="h-full transition-[width] duration-300" style={{ width: `${Math.min(r.percent, 100)}%`, background: accMap.get(r.accountId)?.color ?? '#94a3b8' }} />
                ))}
              </div>
              <p className={cn('mt-2 px-1 text-[13px]', sum > 100 ? 'font-semibold text-expense' : 'text-muted')} data-testid="dist-sum">
                {sum > 100 ? `Jami ${sum}% — 100% dan oshmasligi kerak` : `Jami ${sum}% bo‘linadi${sum < 100 ? ` · qolgan ${100 - sum}% pul tushgan hisobda qoladi` : ''}`}
              </p>

              <ul className="mt-3 divide-y divide-line/60">
                {rules.map((r) => {
                  const acc = accMap.get(r.accountId);
                  const Icon = getIcon(acc?.icon ?? 'wallet');
                  const ex = example.find((p) => p.rule.id === r.id)?.amount ?? 0;
                  return (
                    <li key={r.id} className="py-3 first:pt-1 last:pb-1" data-rule={r.name}>
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white" style={{ background: acc?.color ?? '#94a3b8' }}>
                          <Icon size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <input
                            className="w-full rounded-lg bg-transparent px-1 py-0.5 text-[16px] font-semibold text-ink outline-none ring-accent/40 focus:bg-surface-2 focus:ring-2"
                            value={r.name}
                            maxLength={32}
                            onChange={(e) => update(r.id, { name: e.target.value })}
                            aria-label="Qism nomi"
                          />
                          <label className="mt-0.5 flex items-center gap-1 px-1 text-[13px] text-muted">
                            <span className="shrink-0">Hisobga:</span>
                            <select
                              className="min-w-0 max-w-full cursor-pointer truncate rounded-md bg-transparent font-semibold text-accent outline-none"
                              value={r.accountId}
                              onChange={(e) => update(r.id, { accountId: e.target.value })}
                              aria-label={`${r.name} — hisob`}
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <button className="icon-btn h-9 w-9 shrink-0 text-subtle hover:bg-expense/10 hover:text-expense" onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))} aria-label={`${r.name} — o‘chirish`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 pl-[3.25rem]">
                        <Stepper value={r.percent} onChange={(v) => update(r.id, { percent: v })} label={r.name} />
                        <span className="text-right text-[12px] leading-tight text-subtle">
                          100 000 dan
                          <span className="block text-[14px] font-semibold text-ink tabular">{money(ex)}</span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-2 flex gap-2">
                <button className="btn btn-secondary h-11 flex-1 rounded-full" onClick={addRule}>
                  <Plus size={17} /> Qism qo‘shish
                </button>
                <button className="btn btn-ghost h-11 rounded-full" onClick={() => void applyTemplate()} disabled={busy}>
                  <Wand2 size={17} /> Tavsiya
                </button>
              </div>
            </section>

            {/* 2. Qanday bo‘linadi */}
            <section aria-labelledby="how-title" className="space-y-3">
              <h2 id="how-title" className="flex items-center gap-2 px-1 text-[16px] font-bold text-ink">
                <StepBadge n={2} /> Qanday bo‘linsin?
              </h2>

              <div className={cn('card !p-4 ring-2 ring-inset transition-colors', enabled ? 'ring-accent/60' : 'ring-transparent')}>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <Zap size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Switch
                      checked={enabled}
                      onChange={setEnabled}
                      label="Avtomatik — har bir daromadda"
                      description="Daromad qo‘shganingizda foizlar o‘zi hisoblarga o‘tkaziladi"
                      disabled={!rules.length}
                    />
                  </div>
                </div>
                {example.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-[13px]">
                    <p className="font-medium text-muted">Masalan, {money(EXAMPLE)} oylik tushsa:</p>
                    <ul className="mt-1.5 space-y-1">
                      {example.map((p) => (
                        <li key={p.rule.id} className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accMap.get(p.rule.accountId)?.color }} />
                            <span className="truncate text-ink">{p.rule.name}</span>
                          </span>
                          <span className="tabular font-semibold text-ink">{money(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="card !p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-income/15 text-income">
                    <HandCoins size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-ink">Qo‘lda — mavjud pulni hozir bo‘lish</p>
                    <p className="mt-0.5 text-[13px] text-muted">Kartadagi yoki naqddagi pulni o‘zingiz tanlagan summada bir bosishda bo‘ling.</p>
                  </div>
                </div>
                <button
                  className="btn btn-primary mt-3 h-12 w-full rounded-full text-[15px]"
                  onClick={() => setManualOpen(true)}
                  disabled={sum > 100 || sum === 0}
                  data-testid="dist-manual"
                >
                  <HandCoins size={18} /> Mavjud pulni bo‘lish
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      {manualOpen && <ManualSplit open={manualOpen} onClose={() => setManualOpen(false)} rules={rules} accounts={accounts} />}
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[12px] font-bold text-accent-ink">{n}</span>;
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'saving')
    return (
      <span className="flex items-center gap-1 text-[12px] font-medium text-subtle">
        <Loader2 size={13} className="animate-spin" /> Saqlanmoqda
      </span>
    );
  if (state === 'saved')
    return (
      <span className="flex items-center gap-1 text-[12px] font-semibold text-income" data-testid="dist-saved">
        <Check size={14} /> Saqlandi
      </span>
    );
  if (state === 'invalid') return <span className="text-[12px] font-semibold text-expense">Saqlanmadi</span>;
  return null;
}

/** Mavjud pulni qo‘lda bo‘lish oynasi */
function ManualSplit({ open, onClose, rules, accounts }: { open: boolean; onClose: () => void; rules: SplitRule[]; accounts: Account[] }) {
  const txs = useTransactions();
  const transfers = useTransfers();
  const numberFormat = useSettings((s) => s.numberFormat);
  const { money } = useFormat();
  const balances = useMemo(() => (txs && transfers ? accountBalances(accounts, txs, transfers) : null), [accounts, txs, transfers]);
  const targets = useMemo(() => new Set(rules.map((r) => r.accountId)), [rules]);

  // Standart manba: qoidalarda ishtirok etmaydigan, eng ko‘p puli bor hisob
  const [fromId, setFromId] = useState('');
  useEffect(() => {
    if (fromId || !balances) return;
    const pool = accounts.filter((a) => !targets.has(a.id));
    const best = (pool.length ? pool : accounts).reduce<Account | null>((b, a) => (!b || (balances.get(a.id) ?? 0) > (balances.get(b.id) ?? 0) ? a : b), null);
    if (best) setFromId(best.id);
  }, [balances, accounts, targets, fromId]);

  const balance = balances?.get(fromId) ?? 0;
  const [amount, setAmount] = useState('');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(rules.filter((r) => r.percent > 0).map((r) => r.id)));
  const [busy, setBusy] = useState(false);

  // Hisob tanlanganda summa — butun qoldiq
  useEffect(() => {
    if (fromId && balances) setAmount(balance > 0 ? minorToInput(balance, numberFormat) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, balances !== null]);

  const parsed = amount.trim() ? parseAmountInput(amount, numberFormat) : null;
  const value = parsed?.ok ? parsed.value : 0;
  const parts = useMemo(() => computeSplit(value, rules.filter((r) => picked.has(r.id)), fromId), [value, rules, picked, fromId]);
  const total = parts.reduce((s, p) => s + p.amount, 0);
  const over = value > balance;
  const error = parsed && !parsed.ok ? parsed.error : over ? `Bu hisobda faqat ${money(Math.max(balance, 0))} bor` : '';

  async function submit() {
    if (!value || error || !parts.length) return;
    setBusy(true);
    try {
      const rows = await distributeExisting({ fromId, amount: value, ruleIds: [...picked] });
      onClose();
      toast.success(`${rows.length} ta hisobga bo‘lindi`, money(rows.reduce((s, r) => s + r.amount, 0)), {
        label: 'Bekor qilish',
        onClick: () => void Promise.all(rows.map((r) => deleteTransfer(r.id))).then(() => toast.info('Taqsimot bekor qilindi')),
      });
    } catch (e) {
      toast.error('Bo‘lib bo‘lmadi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mavjud pulni bo‘lish"
      description="Tanlangan hisobdan foizlar bo‘yicha o‘tkaziladi"
      footer={
        <button className="btn btn-primary h-12 w-full rounded-full text-[15px]" onClick={() => void submit()} disabled={busy || !value || !!error || !parts.length} data-testid="manual-submit">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <HandCoins size={18} />}
          {total > 0 && !error ? `${money(total)} ni bo‘lish` : 'Bo‘lish'}
        </button>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="label">Qaysi hisobdan</span>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Qaysi hisobdan">
            {accounts.map((a) => {
              const Icon = getIcon(a.icon);
              const on = a.id === fromId;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFromId(a.id)}
                  className={cn('flex shrink-0 items-center gap-2 rounded-2xl border py-2 pl-2 pr-3 text-left transition-colors', on ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:bg-surface-2')}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl text-white" style={{ background: a.color }}>
                    <Icon size={16} />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[12px] text-muted">{a.name}</span>
                    <span className="block whitespace-nowrap text-[14px] font-bold text-ink">
                      <Amount value={balances?.get(a.id) ?? 0} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="ms-amount" className="label">Qancha bo‘linsin</label>
          <MoneyInput id="ms-amount" value={amount} onChange={setAmount} large error={!!error} />
          <div className="mt-2 flex gap-2">
            {[
              { label: 'Hammasi', v: balance },
              { label: 'Yarmi', v: Math.floor(balance / 2) },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                className="btn btn-secondary btn-sm rounded-full"
                disabled={q.v <= 0}
                onClick={() => setAmount(minorToInput(q.v, numberFormat))}
              >
                {q.label}
              </button>
            ))}
          </div>
          {error && <p className="mt-1.5 text-[13px] text-expense" role="alert">{error}</p>}
        </div>

        <div>
          <span className="label">Qaysi qismlarga</span>
          <ul className="space-y-1.5">
            {rules.map((r) => {
              const acc = accounts.find((a) => a.id === r.accountId);
              const same = r.accountId === fromId;
              const on = picked.has(r.id) && !same;
              const part = parts.find((p) => p.rule.id === r.id)?.amount ?? 0;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={same || r.percent === 0}
                    onClick={() =>
                      setPicked((s) => {
                        const n = new Set(s);
                        if (n.has(r.id)) n.delete(r.id);
                        else n.add(r.id);
                        return n;
                      })
                    }
                    className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors', on ? 'bg-surface-2' : 'opacity-60 hover:bg-surface-2/60')}
                  >
                    {on ? <CheckCircle2 size={20} className="shrink-0 text-accent" /> : <Circle size={20} className="shrink-0 text-subtle" />}
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: acc?.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">
                        {r.name} <span className="text-[12px] font-normal text-subtle">{r.percent}%</span>
                      </span>
                      <span className="block truncate text-[12px] text-muted">{same ? 'Shu hisobning o‘zi — o‘tkazilmaydi' : `→ ${acc?.name ?? '—'}`}</span>
                    </span>
                    <span className="tabular shrink-0 text-[15px] font-semibold text-ink">{on ? money(part) : '—'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {value > 0 && !error && (
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-income/10 px-3.5 py-2.5 text-[13.5px]">
              <span className="text-muted">Hisobda qoladi</span>
              <span className="tabular font-bold text-ink">{money(balance - total)}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Foiz tanlash: − / + (bosib tursangiz tez o‘zgaradi) */
function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const timer = useRef<number | null>(null);
  const valRef = useRef(value);
  valRef.current = value;
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };
  const start = (d: number) => {
    const step = () => onChange(Math.max(0, Math.min(100, valRef.current + d)));
    step();
    stop();
    const delay = window.setTimeout(() => {
      timer.current = window.setInterval(step, 70);
    }, 380);
    timer.current = delay;
  };
  useEffect(() => stop, []);
  const btn = 'grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-ink transition-transform active:scale-90 touch-manipulation';
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`${label} foizi`}>
      <button type="button" className={btn} onPointerDown={() => start(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => e.key === 'Enter' && onChange(Math.max(0, value - 1))} aria-label="Kamaytirish">
        <Minus size={17} />
      </button>
      <span className="w-14 text-center text-[18px] font-bold tabular text-ink" aria-live="polite">{value}%</span>
      <button type="button" className={btn} onPointerDown={() => start(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => e.key === 'Enter' && onChange(Math.min(100, value + 1))} aria-label="Oshirish">
        <Plus size={17} />
      </button>
    </div>
  );
}
