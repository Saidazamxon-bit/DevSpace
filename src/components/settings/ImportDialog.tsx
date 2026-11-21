import { useRef, useState } from 'react';
import { FileUp, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Field, Switch } from '../ui/primitives';
import {
  applyBackup, decryptBackup, ImportError, isEncryptedBackup, MAX_IMPORT_BYTES, parseBackupText, validateBackup,
  type ImportMode, type ParsedBackup,
} from '@/services/backup';
import { readFileAsText, cn } from '@/utils/misc';
import { confirmDialog, errorMessage, toast } from '@/store/ui';
import { useSettings } from '@/store/settings';
import type { EncryptedBackupFile } from '@/types';
import { formatDate, toISODate } from '@/utils/date';

type Step = 'pick' | 'password' | 'preview';

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('pick');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [encrypted, setEncrypted] = useState<EncryptedBackupFile | null>(null);
  const [password, setPassword] = useState('');
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [withSettings, setWithSettings] = useState(false);
  const setSettings = useSettings((s) => s.set);
  const dateFormat = useSettings((s) => s.dateFormat);

  function reset() {
    setStep('pick');
    setError('');
    setBusy(false);
    setFileName('');
    setEncrypted(null);
    setPassword('');
    setParsed(null);
    setMode('merge');
    setWithSettings(false);
    if (fileRef.current) fileRef.current.value = '';
  }
  function close() {
    reset();
    onClose();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError('');
    setFileName(file.name);
    if (file.size > MAX_IMPORT_BYTES) return setError('Fayl juda katta (50 MB dan oshmasligi kerak)');
    if (!/\.json$/i.test(file.name) && file.type && !file.type.includes('json')) return setError('Faqat .json formatidagi zaxira fayllari qabul qilinadi');
    setBusy(true);
    try {
      const raw = parseBackupText(await readFileAsText(file));
      if (isEncryptedBackup(raw)) {
        setEncrypted(raw);
        setStep('password');
      } else {
        setParsed(validateBackup(raw));
        setStep('preview');
      }
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Faylni o‘qib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!encrypted || !password) return;
    setBusy(true);
    setError('');
    try {
      const raw = await decryptBackup(encrypted, password);
      setParsed(validateBackup(raw));
      setStep('preview');
    } catch (err) {
      setError(err instanceof ImportError ? err.message : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!parsed) return;
    const ok = await confirmDialog({
      title: mode === 'replace' ? 'Ma’lumotlarni almashtirish' : 'Ma’lumotlarni birlashtirish',
      message:
        mode === 'replace'
          ? 'Qurilmadagi BARCHA joriy tranzaksiyalar, kategoriyalar va budjetlar o‘chirilib, zaxiradagi ma’lumotlar bilan almashtiriladi. Bu amalni bekor qilib bo‘lmaydi.'
          : 'Zaxiradagi ma’lumotlar mavjudlariga qo‘shiladi. Bir xil yozuvlardan yangirog‘i saqlanadi.',
      confirmLabel: mode === 'replace' ? 'Almashtirish' : 'Birlashtirish',
      danger: mode === 'replace',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await applyBackup(parsed, mode);
      if (withSettings && parsed.backup.settings) setSettings(parsed.backup.settings);
      toast.success('Zaxira muvaffaqiyatli tiklandi', `${parsed.stats.transactions} ta tranzaksiya, ${parsed.stats.categories} ta kategoriya`);
      close();
    } catch (e) {
      toast.error('Import amalga oshmadi', `${errorMessage(e)}. Mavjud ma’lumotlar o‘zgarmadi.`);
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Zaxiradan tiklash"
      description="Oldin saqlangan JSON zaxira faylini yuklang"
      footer={
        step === 'preview' ? (
          <>
            <button className="btn btn-secondary flex-1 sm:flex-none" onClick={reset}>Boshqa fayl</button>
            <button className={cn('btn flex-1 sm:flex-none', mode === 'replace' ? 'btn-danger' : 'btn-primary')} onClick={apply} disabled={busy}>
              {busy ? 'Tiklanmoqda…' : mode === 'replace' ? 'Almashtirish' : 'Birlashtirish'}
            </button>
          </>
        ) : step === 'password' ? (
          <>
            <button className="btn btn-secondary flex-1 sm:flex-none" onClick={reset}>Orqaga</button>
            <button type="submit" form="dec-form" className="btn btn-primary flex-1 sm:flex-none" disabled={busy || !password}>
              {busy ? 'Ochilmoqda…' : 'Ochish'}
            </button>
          </>
        ) : undefined
      }
    >
      {step === 'pick' && (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-10 text-center transition-colors hover:border-accent/50 hover:bg-accent/[0.03]"
            disabled={busy}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent"><FileUp size={22} /></span>
            <span className="font-semibold">{busy ? 'Tekshirilmoqda…' : 'Faylni tanlang'}</span>
            <span className="text-[13px] text-muted">personal-finance-….json (shifrlangan yoki oddiy)</span>
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          {error && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-expense/10 p-3 text-[13px] text-expense" role="alert">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </div>
      )}

      {step === 'password' && (
        <form id="dec-form" onSubmit={unlock} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><KeyRound size={18} /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{fileName}</p>
              <p className="text-[12px] text-muted">Fayl shifrlangan (AES-256-GCM)</p>
            </div>
          </div>
          <Field label="Zaxira paroli" htmlFor="dec-pass" error={error}>
            <input id="dec-pass" data-autofocus type="password" className={cn('input', error && 'input-error')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
        </form>
      )}

      {step === 'preview' && parsed && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-income/10 p-3">
            <ShieldCheck size={20} className="shrink-0 text-income" />
            <div className="min-w-0 text-[13px]">
              <p className="font-semibold text-ink">Fayl tekshirildi</p>
              <p className="text-muted truncate">
                {fileName}
                {parsed.backup.exportedAt && ` · ${formatDate(toISODate(new Date(parsed.backup.exportedAt)), dateFormat)}`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Tranzaksiya', parsed.stats.transactions],
              ['Kategoriya', parsed.stats.categories],
              ['Budjet', parsed.stats.budgets],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-line/70 p-3">
                <p className="tabular text-xl font-bold">{v}</p>
                <p className="text-[12px] text-muted">{l}</p>
              </div>
            ))}
          </div>
          {parsed.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 rounded-xl bg-warn/10 p-3 text-[13px] text-warn">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {w}
            </p>
          ))}
          <div>
            <span className="label">Import usuli</span>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              {(
                [
                  ['merge', 'Birlashtirish', 'Mavjud ma’lumotlar saqlanadi, zaxiradagilar qo‘shiladi'],
                  ['replace', 'Almashtirish', 'Joriy ma’lumotlar o‘chirilib, zaxira bilan almashtiriladi'],
                ] as const
              ).map(([v, t, d]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={mode === v}
                  onClick={() => setMode(v)}
                  className={cn('rounded-2xl border p-3 text-left transition-all', mode === v ? (v === 'replace' ? 'border-expense ring-2 ring-expense/20' : 'border-accent ring-2 ring-accent/20') : 'border-line hover:bg-surface-2/60')}
                >
                  <p className="text-sm font-semibold">{t}</p>
                  <p className="mt-0.5 text-[12px] text-muted leading-snug">{d}</p>
                </button>
              ))}
            </div>
          </div>
          {parsed.backup.settings && Object.keys(parsed.backup.settings).length > 0 && (
            <Switch checked={withSettings} onChange={setWithSettings} label="Sozlamalarni ham tiklash" description="Mavzu, rang, valyuta va formatlar" />
          )}
        </div>
      )}
    </Modal>
  );
}
