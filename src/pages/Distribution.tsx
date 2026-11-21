import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAccounts } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { applyDistributionTemplate, computeSplit, DISTRIBUTION_TEMPLATE, getDistribution, saveDistribution } from '@/services/finance';
import { confirmDialog, errorMessage, toast } from '@/store/ui';
import { getIcon } from '@/utils/icons';
import { uuid, cn } from '@/utils/misc';
import type { SplitRule } from '@/types';
import { PageHeader, Skeleton, Switch } from '@/components/ui/primitives';

const EXAMPLE = 100_000_00; // 100 000 so‘m

/** Daromadni avtomatik taqsimlash qoidalari */
export default function Distribution() {
  const saved = useLiveQuery(() => getDistribution(), []);
  const { list: accounts, map: accMap } = useAccounts();
  const { money } = useFormat();
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<SplitRule[]>([]);
  const [busy, setBusy] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!saved || loaded.current) return;
    loaded.current = true;
    setEnabled(saved.enabled);
    setRules(saved.rules);
  }, [saved]);

  const sum = rules.reduce((s, r) => s + r.percent, 0);
  const dirty = !!saved && (saved.enabled !== enabled || JSON.stringify(saved.rules) !== JSON.stringify(rules));
  const example = useMemo(() => computeSplit(EXAMPLE, rules, '__source__'), [rules]);
  const exampleRest = EXAMPLE - example.reduce((s, p) => s + p.amount, 0);

  const update = (id: string, patch: Partial<SplitRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function save(next?: { enabled: boolean; rules: SplitRule[] }) {
    setBusy(true);
    try {
      await saveDistribution(next ?? { enabled, rules });
      toast.success('Taqsimlash saqlandi', (next ?? { enabled }).enabled ? 'Endi har bir daromad avtomatik bo‘linadi.' : 'Avtomatik taqsimlash o‘chirilgan.');
      loaded.current = false;
    } catch (e) {
      toast.error('Saqlab bo‘lmadi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function applyTemplate() {
    if (rules.length) {
      const ok = await confirmDialog({
        title: 'Tavsiya etilgan reja',
        message: 'Hozirgi qoidalar 20% · 40% · 10% · 5% · 5% rejasi bilan almashtiriladi. Kerakli hisoblar (Uy uchun, Investitsiya, …) yaratiladi.',
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
        {/* Holat va umumiy ko‘rinish */}
        <section className="card">
          <Switch
            checked={enabled}
            onChange={(v) => {
              setEnabled(v);
              if (!dirty) void save({ enabled: v, rules });
            }}
            label="Avtomatik taqsimlash"
            description="Daromad qo‘shilishi bilan foizlar bo‘yicha hisoblarga o‘tkaziladi"
            disabled={!rules.length}
          />
          {rules.length > 0 && (
            <>
              <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`Jami ${sum}% taqsimlanadi`}>
                {rules.map((r) => (
                  <span key={r.id} className="h-full transition-[width] duration-300" style={{ width: `${r.percent}%`, background: accMap.get(r.accountId)?.color ?? '#94a3b8' }} />
                ))}
              </div>
              <p className={cn('mt-2 text-[13px]', sum > 100 ? 'font-semibold text-expense' : 'text-muted')} data-testid="dist-sum">
                {sum > 100 ? `Jami ${sum}% — 100% dan oshmasligi kerak` : `Jami ${sum}% taqsimlanadi${sum < 100 ? ` · qolgan ${100 - sum}% daromad tushgan hisobda qoladi` : ''}`}
              </p>
            </>
          )}
        </section>

        {rules.length === 0 ? (
          <section className="card text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <Sparkles size={26} />
            </span>
            <h2 className="mt-3 text-[18px] font-bold text-ink">Daromadni darhol bo‘lib qo‘ying</h2>
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
            {/* Qoidalar */}
            <section className="space-y-2" aria-label="Qoidalar">
              {rules.map((r) => {
                const acc = accMap.get(r.accountId);
                const Icon = getIcon(acc?.icon ?? 'wallet');
                return (
                  <div key={r.id} className="card !p-3.5" data-rule={r.name}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: acc?.color ?? '#94a3b8' }}>
                        <Icon size={20} />
                      </span>
                      <input
                        className="input h-10 min-w-0 flex-1 border-transparent bg-surface-2 font-semibold"
                        value={r.name}
                        maxLength={32}
                        onChange={(e) => update(r.id, { name: e.target.value })}
                        aria-label="Qoida nomi"
                      />
                      <button className="icon-btn h-9 w-9 hover:bg-expense/10 hover:text-expense" onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))} aria-label={`${r.name} — o‘chirish`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Stepper value={r.percent} onChange={(v) => update(r.id, { percent: v })} label={r.name} />
                      <select
                        className="input h-11 min-w-0 flex-1 text-sm"
                        value={r.accountId}
                        onChange={(e) => update(r.id, { accountId: e.target.value })}
                        aria-label={`${r.name} — hisob`}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>→ {a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <button className="btn btn-secondary h-11 flex-1 rounded-full" onClick={addRule}>
                  <Plus size={17} /> Qoida qo‘shish
                </button>
                <button className="btn btn-ghost h-11 rounded-full" onClick={() => void applyTemplate()} disabled={busy}>
                  <Wand2 size={17} /> Tavsiya
                </button>
              </div>
            </section>

            {/* Misol */}
            <section className="card" aria-labelledby="ex-title">
              <h2 id="ex-title" className="text-[13px] font-medium text-muted">
                Misol: {money(EXAMPLE)} daromad
              </h2>
              <ul className="mt-2 space-y-1.5">
                {example.map((p) => (
                  <li key={p.rule.id} className="flex items-center justify-between gap-2 text-[15px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accMap.get(p.rule.accountId)?.color }} />
                      <span className="truncate text-ink">{p.rule.name}</span>
                      <span className="text-[12px] text-subtle">{p.rule.percent}%</span>
                    </span>
                    <span className="tabular font-semibold text-ink">{money(p.amount)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-2 border-t border-line/60 pt-1.5 text-[14px] text-muted">
                  <span>Daromad tushgan hisobda qoladi</span>
                  <span className="tabular font-semibold">{money(exampleRest)}</span>
                </li>
              </ul>
            </section>

            <button className="btn btn-primary h-12 w-full rounded-full text-[15px]" onClick={() => void save()} disabled={busy || sum > 100 || !dirty} data-testid="dist-save">
              {dirty ? 'Saqlash' : 'Saqlangan'}
            </button>
          </>
        )}
      </div>
    </div>
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
  const btn = 'grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink transition-transform active:scale-90 touch-manipulation';
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`${label} foizi`}>
      <button type="button" className={btn} onPointerDown={() => start(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => e.key === 'Enter' && onChange(Math.max(0, value - 1))} aria-label="Kamaytirish">
        <Minus size={18} />
      </button>
      <span className="w-14 text-center text-[18px] font-bold tabular text-ink" aria-live="polite">{value}%</span>
      <button type="button" className={btn} onPointerDown={() => start(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => e.key === 'Enter' && onChange(Math.min(100, value + 1))} aria-label="Oshirish">
        <Plus size={18} />
      </button>
    </div>
  );
}
