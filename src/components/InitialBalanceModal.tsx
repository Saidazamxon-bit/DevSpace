import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Field } from './ui/primitives';
import { MoneyInput, parseSignedMoney } from './MoneyInput';
import { setInitialBalance } from '@/services/finance';
import { toast, errorMessage } from '@/store/ui';
import { useSettings } from '@/store/settings';
import { minorToInput } from '@/utils/money';

export function InitialBalanceModal({ open, onClose, current }: { open: boolean; onClose: () => void; current: number }) {
  const numberFormat = useSettings((s) => s.numberFormat);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setValue(current ? (current < 0 ? '−' : '') + minorToInput(Math.abs(current), numberFormat) : '');
      setError('');
    }
  }, [open, current, numberFormat]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = parseSignedMoney(value);
    if (!r.ok) return setError(r.error);
    try {
      await setInitialBalance(r.value);
      toast.success('Boshlang‘ich balans saqlandi');
      onClose();
    } catch (err) {
      toast.error('Saqlab bo‘lmadi', errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Boshlang‘ich balans"
      description="Ilovadan foydalanishni boshlagan paytdagi umumiy mablag‘ingiz (naqd + karta)."
      footer={
        <>
          <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" form="ib-form" className="btn btn-primary flex-1 sm:flex-none">
            Saqlash
          </button>
        </>
      }
    >
      <form id="ib-form" onSubmit={save} noValidate>
        <Field label="Summa" htmlFor="ib" error={error} hint="Qarz bo‘lsa, minus belgisi bilan kiriting.">
          <MoneyInput id="ib" value={value} onChange={setValue} large autoFocus allowNegative error={!!error} />
        </Field>
      </form>
    </Modal>
  );
}
