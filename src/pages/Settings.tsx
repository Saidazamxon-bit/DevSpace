import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Check, Database, Download, FileJson, FileLock2, FileSpreadsheet, HardDrive, Info, Monitor, Moon, Palette, RefreshCw,
  ShieldCheck, Smartphone, Sun, Trash2, Upload, Wallet, Lock,
} from 'lucide-react';
import { useSettings, DEFAULT_SETTINGS, pickSettings } from '@/store/settings';
import { usePwa, isIOS, isStandalone } from '@/store/pwa';
import { confirmDialog, errorMessage, toast } from '@/store/ui';
import { useAccounts, useCategories, useTransactions } from '@/hooks/useData';
import { useOnline } from '@/hooks/useOnline';
import { backupFilename, buildBackup, buildEncryptedBackup, markBackupDone, transactionsToCsv } from '@/services/backup';
import { cryptoAvailable } from '@/services/crypto';
import { wipeAllData } from '@/services/finance';
import { getStorageInfo, requestPersistentStorage, SCHEMA_VERSION } from '@/database/db';
import { CURRENCIES, NUMBER_FORMAT_OPTIONS } from '@/utils/money';
import { DATE_FORMAT_OPTIONS } from '@/utils/date';
import { cn, downloadBlob } from '@/utils/misc';
import type { AccentName, CurrencyCode, DateFormat, NumberFormat, ThemeMode } from '@/types';
import { PageHeader, Switch } from '@/components/ui/primitives';
import { ImportDialog } from '@/components/settings/ImportDialog';
import { PasswordDialog } from '@/components/settings/PasswordDialog';
import { SecuritySection } from '@/components/settings/SecuritySection';

declare const __APP_VERSION__: string;

const ACCENTS: { value: AccentName; label: string; light: string; dark: string }[] = [
  { value: 'green', label: 'Yashil', light: '#1E9662', dark: '#3ECF8E' },
  { value: 'blue', label: 'Ko‘k', light: '#1D4ED8', dark: '#3B82F6' },
  { value: 'violet', label: 'Binafsha', light: '#6D28D9', dark: '#8B5CF6' },
  { value: 'orange', label: 'To‘q sariq', light: '#C2410C', dark: '#FB923C' },
  { value: 'teal', label: 'Turkuaz', light: '#0F766E', dark: '#2DD4BF' },
  { value: 'pink', label: 'Pushti', light: '#BE185D', dark: '#F472B6' },
  { value: 'gold', label: 'Oltin', light: '#A16207', dark: '#F5B83D' },
];

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun; desc: string }[] = [
  { value: 'light', label: 'Yorug‘', icon: Sun, desc: 'Och fon' },
  { value: 'dark', label: 'Qorong‘i', icon: Moon, desc: 'To‘q fon' },
  { value: 'system', label: 'Tizim', icon: Monitor, desc: 'Qurilmaga mos' },
];

