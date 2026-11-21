import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, DatabaseBackup, Repeat, X } from 'lucide-react';
import { useAccounts, useCategories, useMetaValue, useRecurringList } from '@/hooks/useData';
import { useFormat } from '@/hooks/useFormat';
import { confirmRecurring, META_BACKUP_SNOOZE, META_LAST_BACKUP, setMeta, skipRecurring } from '@/services/finance';
import { backupFilename, buildBackup, markBackupDone } from '@/services/backup';
import { pickSettings, useSettings } from '@/store/settings';
import { errorMessage, toast } from '@/store/ui';
import { describeDue, dueRecurring } from '@/utils/recurring';
import { todayISO } from '@/utils/date';
import { downloadBlob } from '@/utils/misc';
import { CategoryIcon } from './ui/primitives';
import type { Transaction } from '@/types';

/** Vaqti kelgan doimiy to‘lovlar — bir bosishda tasdiqlash yoki o‘tkazib yuborish */
export function DueRecurring() {
  const list = useRecurringList();
  const { map: catMap } = useCategories();
  const { map: accMap } = useAccounts();
  const { money } = useFormat();
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayISO();
  const due = useMemo(() => dueRecurring(list ?? [], today), [list, today]);
  if (!due.length) return null;

  async function confirm(id: string, date: string) {
    setBusy(id);
    try {
      const tx = await confirmRecurring(id, date);
      toast.success(tx.type === 'income' ? 'Daromad qo‘shildi' : 'Xarajat qo‘shildi', money(tx.amount));
    } catch (e) {
      toast.error('Qo‘shib bo‘lmadi', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Vaqti kelgan doimiy to‘lovlar" className="space-y-2" data-testid="due-recurring">
      {due.slice(0, 2).map(({ rec, date }) => {
        const cat = catMap.get(rec.categoryId);
        return (
          <div key={rec.id} className="flex items-center gap-3 rounded-2xl border border-warn/30 bg-warn/[0.07] px-3 py-2.5 animate-fade-in">
            <CategoryIcon icon={cat?.icon ?? 'more'} color={cat?.color ?? '#94a3b8'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ink">{rec.note || cat?.name}</p>
              <p className="flex items-center gap-1 truncate text-[12px] text-muted">
                <span className={rec.type === 'income' ? 'font-semibold text-income' : 'font-semibold text-expense'}>
                  {money(rec.type === 'income' ? rec.amount : -rec.amount, { sign: 'always' })}
                </span>
                <Repeat size={11} className="ml-1 shrink-0" /> {describeDue(date, today)}
                {accMap.get(rec.accountId) && ` · ${accMap.get(rec.accountId)!.name}`}
              </p>
            </div>
            <button
              type="button"
              disabled={busy === rec.id}
              onClick={() => void skipRecurring(rec.id, date)}
              className="icon-btn h-9 w-9"
              aria-label="Bu safar o‘tkazib yuborish"
              title="O‘tkazib yuborish"
            >
              <X size={17} />
            </button>
            <button
              type="button"
              disabled={busy === rec.id}
              onClick={() => void confirm(rec.id, date)}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-accent px-3 text-[13px] font-semibold text-accent-ink"
              aria-label="Qo‘shish"
            >
              <Check size={15} /> <span className="hidden min-[420px]:inline">Qo‘shish</span>
            </button>
          </div>
        );
      })}
      {due.length > 2 && (
        <Link to="/recurring" className="block text-center text-[12px] font-semibold text-accent">
          Yana {due.length - 2} ta doimiy to‘lov kutmoqda
        </Link>
      )}
    </section>
  );
}

const DAY = 86_400_000;

/** Ma’lumot faqat qurilmada — haftada bir zaxira olishni eslatadi */
export function BackupReminder({ txs }: { txs: Transaction[] }) {
  const last = useMetaValue<number | null>(META_LAST_BACKUP, null);
  const snooze = useMetaValue<number>(META_BACKUP_SNOOZE, 0);
  const settings = useSettings();
  if (last === undefined || snooze === undefined || txs.length < 5) return null;
  const now = Date.now();
  const since = last ?? Math.min(...txs.map((t) => t.createdAt));
  if (now - since < 7 * DAY || now < snooze) return null;
  const days = Math.floor((now - (last ?? since)) / DAY);

  async function backup() {
    try {
      const data = await buildBackup(pickSettings(settings));
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), backupFilename('json'));
      await markBackupDone();
      toast.success('Zaxira yuklab olindi', 'Faylni xavfsiz joyda (Telegram “Saqlangan”, Google Drive) saqlang.');
    } catch (e) {
      toast.error('Zaxira olinmadi', errorMessage(e));
    }
  }

  return (
    <section className="flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.06] px-3 py-2.5 animate-fade-in" data-testid="backup-reminder">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
        <DatabaseBackup size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">Zaxira nusxa oling</p>
        <p className="text-[12px] text-muted">{last ? `Oxirgisi ${days} kun oldin olingan` : 'Hali zaxira olinmagan'} — ma’lumot faqat shu qurilmada</p>
      </div>
      <button type="button" className="icon-btn h-9 w-9" onClick={() => void setMeta(META_BACKUP_SNOOZE, now + 3 * DAY)} aria-label="Keyinroq eslatish" title="Keyinroq">
        <X size={17} />
      </button>
      <button type="button" onClick={() => void backup()} className="h-9 rounded-full bg-accent px-3 text-[13px] font-semibold text-accent-ink">
        Yuklab olish
      </button>
    </section>
  );
}
