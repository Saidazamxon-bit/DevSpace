import { Link } from 'react-router-dom';
import { ChevronRight, DatabaseBackup, Download, FolderKanban, ListOrdered, Lock, Repeat, Settings, Target, Wallet, type LucideIcon } from 'lucide-react';
import { useLock } from '@/store/ui';
import { useSecurityConfig } from '@/hooks/useData';
import { PageHeader } from '@/components/ui/primitives';
import { InfoButton } from '@/components/InfoButton';
import type { InfoKey } from '@/utils/infoTexts';

declare const __APP_VERSION__: string;

interface Item {
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  info?: InfoKey;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Moliya',
    items: [
      { to: '/transactions', label: 'Tranzaksiyalar', desc: 'Barcha daromad va xarajatlar', icon: ListOrdered, color: '#2a78d6', info: 'transactions' },
      { to: '/accounts', label: 'Hisoblar', desc: 'Karta, naqd, jamg‘arma', icon: Wallet, color: '#1baf7a', info: 'accounts' },
      { to: '/budgets', label: 'Budjetlar', desc: 'Oylik limitlar', icon: Target, color: '#eb6834', info: 'budgets' },
      { to: '/recurring', label: 'Doimiy to‘lovlar', desc: 'Ijara, oylik, internet…', icon: Repeat, color: '#6250d6', info: 'recurring' },
      { to: '/categories', label: 'Kategoriyalar', desc: 'Nom, ikonka va rang', icon: FolderKanban, color: '#e87ba4', info: 'categories' },
    ],
  },
  {
    title: 'Ilova',
    items: [
      { to: '/settings', label: 'Sozlamalar', desc: 'Mavzu, rang, valyuta, xavfsizlik', icon: Settings, color: '#64748b' },
      { to: '/settings#data', label: 'Zaxira va tiklash', desc: 'JSON, CSV, shifrlangan zaxira', icon: DatabaseBackup, color: '#0ea5b7' },
      { to: '/settings#install', label: 'Ilovani o‘rnatish', desc: 'Telefon yoki kompyuterga', icon: Download, color: '#eda100' },
    ],
  },
];

/** “Boshqa” bo‘limi — qolgan barcha bo‘limlar, har birining yonida ⓘ tavsif */
export default function More() {
  const security = useSecurityConfig();
  const setLocked = useLock((s) => s.setLocked);
  return (
    <div className="pb-6">
      <PageHeader title="Boshqa" back={false} />
      <div className="mx-auto max-w-xl space-y-5">
        {GROUPS.map((g) => (
          <section key={g.title} aria-labelledby={`g-${g.title}`}>
            <h2 id={`g-${g.title}`} className="mb-2 px-4 text-[12px] font-semibold uppercase tracking-wide text-subtle">
              {g.title}
            </h2>
            <ul className="card-flush divide-y divide-line/60">
              {g.items.map((it) => (
                <li key={it.to} className="relative">
                  <Link to={it.to} className="flex items-center gap-3 px-4 py-3 pr-20 transition-colors hover:bg-surface-2/60 active:bg-surface-2" data-more={it.to}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white" style={{ background: it.color }}>
                      <it.icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{it.label}</span>
                      <span className="block truncate text-[12px] text-muted">{it.desc}</span>
                    </span>
                  </Link>
                  <span className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    {it.info && <InfoButton topic={it.info} className="pointer-events-auto" />}
                    <ChevronRight size={18} className="text-subtle" />
                  </span>
                </li>
              ))}
              {g.title === 'Ilova' && security?.pinHash && (
                <li>
                  <button type="button" onClick={() => setLocked(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60">
                    <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-ink text-bg">
                      <Lock size={18} />
                    </span>
                    <span className="flex-1 text-[15px] font-semibold text-ink">Ilovani qulflash</span>
                  </button>
                </li>
              )}
            </ul>
          </section>
        ))}
        <p className="text-center text-[12px] text-subtle">Personal Finance · versiya {__APP_VERSION__} · internetsiz ishlaydi</p>
      </div>
    </div>
  );
}
