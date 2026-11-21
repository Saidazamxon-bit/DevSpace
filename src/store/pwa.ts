import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  update: (() => Promise<void>) | null;
  checkForUpdate: (() => Promise<void>) | null;
  set: (p: Partial<PwaState>) => void;
}

export const usePwa = create<PwaState>((set) => ({
  installEvent: null,
  installed: false,
  needRefresh: false,
  offlineReady: false,
  update: null,
  checkForUpdate: null,
  set: (p) => set(p),
}));

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

// Brauzer o‘rnatish taklifini ushlab qolamiz (Chrome / Edge / Android)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwa.getState().set({ installEvent: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => usePwa.getState().set({ installEvent: null, installed: true }));
}