function Section({ id, title, icon: Icon, children, desc }: { id: string; title: string; icon: typeof Sun; children: React.ReactNode; desc?: string }) {
  return (
    <section id={id} className="card scroll-mt-20" aria-labelledby={`${id}-t`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon size={18} />
        </span>
        <div>
          <h2 id={`${id}-t`} className="section-title">{title}</h2>
          {desc && <p className="text-[13px] text-muted">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({ label, desc, htmlFor, children }: { label: string; desc?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-1">
      <label htmlFor={htmlFor} className="min-w-0">
        <span className="block text-[15px] font-medium">{label}</span>
        {desc && <span className="block text-[13px] text-muted">{desc}</span>}
      </label>
      <div className="sm:w-64 shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const s = useSettings();
  const { map: accMap } = useAccounts();
  const txs = useTransactions();
  const { map: catMap } = useCategories();
  const online = useOnline();
  const pwa = usePwa();
  const [importOpen, setImportOpen] = useState(false);
  const [encOpen, setEncOpen] = useState(false);
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof getStorageInfo>>>(null);

  useEffect(() => {
    void getStorageInfo().then(setStorage);
  }, [txs?.length]);

  // Menyudagi “Zaxira va tiklash” → ma’lumotlar bo‘limiga o‘tish
  const loc = useLocation();
  useEffect(() => {
    const id = loc.hash.replace('#', '');
    if (id === 'data' || id === 'install') window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }, [loc.hash]);

  async function exportJson() {
    try {
      const data = await buildBackup(pickSettings(s));
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), backupFilename('json'));
      await markBackupDone();
      toast.success('Zaxira yuklab olindi', `${data.data.transactions.length} ta tranzaksiya saqlandi`);
    } catch (e) {
      toast.error('Eksport amalga oshmadi', errorMessage(e));
    }
  }

  async function exportEncrypted(password: string) {
    try {
      const data = await buildEncryptedBackup(pickSettings(s), password);
      downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), backupFilename('json', 'shifrlangan'));
      await markBackupDone();
      toast.success('Shifrlangan zaxira yuklab olindi');
    } catch (e) {
      toast.error('Shifrlab bo‘lmadi', errorMessage(e));
    }
  }

  function exportCsv() {
    if (!txs?.length) return toast.info('Eksport uchun tranzaksiyalar yo‘q');
    const csv = transactionsToCsv(txs, catMap, s.currency, accMap);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), backupFilename('csv', 'tranzaksiyalar'));
    toast.success('CSV fayl yuklab olindi', `${txs.length} ta tranzaksiya`);
  }

  async function wipe() {
    const ok = await confirmDialog({
      title: 'Barcha ma’lumotlarni o‘chirish',
      message: 'Barcha tranzaksiyalar, budjetlar, maxsus kategoriyalar va boshlang‘ich balans butunlay o‘chiriladi. Avval zaxira nusxa olishni tavsiya qilamiz. Bu amalni bekor qilib bo‘lmaydi!',
      confirmLabel: 'Ha, hammasini o‘chirish',
      danger: true,
    });
    if (!ok) return;
    await wipeAllData();
    toast.success('Barcha ma’lumotlar o‘chirildi', 'Standart kategoriyalar tiklandi.');
  }

  async function persist() {
    const ok = await requestPersistentStorage();
    setStorage(await getStorageInfo());
    if (ok) toast.success('Doimiy saqlash yoqildi', 'Brauzer ma’lumotlarni avtomatik tozalamaydi.');
    else toast.info('Brauzer ruxsat bermadi', 'Ilovani o‘rnatish (PWA) odatda bu ruxsatni beradi.');
  }

  async function install() {
    if (!pwa.installEvent) return;
    await pwa.installEvent.prompt();
    const { outcome } = await pwa.installEvent.userChoice;
    if (outcome === 'accepted') pwa.set({ installEvent: null });
  }

  async function checkUpdate() {
    if (!online) return toast.info('Internet yo‘q', 'Yangilanishni tekshirish uchun internetga ulaning.');
    if (!pwa.checkForUpdate) return toast.info('Service Worker faol emas');
    try {
      await pwa.checkForUpdate();
      setTimeout(() => {
        if (!usePwa.getState().needRefresh) toast.success('Siz eng so‘nggi versiyadan foydalanyapsiz');
      }, 1500);
    } catch {
      toast.error('Yangilanishni tekshirib bo‘lmadi');
    }
  }

  const standalone = isStandalone();

  return (
    <div>
      <PageHeader title="Sozlamalar" />

      <div className="grid gap-4 lg:grid-cols-2 items-start pb-10">
        <div className="space-y-4">
          <Section id="appearance" title="Ko‘rinish" icon={Palette} desc="Mavzu va asosiy rang">
            <span className="label">Mavzu</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mavzu">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={s.theme === t.value}
                  onClick={() => s.set({ theme: t.value })}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all active:scale-95',
                    s.theme === t.value ? 'border-accent bg-accent/[0.06] ring-2 ring-accent/20 text-accent' : 'border-line text-muted hover:bg-surface-2/60',
                  )}
                >
                  <t.icon size={22} />
                  <span className="text-sm font-semibold text-ink">{t.label}</span>
                  <span className="text-[11px] text-muted">{t.desc}</span>
                </button>
              ))}
            </div>

            <span className="label mt-5">Asosiy rang</span>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Asosiy rang">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={s.accent === a.value}
                  title={a.label}
                  onClick={() => s.set({ accent: a.value })}
                  className="group flex flex-col items-center gap-1"
                >
                  <span
                    className={cn('grid h-10 w-10 place-items-center rounded-full transition-transform group-active:scale-90', s.accent === a.value && 'ring-2 ring-offset-2 ring-offset-surface')}
                    style={{ background: `linear-gradient(135deg, ${a.light}, ${a.dark})`, ['--tw-ring-color' as string]: a.dark }}
                  >
                    {s.accent === a.value && <Check size={18} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className={cn('text-[11px]', s.accent === a.value ? 'font-semibold text-ink' : 'text-muted')}>{a.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <Switch checked={s.animations} onChange={(v) => s.set({ animations: v })} label="Animatsiyalar" description="Tizimda “harakatni kamaytirish” yoqilgan bo‘lsa, avtomatik kamayadi" />
            </div>
          </Section>

          <Section id="format" title="Valyuta va formatlar" icon={Wallet}>
            <div className="space-y-4">
              <Row label="Asosiy valyuta" desc="Summalar avtomatik konvertatsiya qilinmaydi" htmlFor="currency">
                <select id="currency" className="input" value={s.currency} onChange={(e) => s.set({ currency: e.target.value as CurrencyCode })}>
                  {Object.values(CURRENCIES).map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </Row>
              <Row label="Sana formati" htmlFor="datefmt">
                <select id="datefmt" className="input" value={s.dateFormat} onChange={(e) => s.set({ dateFormat: e.target.value as DateFormat })}>
                  {DATE_FORMAT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Row>
              <Row label="Sonlar formati" htmlFor="numfmt">
                <select id="numfmt" className="input" value={s.numberFormat} onChange={(e) => s.set({ numberFormat: e.target.value as NumberFormat })}>
                  {NUMBER_FORMAT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Row>
              <Row label="Hisoblar va qoldiqlar" desc="Karta, Naqd, Jamg‘arma — har birining qoldig‘i">
                <Link to="/accounts" className="btn btn-outline w-full justify-between">
                  <span>Hisoblarni boshqarish</span>
                  <span className="text-accent text-[13px]">Ochish</span>
                </Link>
              </Row>
            </div>
          </Section>

          <Section id="security" title="Xavfsizlik" icon={Lock} desc="PIN-kod va biometrik qulf">
            <SecuritySection />
          </Section>
        </div>

        <div className="space-y-4">
          <Section id="data" title="Ma’lumotlarni boshqarish" icon={Database} desc="Barcha ma’lumotlar faqat shu qurilmada saqlanadi">
            <p className="mb-4 rounded-xl bg-accent/[0.06] p-3 text-[13px] leading-relaxed text-muted">
              Ma’lumotlar hech qanday serverga yuborilmaydi. Qurilma almashtirilsa yoki brauzer tozalansa yo‘qolmasligi uchun muntazam <b className="text-ink">zaxira nusxa</b> olib turing.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionTile icon={FileJson} title="JSON zaxira" desc="To‘liq nusxa: tranzaksiya, kategoriya, budjet, sozlamalar" onClick={exportJson} />
              <ActionTile icon={FileLock2} title="Shifrlangan zaxira" desc="Parol bilan himoyalangan JSON" onClick={() => (cryptoAvailable() ? setEncOpen(true) : toast.error('Shifrlash mavjud emas', 'HTTPS orqali oching.'))} />
              <ActionTile icon={FileSpreadsheet} title="CSV eksport" desc="Excel/Google Sheets uchun tranzaksiyalar" onClick={exportCsv} />
              <ActionTile icon={Upload} title="Zaxiradan tiklash" desc="JSON faylni import qilish" onClick={() => setImportOpen(true)} accent />
            </div>

            <div className="mt-4 rounded-2xl border border-line/70 p-3.5">
              <div className="flex items-center gap-3">
                <HardDrive size={18} className="text-muted shrink-0" />
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className="font-medium text-ink">Qurilma xotirasi (IndexedDB)</p>
                  <p className="text-muted">
                    {storage ? `${formatBytes(storage.usage)} ishlatilmoqda · ${storage.persisted ? 'doimiy saqlash yoqilgan' : 'doimiy saqlash yoqilmagan'}` : 'Ma’lumot mavjud emas'}
                    {txs && ` · ${txs.length} ta tranzaksiya`}
                  </p>
                </div>
                {storage && !storage.persisted && (
                  <button className="btn btn-sm btn-secondary shrink-0" onClick={persist}>Yoqish</button>
                )}
              </div>
            </div>

            <button className="btn btn-ghost mt-3 w-full text-expense hover:bg-expense/10 hover:text-expense" onClick={wipe}>
              <Trash2 size={18} /> Barcha ma’lumotlarni o‘chirish
            </button>
          </Section>

          <Section id="install" title="Ilovani o‘rnatish" icon={Smartphone} desc="Bosh ekranga qo‘shing va internetsiz foydalaning">
            {standalone || pwa.installed ? (
              <p className="flex items-center gap-2 text-[14px] text-income"><ShieldCheck size={18} /> Ilova o‘rnatilgan va alohida oynada ishlayapti.</p>
            ) : pwa.installEvent ? (
              <button className="btn btn-primary w-full" onClick={install}><Download size={18} /> Qurilmaga o‘rnatish</button>
            ) : isIOS() ? (
              <ol className="list-decimal space-y-1.5 pl-5 text-[14px] text-muted">
                <li>Saytni <b className="text-ink">Safari</b> brauzerida oching.</li>
                <li>Pastdagi <b className="text-ink">“Ulashish”</b> tugmasini bosing.</li>
                <li><b className="text-ink">“Bosh ekranga qo‘shish”</b> (Add to Home Screen) ni tanlang.</li>
              </ol>
            ) : (
              <ul className="space-y-1.5 text-[14px] text-muted">
                <li><b className="text-ink">Android (Chrome):</b> menyu ⋮ → “Ilovani o‘rnatish”.</li>
                <li><b className="text-ink">Kompyuter (Chrome/Edge):</b> manzil satridagi o‘rnatish belgisini bosing.</li>
                <li><b className="text-ink">iPhone (Safari):</b> Ulashish → “Bosh ekranga qo‘shish”.</li>
              </ul>
            )}
          </Section>

          <Section id="about" title="Ilova haqida" icon={Info}>
            <dl className="divide-y divide-line/60 text-[14px]">
              {[
                ['Ilova', 'Personal Finance'],
                ['Versiya', __APP_VERSION__],
                ['Ma’lumotlar bazasi', `IndexedDB · sxema v${SCHEMA_VERSION}`],
                ['Holat', online ? 'Onlayn' : 'Offline rejim'],
                ['Offline ishlash', 'navigator' in globalThis && 'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? 'Faol' : 'Tayyorlanmoqda') : 'Qo‘llab-quvvatlanmaydi'],
                ['Maxfiylik', 'Kuzatuv va reklama skriptlari yo‘q'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {pwa.needRefresh ? (
                <button className="btn btn-primary btn-sm" onClick={() => void pwa.update?.()}><RefreshCw size={16} /> Yangi versiyani o‘rnatish</button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={checkUpdate}><RefreshCw size={16} /> Yangilanishni tekshirish</button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  const ok = await confirmDialog({ title: 'Sozlamalarni tiklash', message: 'Ko‘rinish va format sozlamalari standart holatga qaytariladi. Ma’lumotlar o‘zgarmaydi.', confirmLabel: 'Tiklash' });
                  if (ok) {
                    s.set(DEFAULT_SETTINGS);
                    toast.success('Sozlamalar tiklandi');
                  }
                }}
              >
                Standart sozlamalar
              </button>
            </div>
          </Section>
        </div>
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <PasswordDialog open={encOpen} onClose={() => setEncOpen(false)} onSubmit={exportEncrypted} />
    </div>
  );
}

function ActionTile({ icon: Icon, title, desc, onClick, accent }: { icon: typeof Sun; title: string; desc: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all hover:shadow-card active:scale-[0.98]',
        accent ? 'border-accent/30 bg-accent/[0.05] hover:bg-accent/[0.08]' : 'border-line/70 hover:bg-surface-2/50',
      )}
    >
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', accent ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink')}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-[12px] leading-snug text-muted">{desc}</span>
      </span>
    </button>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
