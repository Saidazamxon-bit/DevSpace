import { memo } from 'react';
import type { Category, Transaction } from '@/types';
import { CategoryIcon } from './ui/primitives';
import { useFormat } from '@/hooks/useFormat';
import { PAYMENT_LABEL } from '@/services/finance';
import { cn } from '@/utils/misc';

export const TransactionItem = memo(function TransactionItem({
  tx,
  category,
  onClick,
  showDate = true,
}: {
  tx: Transaction;
  category?: Category;
  onClick?: () => void;
  showDate?: boolean;
}) {
  const { money, date } = useFormat();
  const income = tx.type === 'income';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2/70 active:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <CategoryIcon icon={category?.icon ?? 'more'} color={category?.color ?? '#94a3b8'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{tx.note || category?.name || 'Tranzaksiya'}</p>
        <p className="truncate text-[13px] text-muted">
          {tx.note ? category?.name ?? 'Noma’lum' : PAYMENT_LABEL[tx.paymentMethod]}
          {showDate && <> · {date(tx.date)}</>}
          {tx.note && <> · {PAYMENT_LABEL[tx.paymentMethod]}</>}
        </p>
      </div>
      <span className={cn('tabular shrink-0 text-[15px] font-semibold', income ? 'text-income' : 'text-ink')}>
        {money(income ? tx.amount : -tx.amount, { sign: 'always' })}
      </span>
    </button>
  );
});
