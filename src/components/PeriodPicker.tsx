import type { DateRange, PeriodPreset } from '@/types';
import { PERIOD_LABELS } from '@/utils/date';
import { cn } from '@/utils/misc';

const PRESETS: PeriodPreset[] = ['today', 'week', 'month', 'year', 'custom'];

export function PeriodPicker({
  preset,
  onPreset,
  custom,
  onCustom,
  className,
}: {
  preset: PeriodPreset;
  onPreset: (p: PeriodPreset) => void;
  custom: DateRange;
  onCustom: (r: DateRange) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div role="radiogroup" aria-label="Davr" className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preset === p}
            onClick={() => onPreset(p)}
            className={cn('chip', preset === p && 'chip-active')}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
          <input
            type="date"
            aria-label="Boshlanish sanasi"
            className="input h-9 w-auto min-w-0 flex-1 sm:flex-none text-sm"
            value={custom.from}
            max={custom.to}
            onChange={(e) => e.target.value && onCustom({ ...custom, from: e.target.value })}
          />
          <span className="text-subtle">—</span>
          <input
            type="date"
            aria-label="Tugash sanasi"
            className="input h-9 w-auto min-w-0 flex-1 sm:flex-none text-sm"
            value={custom.to}
            min={custom.from}
            onChange={(e) => e.target.value && onCustom({ ...custom, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
