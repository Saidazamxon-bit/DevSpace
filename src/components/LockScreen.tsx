import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { PinPad } from './PinPad';
import { useLock } from '@/store/ui';
import { useSecurityConfig } from '@/hooks/useData';
import { verifyBiometric, verifyPin } from '@/services/security';
import { Logo } from './Logo';

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

  // Biometrik yoqilgan bo‘lsa — avtomatik taklif qilish
  useEffect(() => {
    if (cfg?.biometricCredentialId && !triedBio.current) {
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
    <div className="hero fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 pt-[var(--safe-top)] pb-[var(--safe-bottom)] text-white" role="dialog" aria-modal="true" aria-label="Ilova qulflangan">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={56} />
        <h1 className="mt-4 text-xl font-bold">Personal Finance</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
          <Lock size={14} />
          {waiting ? `Juda ko‘p urinish. ${Math.ceil((lockedUntil - now) / 1000)} soniya kuting` : wrong ? 'PIN noto‘g‘ri, qayta urinib ko‘ring' : 'PIN-kodni kiriting'}
        </p>
      </div>
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
  );
}
