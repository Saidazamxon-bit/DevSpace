import { create } from 'zustand';
import type { RecurringFreq, Transaction, TxType } from '@/types';

// ───────── Toast ─────────
export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}
interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}
let toastSeq = 1;
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, duration: t.duration ?? 3800, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string, action?: Toast['action']) => useToasts.getState().push({ kind: 'success', title, message, action, duration: action ? 6000 : undefined }),
  error: (title: string, message?: string) => useToasts.getState().push({ kind: 'error', title, message, duration: 5500 }),
  info: (title: string, message?: string, action?: Toast['action']) => useToasts.getState().push({ kind: 'info', title, message, action, duration: action ? 12000 : undefined }),
  warning: (title: string, message?: string) => useToasts.getState().push({ kind: 'warning', title, message, duration: 6000 }),
};

export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Noma’lum xatolik yuz berdi';
}

// ───────── Tasdiqlash oynasi ─────────
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
interface ConfirmState {
  current: (ConfirmOptions & { resolve: (v: boolean) => void }) | null;
  open: (o: ConfirmOptions) => Promise<boolean>;
  close: (v: boolean) => void;
}
export const useConfirm = create<ConfirmState>((set, get) => ({
  current: null,
  open: (o) =>
    new Promise<boolean>((resolve) => {
      get().current?.resolve(false);
      set({ current: { ...o, resolve } });
    }),
  close: (v) => {
    get().current?.resolve(v);
    set({ current: null });
  },
}));
export const confirmDialog = (o: ConfirmOptions) => useConfirm.getState().open(o);

// ───────── Tranzaksiya formasi ─────────
interface TxFormState {
  open: boolean;
  type: TxType;
  categoryId: string | null;
  repeat: RecurringFreq | null;
  editing: Transaction | null;
  openNew: (type?: TxType, categoryId?: string, repeat?: RecurringFreq) => void;
  openEdit: (tx: Transaction) => void;
  close: () => void;
}
export const useTxForm = create<TxFormState>((set) => ({
  open: false,
  type: 'expense',
  categoryId: null,
  repeat: null,
  editing: null,
  openNew: (type = 'expense', categoryId, repeat) => set({ open: true, type, categoryId: categoryId ?? null, repeat: repeat ?? null, editing: null }),
  openEdit: (tx) => set({ open: true, type: tx.type, editing: tx }),
  close: () => set({ open: false }),
}));

// ───────── Qulf ─────────
interface LockState {
  locked: boolean;
  ready: boolean;
  setLocked: (v: boolean) => void;
  setReady: () => void;
}
export const useLock = create<LockState>((set) => ({
  locked: false,
  ready: false,
  setLocked: (locked) => set({ locked }),
  setReady: () => set({ ready: true }),
}));

// ───────── Mobil menyu ─────────
interface NavState {
  drawer: boolean;
  setDrawer: (v: boolean) => void;
}
export const useNav = create<NavState>((set) => ({ drawer: false, setDrawer: (drawer) => set({ drawer }) }));
