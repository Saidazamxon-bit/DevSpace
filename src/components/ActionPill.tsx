import { ArrowLeftRight, Minus, Plus } from 'lucide-react';
import { useTransferForm, useTxForm } from '@/store/ui';

/** Bosh ekrandagi suzuvchi tugmalar: − xarajat · + daromad · ⇄ o‘tkazma */
export function ActionPill() {
  const openNew = useTxForm((s) => s.openNew);
  const openTransfer = useTransferForm((s) => s.setOpen);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.4rem+var(--safe-bottom))] z-40 flex justify-center">
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
