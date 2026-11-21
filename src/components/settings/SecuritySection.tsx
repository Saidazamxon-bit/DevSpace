import { useEffect, useState } from 'react';
import { Fingerprint, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PinPad } from '../PinPad';
import { Switch } from '../ui/primitives';
import { useSecurityConfig } from '@/hooks/useData';
import { biometricAvailable, disableBiometric, enableBiometric, pinSupported, removePin, setPin, verifyPin } from '@/services/security';
import { getSecurity, setSecurity } from '@/services/finance';
import { confirmDialog, errorMessage, toast, useLock } from '@/store/ui';
import { cn } from '@/utils/misc';

type Stage = 'current' | 'new' | 'confirm';

function PinSetupModal({ open, onClose, change }: { open: boolean; onClose: () => void; change: boolean }) {
  const [stage, setStage] = useState<Stage>('new');
  const [value, setValue] = useState('');
  const [first, setFirst] = useState('');
  const [length, setLength] = useState(4);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStage(change ? 'current' : 'new');
    setValue('');
    setFirst('');
    setError('');
    void getSecurity().then((c) => setLength(change ? c.pinLength : 4));
  }, [open, change]);

  async function complete(v: string) {
    setError('');
    if (stage === 'current') {
      setBusy(true);
      const ok = await verifyPin(v);
      setBusy(false);
      if (!ok) {
        setError('Joriy PIN noto‘g‘ri');
        setTimeout(() => setValue(''), 300);
        return;
      }
      setStage('new');
      setLength(4);
      setValue('');
      return;
    }
    if (stage === 'new') {
      setFirst(v);
      setStage('confirm');
      setValue('');
      return;
    }
    if (v !== first) {
      setError('PIN-kodlar mos kelmadi. Qaytadan kiriting.');
      setStage('new');
      setFirst('');
      setTimeout(() => setValue(''), 300);
      return;
    }
    setBusy(true);
    try {
      await setPin(v);
      toast.success(change ? 'PIN-kod o‘zgartirildi' : 'PIN-kod o‘rnatildi', 'Ilova ochilganda PIN so‘raladi.');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const title = stage === 'current' ? 'Joriy PIN-kodni kiriting' : stage === 'new' ? 'Yangi PIN-kodni kiriting' : 'PIN-kodni tasdiqlang';

  return (
    <Modal open={open} onClose={onClose} size="sm" title={change ? 'PIN-kodni o‘zgartirish' : 'PIN-kod o‘rnatish'}>
      <div className="pb-2">
        <p className="mb-1 text-center font-semibold">{title}</p>
        <p className={cn('mb-5 text-center text-[13px]', error ? 'text-expense' : 'text-muted')}>{error || (stage === 'new' ? 'Uzunligini tanlang' : ' ')}</p>
        {stage === 'new' && (
          <div className="mb-5 flex justify-center gap-2">
            {[4, 6].map((n) => (
              <button key={n} type="button" className={cn('chip', length === n && 'chip-active')} onClick={() => { setLength(n); setValue(''); }}>
                {n} raqam
              </button>
            ))}
          </div>
        )}
        <PinPad value={value} onChange={setValue} length={length} onComplete={complete} disabled={busy} error={!!error && value.length === length} />
      </div>
    </Modal>
  );
}

export function SecuritySection() {
  const cfg = useSecurityConfig();
  const setLocked = useLock((s) => s.setLocked);
  const [setup, setSetup] = useState<{ open: boolean; change: boolean }>({ open: false, change: false });
  const [bioAvail, setBioAvail] = useState(false);
  const supported = pinSupported();

  useEffect(() => {
    void biometricAvailable().then(setBioAvail);
  }, []);

  const hasPin = !!cfg?.pinHash;

  async function togglePin(v: boolean) {
    if (v) return setSetup({ open: true, change: false });
    const ok = await confirmDialog({ title: 'PIN-kodni o‘chirish', message: 'Ilova qulfi o‘chiriladi. Biometrik kirish ham o‘chadi.', confirmLabel: 'O‘chirish', danger: true });
    if (!ok) return;
    await removePin();
    toast.success('Ilova qulfi o‘chirildi');
  }

  async function toggleBio(v: boolean) {
    try {
      if (v) {
        await enableBiometric();
        toast.success('Biometrik kirish yoqildi');
      } else {
        await disableBiometric();
        toast.success('Biometrik kirish o‘chirildi');
      }
    } catch (e) {
      toast.error('Biometrik himoyani yoqib bo‘lmadi', e instanceof DOMException && e.name === 'NotAllowedError' ? 'Amal bekor qilindi yoki ruxsat berilmadi.' : errorMessage(e));
    }
  }

  async function setAutoLock(min: number) {
    const c = await getSecurity();
    await setSecurity({ ...c, autoLockMinutes: min });
  }

  if (!supported) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-warn/10 p-3 text-[13px] text-warn">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
        Bu brauzerda kriptografik funksiyalar mavjud emas (HTTPS talab qilinadi). PIN-kod himoyasi faqat xavfsiz ulanishda ishlaydi.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Switch checked={hasPin} onChange={togglePin} label="PIN-kod bilan qulflash" description="Ilova ochilganda 4 yoki 6 xonali PIN so‘raladi" />
      {hasPin && (
        <>
          <Switch
            checked={!!cfg?.biometricCredentialId}
            onChange={toggleBio}
            disabled={!bioAvail}
            label="Barmoq izi / Face ID"
            description={bioAvail ? 'Qurilmaning biometrik himoyasidan foydalanish' : 'Bu qurilma yoki brauzerda mavjud emas — PIN-koddan foydalaniladi'}
          />
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="autolock" className="min-w-0">
              <span className="block text-[15px] font-medium">Avtomatik qulflash</span>
              <span className="block text-[13px] text-muted">Ilova fonga o‘tgandan keyin</span>
            </label>
            <select id="autolock" className="input w-auto" value={cfg?.autoLockMinutes ?? 1} onChange={(e) => void setAutoLock(Number(e.target.value))}>
              <option value={0}>Darhol</option>
              <option value={1}>1 daqiqa</option>
              <option value={5}>5 daqiqa</option>
              <option value={15}>15 daqiqa</option>
              <option value={60}>1 soat</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => setSetup({ open: true, change: true })}>
              <KeyRound size={16} /> PIN-kodni o‘zgartirish
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setLocked(true)}>
              <Lock size={16} /> Hozir qulflash
            </button>
          </div>
        </>
      )}
      <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-[12.5px] leading-relaxed text-muted">
        <Fingerprint size={16} className="mt-0.5 shrink-0" />
        PIN-kod ilova interfeysiga kirishni cheklaydi, ammo brauzer xotirasidagi ma’lumotlarni shifrlamaydi. Qurilmaga to‘liq kirish huquqiga ega shaxsdan mutlaq himoya kafolatlanmaydi. Maxfiy nusxa uchun shifrlangan zaxiradan foydalaning.
      </p>
      <PinSetupModal open={setup.open} change={setup.change} onClose={() => setSetup({ open: false, change: false })} />
    </div>
  );
}
