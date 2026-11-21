import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/primitives';
import { cn } from '@/utils/misc';

/** Shifrlangan zaxira uchun parol so‘rash */
export function PasswordDialog({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (password: string) => Promise<void> }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setP1('');
      setP2('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (p1.length < 8) return setError('Parol kamida 8 ta belgidan iborat bo‘lsin');
    if (p1 !== p2) return setError('Parollar mos kelmadi');
    setBusy(true);
    try {
      await onSubmit(p1);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Shifrlangan zaxira"
      description="Fayl AES-256 bilan shifrlanadi. Parolni unutsangiz, zaxirani tiklab bo‘lmaydi."
      footer={
        <>
          <button className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="enc-form" className="btn btn-primary flex-1 sm:flex-none" disabled={busy}>{busy ? 'Shifrlanmoqda…' : 'Yuklab olish'}</button>
        </>
      }
    >
      <form id="enc-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Parol" htmlFor="enc-p1">
          <input id="enc-p1" data-autofocus type="password" autoComplete="new-password" className={cn('input', error && 'input-error')} value={p1} onChange={(e) => { setP1(e.target.value); setError(''); }} />
        </Field>
        <Field label="Parolni takrorlang" htmlFor="enc-p2" error={error}>
          <input id="enc-p2" type="password" autoComplete="new-password" className={cn('input', error && 'input-error')} value={p2} onChange={(e) => { setP2(e.target.value); setError(''); }} />
        </Field>
      </form>
    </Modal>
  );
}
