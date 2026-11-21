import type { CategorySlice } from '@/utils/stats';

/**
 * Tahlil donut’i: yumaloq uchli segmentlar orasida bo‘shliq, markazda jami summa.
 * Segmentga bosilsa — tanlanadi (qolganlari xiralashadi).
 */
export function BreakdownDonut({
  slices,
  selected,
  onSelect,
  children,
}: {
  slices: CategorySlice[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const R = 40;
  const W = 7;
  const C = 2 * Math.PI * R;
  const total = slices.reduce((s, x) => s + x.total, 0);
  // Yumaloq uchlar segment tashqarisiga chiqadi — bo‘shliq shuni hisobga oladi
  const gap = slices.length > 1 ? W + 2.5 : 0;
  let acc = 0;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]" style={{ containerType: 'inline-size' }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" role="img" aria-label="Kategoriyalar bo‘yicha taqsimot">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(var(--surface-2))" strokeWidth={W} />
        {slices.map((s) => {
          const len = (s.total / (total || 1)) * C;
          const dash = Math.max(0.01, len - gap);
          const off = acc + gap / 2;
          acc += len;
          const active = selected === s.categoryId;
          return (
            <circle
              key={s.categoryId}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active ? W + 2 : W}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-off}
              opacity={selected && !active ? 0.3 : 1}
              className="cursor-pointer transition-[opacity,stroke-width] duration-200"
              style={{ pointerEvents: 'stroke' }}
              data-slice={s.categoryId}
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
      <div className="absolute inset-[16%] flex items-center justify-center rounded-full text-center">{children}</div>
    </div>
  );
}
