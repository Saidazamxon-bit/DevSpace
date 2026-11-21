import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useConfirm } from '@/store/ui';
import { Modal } from './Modal';
import { cn } from '@/utils/misc';

export function ConfirmHost() {
  const current = useConfirm((s) => s.current);
  const close = useConfirm((s) => s.close);
  if (!current) return null;
  const Icon = current.danger ? AlertTriangle : HelpCircle;
  return (
    <Modal
      open
      size="sm"
      onClose={() => close(false)}
      title={
        <span className="flex items-center gap-2.5">
          <span className={cn('grid h-9 w-9 place-items-center rounded-full', current.danger ? 'bg-expense/10 text-expense' : 'bg-accent/10 text-accent')}>
            <Icon size={18} />
          </span>
          {current.title}
        </span>
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={() => close(false)}>
            {current.cancelLabel ?? 'Bekor qilish'}
          </button>
          <button
            type="button"
            data-autofocus
            className={cn('btn flex-1 sm:flex-none', current.danger ? 'btn-danger' : 'btn-primary')}
            onClick={() => close(true)}
          >
            {current.confirmLabel ?? 'Tasdiqlash'}
          </button>
        </>
      }
    >
      {current.message && <p className="text-[15px] leading-relaxed text-muted">{current.message}</p>}
    </Modal>
  );
}
