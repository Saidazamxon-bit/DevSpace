import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateRange, PeriodPreset } from '@/types';
import { describeRange, PERIOD_LABELS } from '@/utils/date';
import { useSettings } from '@/store/settings';
import { cn } from '@/utils/misc';

/** Davr tanlash: Bugun · Kecha · Shu hafta · Shu oy · Maxsus (+ ‹ › bilan oldingi/keyingi davr) */
export function PeriodBar({
  preset,
  range,
  custom,
  onPreset,
  onShift,
  onCustom,
  allowAll,
}: {
  preset: PeriodPreset;
  range: DateRange;
  custom: DateRange;
  onPreset: (p: PeriodPreset) => void;
  onShift: (n: number) => void;
  onCustom: (r: DateRange) => void;
  allowAll?: boolean;
}) {
  const dateFormat = useSettings((s) => s.dateFormat);
  const presets: PeriodPreset[] = ['today', 'yesterday', 'week', 'month', 'custom', ...(allowAll ? (['all'] as const) : [])];
  const canShift = preset !== 'custom' && preset !== 'all';

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="Davr"
        className={cn('mx-auto grid max-w-md gap-1 sm:flex sm:max-w-none sm:justify-center sm:gap-1.5', allowAll ? 'grid-cols-3' : 'grid-cols-5')}
      >
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preset === p}
            onClick={() => onPreset(p)}
            className={cn(
              'h-8 whitespace-nowrap rounded-full px-1 text-[12.5px] font-semibold transition-colors sm:px-3 sm:text-[13px]',
              preset === p ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-ink',
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="flex items-center justify-center gap-2 animate-fade-in">
          <input
            type="date"
            aria-label="Boshlanish sanasi"
            className="input h-9 w-[44%] max-w-40 text-sm"
            value={custom.from}
            max={custom.to}
            onChange={(e) => e.target.value && onCustom({ ...custom, from: e.target.value })}
          />
          <span className="text-subtle">—</span>
          <input
            type="date"
            aria-label="Tugash sanasi"
            className="input h-9 w-[44%] max-w-40 text-sm"
            value={custom.to}
            min={custom.from}
            onChange={(e) => e.target.value && onCustom({ ...custom, to: e.target.value })}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1">
          {canShift && (
            <button type="button" className="icon-btn h-8 w-8" onClick={() => onShift(-1)} aria-label="Oldingi davr">
              <ChevronLeft size={18} />
            </button>
          )}
          <p className="min-w-[150px] text-center text-sm font-semibold text-ink first-letter:uppercase" aria-live="polite">
            {describeRange(preset, range, dateFormat)}
          </p>
          {canShift && (
            <button type="button" className="icon-btn h-8 w-8" onClick={() => onShift(1)} aria-label="Keyingi davr">
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
