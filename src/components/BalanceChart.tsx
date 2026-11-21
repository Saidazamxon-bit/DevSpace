import { useMemo, useRef, useState } from 'react';
import type { BalancePoint } from '@/utils/stats';
import { formatAxis } from '@/utils/money';
import { cn } from '@/utils/misc';

/**
 * Jami mablag‘ chiziqli grafigi (SVG, kutubxonasiz).
 * Barmoq/sichqoncha bilan yurgizilganda tanlangan nuqta `onHover` orqali yuqoriga uzatiladi.
 */
export function BalanceChart({
  points,
  onHover,
  className,
}: {
  points: BalancePoint[];
  onHover?: (p: BalancePoint | null) => void;
  className?: string;
}) {
  const W = 320;
  const H = 130;
  const PAD_R = 34; // o‘ng tomonda o‘q yozuvlari uchun joy
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (points.length === 0) return null;
    const vals = points.map((p) => p.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (min === max) {
      // Tekis chiziq (masalan, hammasi 0): o‘qda ma’noli yaxlit qiymatlar bo‘lsin
      const pad = Math.max(Math.abs(min) * 0.1, 1000_00);
      min -= pad;
      max += pad;
    }
    // O‘q yozuvlari: haqiqiy eng katta, o‘rta va eng kichik qiymat
    const ticks = [max, (max + min) / 2, min];
    const span = max - min;
    min -= span * 0.12;
    max += span * 0.12;
    const x = (i: number) => (points.length === 1 ? (W - PAD_R) / 2 : (i / (points.length - 1)) * (W - PAD_R - 6) + 3);
    const y = (v: number) => H - 8 - ((v - min) / (max - min)) * (H - 16);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    return { x, y, d, ticks };
  }, [points]);

  if (!geo) return <div className={cn('h-[130px]', className)} />;

  const last = points.length - 1;
  const hi = hover ?? last;

  function move(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rel = ((clientX - r.left) / r.width) * W;
    const i = Math.round(((rel - 3) / (W - PAD_R - 6)) * (points.length - 1));
    const idx = Math.max(0, Math.min(last, i));
    setHover(idx);
    onHover?.(points[idx]);
  }
  function leave() {
    setHover(null);
    onHover?.(null);
  }

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className={cn('w-full touch-pan-y select-none overflow-visible', className)}
      role="img"
      aria-label="Jami mablag‘ o‘zgarishi grafigi"
      onPointerMove={(e) => move(e.clientX)}
      onPointerDown={(e) => move(e.clientX)}
      onPointerLeave={leave}
      onPointerUp={(e) => e.pointerType !== 'mouse' && leave()}
    >
      {geo.ticks.map((t, i) => (
        <g key={i}>
          <line x1="0" x2={W - PAD_R} y1={geo.y(t)} y2={geo.y(t)} stroke="rgb(var(--line))" strokeDasharray="2 4" strokeWidth="0.8" />
          <text x={W - PAD_R + 6} y={geo.y(t) + 3.5} fontSize="9.5" fill="rgb(var(--subtle))">
            {formatAxis(t)}
          </text>
        </g>
      ))}
      <path d={geo.d} fill="none" stroke="rgb(var(--accent) / 0.35)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Oxirgi qism — to‘q rangda (rasmdagidek) */}
      <path
        d={points
          .map((p, i) => ({ p, i }))
          .filter(({ i }) => i >= Math.floor(last * 0.75))
          .map(({ p, i }, k) => `${k ? 'L' : 'M'}${geo.x(i).toFixed(1)},${geo.y(p.value).toFixed(1)}`)
          .join(' ')}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {hover !== null && <line x1={geo.x(hi)} x2={geo.x(hi)} y1="4" y2={H - 4} stroke="rgb(var(--subtle))" strokeWidth="0.8" strokeDasharray="3 3" />}
      <circle cx={geo.x(hi)} cy={geo.y(points[hi].value)} r="6" fill="rgb(var(--accent) / 0.25)" />
      <circle cx={geo.x(hi)} cy={geo.y(points[hi].value)} r="3.4" fill="rgb(var(--accent))" stroke="rgb(var(--surface))" strokeWidth="1.5" />
    </svg>
  );
}
