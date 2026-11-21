import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, ScanFace } from 'lucide-react';
import { PinPad } from './PinPad';
import { useLock } from '@/store/ui';
import { useSecurityConfig } from '@/hooks/useData';
import { verifyBiometric, verifyPin } from '@/services/security';
import { formatLongToday } from '@/utils/date';
import { isIOS } from '@/store/pwa';
import { cn } from '@/utils/misc';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

/** Ilova qulflangan holatdagi ekran */
export function LockScreen() {
  const setLocked = useLock((s) => s.setLocked);
  const cfg = useSecurityConfig();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const triedBio = useRef(false);

  useEffect(() => {
    if (!lockedUntil) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [lockedUntil]);

  const bio = useCallback(async () => {
    setBusy(true);
    const ok = await verifyBiometric();
    setBusy(false);
    if (ok) setLocked(false);
  }, [setLocked]);

  // Biometrik yoqilgan bo‘lsa — avtomatik taklif qilish.
  // iPhone’da foydalanuvchi teginmasdan chaqirilsa, Safari qo‘shimcha “Use Passkey” oynasini
  // chiqaradi. Shuning uchun iPhone’da Face ID ekranga birinchi teginishda darhol ishga tushadi.
  const bioOnTouch = !!cfg?.biometricCredentialId && isIOS();
  useEffect(() => {
    if (cfg?.biometricCredentialId && !triedBio.current && !isIOS()) {
      triedBio.current = true;
      void bio();
    }
  }, [cfg?.biometricCredentialId, bio]);

  const waiting = lockedUntil > now;

  async function check(value: string) {
    setBusy(true);
    const ok = await verifyPin(value);
    setBusy(false);
    if (ok) {
      setLocked(false);
      return;
    }
    setError(true);
    setWrong(true);
    const n = attempts + 1;
    setAttempts(n);
    if (n >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setNow(Date.now());
      setAttempts(0);
    }
    // Darhol tozalaymiz — foydalanuvchi kutmasdan qayta kirita oladi
    setPin('');
    window.setTimeout(() => setError(false), 400);
  }

  return (
    <div
      className="no-scrollbar fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto px-6 pb-[calc(var(--safe-bottom)+1rem)] pt-[calc(var(--safe-top)+min(2.5rem,4dvh))] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Ilova qulflangan"
      style={{
        background:
          'radial-gradient(90% 60% at 20% 10%, rgb(var(--accent) / 0.95), transparent 70%), radial-gradient(80% 60% at 90% 90%, rgb(var(--accent) / 0.55), transparent 70%), #0b1712',
      }}
    >
      {/* iPhone’da yuqori qismning istalgan joyiga teginish — Face ID */}
      <div
        className={cn('flex w-full flex-col items-center', bioOnTouch && 'flex-1 cursor-pointer')}
        onClick={bioOnTouch && !busy ? () => void bio() : undefined}
      >
        <Clock />
        <div className="mt-[min(24px,2.5dvh)] flex flex-col items-center text-center">
          {bioOnTouch ? (
            <button
              type="button"
              className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur transition-transform active:scale-95"
              aria-label="Face ID bilan ochish"
              disabled={busy}
            >
              <ScanFace size={32} className={busy ? 'animate-pulse' : undefined} />
            </button>
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur">
              <Lock size={18} />
            </span>
          )}
          <p className="mt-3 text-[17px] font-semibold">
            {waiting
              ? `${Math.ceil((lockedUntil - now) / 1000)} soniya kuting`
              : wrong
                ? 'PIN noto‘g‘ri, qayta urinib ko‘ring'
                : bioOnTouch
                  ? 'Ochish uchun ekranga teging'
                  : 'PIN-kodni kiriting'}
          </p>
          <p className="mt-0.5 text-[13px] text-white/65">
            {waiting ? 'Juda ko‘p noto‘g‘ri urinish' : bioOnTouch ? 'Face ID yoki pastda PIN-kod' : 'Personal Finance'}
          </p>
        </div>
      </div>
      <div className="mt-auto pt-4">
        {cfg && (
          <PinPad
            dark
            value={pin}
            onChange={(v) => {
              setPin(v);
              if (v.length > 0) {
                setWrong(false);
                setError(false);
              }
            }}
            length={cfg.pinLength}
            onComplete={check}
            error={error}
            disabled={busy || waiting}
            onBiometric={cfg.biometricCredentialId ? () => void bio() : undefined}
          />
        )}
      </div>
      {cfg?.biometricCredentialId && !bioOnTouch && (
        <button type="button" onClick={() => void bio()} className="mt-3 text-[14px] font-medium text-white/80">
          Face ID / barmoq izi bilan ochish
        </button>
      )}
    </div>
  );
}

/** Qulf ekranidagi katta soat va sana (iPhone uslubi) */
function Clock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setD(new Date()), 10_000);
    return () => window.clearInterval(t);
  }, []);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return (
    <div className="text-center">
      <p className="text-[15px] font-medium text-white/80">{formatLongToday(d)}</p>
      <p className="mt-1 text-[min(76px,9dvh)] font-semibold leading-none tracking-tight tabular">
        {hh}:{mm}
      </p>
    </div>
  );
}
