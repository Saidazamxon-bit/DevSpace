import { useMemo } from 'react';
import type { Category } from '@/types';
import type { CategorySlice } from '@/utils/stats';
import { getIcon } from '@/utils/icons';
import { cn } from '@/utils/misc';

/**
 * Bosh ekrandagi katta donut: xarajat kategoriyalari ulushlari va atrofida kategoriya ikonkalari.
 *  - Ikonkaga bosish → shu kategoriyaga tez qo‘shish (onIconClick).
 *  - Segmentga bosish → kategoriya tanlanadi, ma’lumoti markazda ko‘rsatiladi (onSelect).
 * Recharts o‘rniga yengil SVG — bundle kichik va animatsiya silliq.
 */
export function DonutRing({
  slices,
  icons,
  totals,
  selected,
  onSelect,
  onIconClick,
  center,
}: {
  slices: CategorySlice[];
  icons: Category[];
  totals: Map<string, number>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onIconClick: (c: Category) => void;
  center: React.ReactNode;
}) {
  const R = 31; // donut radiusi (viewBox 100)
  const W = 5.5; // chiziq qalinligi
  const C = 2 * Math.PI * R;
  const total = slices.reduce((s, x) => s + x.total, 0);

  const segments = useMemo(() => {
    const gap = slices.length > 1 ? 0.9 : 0;
    let start = 0;
    return slices.map((s) => {
      const len = (s.total / (total || 1)) * C;
      const seg = { ...s, dash: Math.max(0.4, len - gap), offset: start };
      start += len;
      return seg;
    });
  }, [slices, total, C]);

  const n = icons.length;

  return (
    <div className="relative mx-auto aspect-square w-full select-none" style={{ maxWidth: 'min(400px, 46dvh)', containerType: 'inline-size' }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="Xarajatlar kategoriyalar bo‘yicha">
        {/* Fon halqasi */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(var(--surface-2))" strokeWidth={W} />
        {segments.map((s) => {
          const active = selected === s.categoryId;
          const dim = selected !== null && !active;
          return (
            <circle
              key={s.categoryId}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active ? W + 2.2 : W}
              strokeDasharray={`${s.dash} ${C - s.dash}`}
              strokeDashoffset={-s.offset}
              transform="rotate(-90 50 50)"
              opacity={dim ? 0.3 : 1}
              className="cursor-pointer transition-[stroke-width,opacity] duration-200"
              style={{ pointerEvents: 'stroke' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(active ? null : s.categoryId);
              }}
            >
              <title>{`${s.name}: ${s.percent.toFixed(1)}%`}</title>
            </circle>
          );
        })}
      </svg>

      {/* Atrofdagi kategoriya ikonkalari */}
      {icons.map((c, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + 43.5 * Math.cos(angle);
        const y = 50 + 43.5 * Math.sin(angle);
        const Icon = getIcon(c.icon);
        const spent = totals.get(c.id) ?? 0;
        const active = selected === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onIconClick(c)}
            aria-label={`${c.name} — xarajat qo‘shish`}
            title={c.name}
            data-cat-icon={c.id}
            className={cn(
              'absolute grid aspect-square w-[12.5%] min-w-[40px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-all duration-200 active:scale-90 hover:scale-105',
              active && 'ring-[3px] ring-offset-2 ring-offset-bg',
            )}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: spent > 0 ? c.color : `${c.color}1f`,
              color: spent > 0 ? '#fff' : c.color,
              ['--tw-ring-color' as string]: c.color,
            }}
          >
            <Icon size={20} strokeWidth={2.1} />
          </button>
        );
      })}

      {/* Markaz */}
      <div className="absolute left-1/2 top-1/2 flex aspect-square w-[54%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center">
        {center}
      </div>
    </div>
  );
}
