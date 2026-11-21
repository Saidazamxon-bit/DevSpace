import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const UIContext = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  /** Promise-based confirmation dialog. */
  const confirm = useCallback((opts) => new Promise((resolve) => {
    setDialog({ title: 'Are you sure?', confirmLabel: 'Confirm', danger: false, ...opts, resolve });
  }), []);

  const close = (result) => { dialog?.resolve(result); setDialog(null); };
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={18} />
              <span>{t.message}</span>
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
            </div>
          );
        })}
      </div>
      <Modal open={!!dialog} onClose={() => close(false)} title={dialog?.title} size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
            <Button variant={dialog?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>{dialog?.confirmLabel}</Button>
          </>
        )}>
        <p className="muted">{dialog?.message}</p>
      </Modal>
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
