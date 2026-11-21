import type { ReactNode } from 'react';
import { cn } from '@/utils/misc';

type Art = 'wallet' | 'chart' | 'list' | 'target' | 'search';

/** Yengil, mavzuga moslashuvchi SVG illustratsiyalar (tashqi rasm fayllarisiz) */
function Illustration({ art }: { art: Art }) {
  const base = 'rgb(var(--surface-2))';
  const line = 'rgb(var(--line))';
  const acc = 'rgb(var(--accent))';
  const accSoft = 'rgb(var(--accent) / 0.16)';
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <ellipse cx="80" cy="106" rx="56" ry="7" fill={base} />
      {art === 'wallet' && (
        <>
          <rect x="34" y="30" width="92" height="64" rx="14" fill={accSoft} />
          <rect x="28" y="40" width="104" height="60" rx="14" fill="rgb(var(--surface))" stroke={line} strokeWidth="2" />
          <rect x="94" y="58" width="38" height="24" rx="8" fill={base} stroke={line} strokeWidth="2" />
          <circle cx="106" cy="70" r="4" fill={acc} />
          <rect x="40" y="52" width="36" height="6" rx="3" fill={line} />
          <rect x="40" y="64" width="24" height="6" rx="3" fill={line} />
          <circle cx="122" cy="26" r="10" fill={acc} />
          <path d="M118 26h8M122 22v8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {art === 'chart' && (
        <>
          <rect x="26" y="20" width="108" height="80" rx="14" fill="rgb(var(--surface))" stroke={line} strokeWidth="2" />
          <rect x="42" y="66" width="12" height="22" rx="4" fill={line} />
          <rect x="62" y="52" width="12" height="36" rx="4" fill={line} />
          <rect x="82" y="60" width="12" height="28" rx="4" fill={line} />
          <rect x="102" y="40" width="12" height="48" rx="4" fill={acc} />
          <path d="M42 46l20-10 20 8 26-16" fill="none" stroke={acc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
        </>
      )}
      {art === 'list' && (
        <>
          <rect x="30" y="18" width="100" height="82" rx="14" fill="rgb(var(--surface))" stroke={line} strokeWidth="2" />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0 ${i * 22})`}>
              <rect x="42" y="30" width="14" height="14" rx="5" fill={i === 0 ? acc : base} />
              <rect x="62" y="31" width="40" height="5" rx="2.5" fill={line} />
              <rect x="62" y="40" width="24" height="4" rx="2" fill={base} />
              <rect x="106" y="33" width="14" height="6" rx="3" fill={line} />
            </g>
          ))}
        </>
      )}
      {art === 'target' && (
        <>
          <circle cx="80" cy="58" r="40" fill="rgb(var(--surface))" stroke={line} strokeWidth="2" />
          <circle cx="80" cy="58" r="27" fill={base} />
          <circle cx="80" cy="58" r="14" fill={accSoft} />
          <circle cx="80" cy="58" r="5" fill={acc} />
          <path d="M80 58l30-30" stroke={acc} strokeWidth="3" strokeLinecap="round" />
          <path d="M106 24l8-2-2 8z" fill={acc} />
        </>
      )}
      {art === 'search' && (
        <>
          <circle cx="72" cy="54" r="30" fill="rgb(var(--surface))" stroke={line} strokeWidth="2" />
          <circle cx="72" cy="54" r="18" fill={base} />
          <path d="M94 76l20 20" stroke={acc} strokeWidth="6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function EmptyState({
  art = 'list',
  title,
  description,
  action,
  className,
  compact,
}: {
  art?: Art;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'py-6' : 'py-10 px-4', className)}>
      {!compact && <Illustration art={art} />}
      <h3 className={cn('font-semibold text-ink', compact ? 'text-[15px]' : 'mt-4 text-base')}>{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
