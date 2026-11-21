import type { TooltipProps } from 'recharts';
import { useFormat } from '@/hooks/useFormat';

const NAMES: Record<string, string> = { income: 'Daromad', expense: 'Xarajat', net: 'Sof natija' };

/** Barcha grafiklar uchun yagona tooltip: rang belgisi + nom + qiymat (matn rangi — oddiy) */
export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  const { money } = useFormat();
  if (!active || !payload?.length) return null;
  const full = (payload[0]?.payload as { fullLabel?: string })?.fullLabel ?? label;
  return (
    <div className="rounded-xl border border-line/80 bg-surface/95 backdrop-blur px-3 py-2 shadow-lift text-[13px] min-w-[150px]">
      <p className="mb-1 font-semibold text-ink">{full}</p>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: (p.payload as Record<string, string>)?.[`${String(p.dataKey)}Color`] ?? p.color }} />
            {NAMES[String(p.dataKey)] ?? p.name}
          </span>
          <span className="tabular font-semibold text-ink">{money(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
          {i.value && <span className="tabular font-semibold text-ink">{i.value}</span>}
        </span>
      ))}
    </div>
  );
}
