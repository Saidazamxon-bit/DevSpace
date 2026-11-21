import { ArrowLeftRight, Minus, Plus } from 'lucide-react';
import { useTransferForm, useTxForm } from '@/store/ui';

/** Bosh ekrandagi suzuvchi tugmalar: − xarajat · + daromad · ⇄ o‘tkazma (telefon) */
export function ActionPill() {
  const openNew = useTxForm((s) => s.openNew);
  const openTransfer = useTransferForm((s) => s.setOpen);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.4rem+var(--safe-bottom))] z-40 flex justify-center lg:hidden">
      <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
        <button
          type="button"
          onClick={() => openNew('expense')}
          aria-label="Xarajat qo‘shish"
          title="Xarajat"
          className="grid h-12 w-12 place-items-center rounded-full text-expense transition-transform hover:bg-black/5 active:scale-90 dark:hover:bg-white/10"
        >
          <Minus size={24} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          onClick={() => openNew('income')}
          aria-label="Daromad qo‘shish"
          title="Daromad"
          className="grid h-12 w-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lift transition-transform active:scale-90"
        >
          <Plus size={26} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          onClick={() => openTransfer(true)}
          aria-label="Hisoblar orasida o‘tkazma"
          title="O‘tkazma"
          className="grid h-12 w-12 place-items-center rounded-full text-ink transition-transform hover:bg-black/5 active:scale-90 dark:hover:bg-white/10"
        >
          <ArrowLeftRight size={21} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

/** Kompyuterda: xuddi shu amallar hero ichida, yozuvli tugmalar sifatida */
export function HeroActions() {
  const openNew = useTxForm((s) => s.openNew);
  const openTransfer = useTransferForm((s) => s.setOpen);
  const base =
    'inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ring-1 ring-inset transition-[background-color,transform] duration-150 active:scale-[0.97]';
  return (
    <div className="relative mt-7 hidden justify-center gap-2 lg:flex">
      <button type="button" onClick={() => openNew('expense')} aria-label="Xarajat qo‘shish" className={`${base} bg-white/15 ring-white/20 backdrop-blur hover:bg-white/25`}>
        <Minus size={18} strokeWidth={2.6} /> Xarajat
      </button>
      <button type="button" onClick={() => openNew('income')} aria-label="Daromad qo‘shish" className={`${base} bg-white text-[#0f3d2a] shadow-lift ring-white hover:bg-white/90`}>
        <Plus size={18} strokeWidth={2.6} /> Daromad
      </button>
      <button type="button" onClick={() => openTransfer(true)} aria-label="Hisoblar orasida o‘tkazma" className={`${base} bg-white/15 ring-white/20 backdrop-blur hover:bg-white/25`}>
        <ArrowLeftRight size={17} strokeWidth={2.3} /> O‘tkazma
      </button>
    </div>
  );
}
