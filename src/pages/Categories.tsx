import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useBudgets, useCategories, useTransactions } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { addCategory, CATEGORY_NAME_MAX, countCategoryUsage, deleteCategory, updateCategory } from '@/services/finance';
import { confirmDialog, errorMessage, toast } from '@/store/ui';
import type { Category, TxType } from '@/types';
import { CATEGORY_COLORS, CATEGORY_ICONS, ICON_NAMES } from '@/utils/icons';
import { CategoryIcon, Field, PageHeader, Segmented, Skeleton } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/misc';

export default function Categories() {
  const { list } = useCategories();
  const txs = useTransactions();
  const budgets = useBudgets();
  const { money } = useFormat();
  const [type, setType] = useState<TxType>('expense');
  const [form, setForm] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null });
  const [del, setDel] = useState<{ cat: Category; used: number } | null>(null);

  const usage = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const t of txs ?? []) {
      const u = m.get(t.categoryId) ?? { count: 0, total: 0 };
      u.count++;
      u.total += t.amount;
      m.set(t.categoryId, u);
    }
    return m;
  }, [txs]);

  const shown = (list ?? []).filter((c) => c.type === type);

  async function requestDelete(c: Category) {
    const sameType = (list ?? []).filter((x) => x.type === c.type).length;
    if (sameType <= 1) {
      toast.error('O‘chirib bo‘lmaydi', 'Kamida bitta kategoriya qolishi kerak.');
      return;
    }
    const { transactions, budgets: b } = await countCategoryUsage(c.id);
    if (transactions > 0) {
      setDel({ cat: c, used: transactions });
      return;
    }
    const ok = await confirmDialog({
      title: 'Kategoriyani o‘chirish',
      message: `“${c.name}” kategoriyasi o‘chiriladi.${b ? ' Unga tegishli budjet ham o‘chiriladi.' : ''}`,
      confirmLabel: 'O‘chirish',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(c.id);
      toast.success('Kategoriya o‘chirildi');
    } catch (e) {
      toast.error('Xatolik', errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        info="categories"
        title="Kategoriyalar"
        subtitle="Daromad va xarajatlarni guruhlash uchun"
        actions={
          <button className="btn btn-primary btn-sm h-10 px-3" onClick={() => setForm({ open: true, editing: null })}>
            <Plus size={16} /> <span className="hidden sm:inline">Yangi kategoriya</span>
          </button>
        }
      />
      <Segmented
        className="mb-4"
        value={type}
        onChange={setType}
        label="Kategoriya turi"
        options={[
          { value: 'expense', label: `Xarajat (${(list ?? []).filter((c) => c.type === 'expense').length})` },
          { value: 'income', label: `Daromad (${(list ?? []).filter((c) => c.type === 'income').length})` },
        ]}
      />

      {!list ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState art="list" title="Kategoriyalar yo‘q" action={<button className="btn btn-primary" onClick={() => setForm({ open: true, editing: null })}>Kategoriya yaratish</button>} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => {
            const u = usage.get(c.id);
            const hasBudget = budgets?.some((b) => b.categoryId === c.id);
            return (
              <div key={c.id} className="card flex items-center gap-3 !py-3.5">
                <CategoryIcon icon={c.icon} color={c.color} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{c.name}</p>
                  <p className="truncate text-[12px] text-muted">
                    {u ? `${u.count} ta · ${money(u.total, { compact: true })}` : 'Ishlatilmagan'}
                    {hasBudget && ' · budjet bor'}
                  </p>
                </div>
                <button className="icon-btn h-9 w-9" onClick={() => setForm({ open: true, editing: c })} aria-label={`${c.name} — tahrirlash`}>
                  <Pencil size={16} />
                </button>
                <button className="icon-btn h-9 w-9 hover:text-expense hover:bg-expense/10" onClick={() => requestDelete(c)} aria-label={`${c.name} — o‘chirish`}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CategoryForm open={form.open} editing={form.editing} defaultType={type} onClose={() => setForm({ open: false, editing: null })} />
      {del && <ReassignDialog cat={del.cat} used={del.used} options={(list ?? []).filter((c) => c.type === del.cat.type && c.id !== del.cat.id)} onClose={() => setDel(null)} />}
    </div>
  );
}

function CategoryForm({ open, editing, defaultType, onClose }: { open: boolean; editing: Category | null; defaultType: TxType; onClose: () => void }) {
  const [type, setType] = useState<TxType>(defaultType);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('more');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);
    setType(editing?.type ?? defaultType);
    setName(editing?.name ?? '');
    setIcon(editing?.icon ?? 'wallet');
    setColor(editing?.color ?? CATEGORY_COLORS[Math.floor(Math.random() * 8)]);
  }, [open, editing, defaultType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Kategoriya nomini kiriting');
    setSaving(true);
    try {
      if (editing) await updateCategory(editing.id, { name, icon, color });
      else await addCategory({ name, icon, color, type });
      toast.success(editing ? 'Kategoriya yangilandi' : 'Kategoriya yaratildi');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
      footer={
        <>
          <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="cat-form" className="btn btn-primary flex-1 sm:flex-none" disabled={saving}>Saqlash</button>
        </>
      }
    >
      <form id="cat-form" onSubmit={submit} className="space-y-5" noValidate>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <CategoryIcon icon={icon} color={color} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{name.trim() || 'Kategoriya nomi'}</p>
            <p className="text-[12px] text-muted">{type === 'income' ? 'Daromad kategoriyasi' : 'Xarajat kategoriyasi'}</p>
          </div>
        </div>
        {!editing && (
          <Segmented
            className="w-full"
            value={type}
            onChange={setType}
            label="Turi"
            options={[
              { value: 'expense', label: 'Xarajat', tone: 'expense' },
              { value: 'income', label: 'Daromad', tone: 'income' },
            ]}
          />
        )}
        <Field label="Nomi" htmlFor="cat-name" error={error}>
          <input id="cat-name" data-autofocus className={cn('input', error && 'input-error')} maxLength={CATEGORY_NAME_MAX} value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Masalan: Kafe" />
        </Field>
        <div>
          <span className="label">Rang</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rang">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn('h-9 w-9 rounded-full transition-transform active:scale-90', c === color && 'ring-2 ring-offset-2 ring-offset-surface')}
                style={{ background: c, ['--tw-ring-color' as string]: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="label">Ikonka</span>
          <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5" role="radiogroup" aria-label="Ikonka">
            {ICON_NAMES.map((n) => {
              const Icon = CATEGORY_ICONS[n];
              const active = n === icon;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={n}
                  onClick={() => setIcon(n)}
                  className={cn('grid aspect-square place-items-center rounded-xl transition-colors', active ? 'text-white' : 'text-muted hover:bg-surface-2 hover:text-ink')}
                  style={active ? { background: color } : undefined}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Ishlatilgan kategoriyani o‘chirish — tranzaksiyalar boshqa kategoriyaga ko‘chiriladi */
function ReassignDialog({ cat, used, options, onClose }: { cat: Category; used: number; options: Category[]; onClose: () => void }) {
  const [target, setTarget] = useState(options.find((o) => o.name.toLowerCase() === 'boshqa')?.id ?? options[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await deleteCategory(cat.id, target);
      toast.success('Kategoriya o‘chirildi', `${used} ta tranzaksiya ko‘chirildi`);
      onClose();
    } catch (e) {
      toast.error('Xatolik', errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title="Kategoriyani o‘chirish"
      footer={
        <>
          <button className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>Bekor qilish</button>
          <button className="btn btn-danger flex-1 sm:flex-none" onClick={run} disabled={!target || busy}>Ko‘chirish va o‘chirish</button>
        </>
      }
    >
      <p className="text-[15px] text-muted leading-relaxed">
        “<b className="text-ink">{cat.name}</b>” kategoriyasida <b className="text-ink">{used} ta</b> tranzaksiya bor. Ma’lumotlar yo‘qolmasligi uchun ularni boshqa kategoriyaga ko‘chiring.
      </p>
      <label className="label mt-4" htmlFor="reassign">Qaysi kategoriyaga ko‘chirilsin?</label>
      <select id="reassign" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </Modal>
  );
}
