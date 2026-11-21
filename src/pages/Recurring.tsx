import { Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { useAccounts, useCategories, useRecurringList } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { confirmDialog, toast, useTxForm } from '@/store/ui';
import { deleteRecurring, setRecurringActive } from '@/services/finance';
import { describeDue, describeFreq, nextDue } from '@/utils/recurring';
import { todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';
import { CategoryIcon, PageHeader, Skeleton } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/EmptyState';

/** Doimiy (takrorlanuvchi) to‘lovlar va daromadlar ro‘yxati */
export default function RecurringPage() {
  const list = useRecurringList();
  const { map: catMap } = useCategories();
  const { map: accMap } = useAccounts();
  const { money } = useFormat();
  const openNew = useTxForm((s) => s.openNew);
  const today = todayISO();

  async function remove(id: string, name: string) {
    const ok = await confirmDialog({
      title: 'Doimiy to‘lovni o‘chirish',
      message: `“${name}” endi eslatilmaydi. Avval qo‘shilgan yozuvlar o‘zgarmaydi.`,
      confirmLabel: 'O‘chirish',
      danger: true,
    });
    if (!ok) return;
    await deleteRecurring(id);
    toast.success('Doimiy to‘lov o‘chirildi');
  }

  const sorted = (list ?? []).slice().sort((a, b) => Number(b.active) - Number(a.active) || (nextDue(a) < nextDue(b) ? -1 : 1));

  return (
    <div className="pb-10">
      <PageHeader
        title="Doimiy to‘lovlar"
        info="recurring"
        actions={
          <button className="btn btn-primary btn-sm h-10 px-3" onClick={() => openNew('expense', undefined, 'monthly')}>
            <Plus size={16} /> <span className="hidden sm:inline">Qo‘shish</span>
          </button>
        }
      />
      <div className="mx-auto max-w-2xl">
        {!list ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-line/70 bg-surface">
            <EmptyState
              art="list"
              title="Doimiy to‘lovlar yo‘q"
              description="Ijara, oylik maosh, internet kabi har oy takrorlanadiganlarni qo‘shing — vaqti kelganda ilova eslatadi."
              action={
                <>
                  <button className="btn btn-outline" onClick={() => openNew('income', undefined, 'monthly')}>Daromad</button>
                  <button className="btn btn-primary" onClick={() => openNew('expense', undefined, 'monthly')}>Xarajat</button>
                </>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/70 bg-surface">
            {sorted.map((r) => {
              const cat = catMap.get(r.categoryId);
              const acc = accMap.get(r.accountId);
              const due = nextDue(r);
              const overdue = r.active && due <= today;
              return (
                <li key={r.id} className={cn('flex items-center gap-3 px-4 py-3.5', !r.active && 'opacity-55')}>
                  <CategoryIcon icon={cat?.icon ?? 'more'} color={cat?.color ?? '#94a3b8'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{r.note || cat?.name || 'Doimiy to‘lov'}</p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
                      <Repeat size={12} />
                      {describeFreq(r)}
                      {acc && <> · {acc.name}</>}
                    </p>
                    <p className={cn('text-[12px] font-medium', overdue ? 'text-warn' : 'text-subtle')}>
                      {r.active ? `Keyingisi: ${describeDue(due, today)}` : 'To‘xtatilgan'}
                    </p>
                  </div>
                  <span className={cn('tabular text-[15px] font-semibold', r.type === 'income' ? 'text-income' : 'text-ink')}>
                    {money(r.type === 'income' ? r.amount : -r.amount, { sign: 'always' })}
                  </span>
                  <div className="flex">
                    <button
                      className="icon-btn h-9 w-9"
                      onClick={() => void setRecurringActive(r.id, !r.active)}
                      aria-label={r.active ? 'To‘xtatish' : 'Davom ettirish'}
                      title={r.active ? 'To‘xtatish' : 'Davom ettirish'}
                    >
                      {r.active ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button className="icon-btn h-9 w-9 hover:bg-expense/10 hover:text-expense" onClick={() => void remove(r.id, r.note || cat?.name || '')} aria-label="O‘chirish">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-center text-[12px] text-subtle">Yangi doimiy to‘lov: xarajat yoki daromad qo‘shayotganda “Har oy” yoki “Har hafta”ni tanlang.</p>
      </div>
    </div>
  );
}
