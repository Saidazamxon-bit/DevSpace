import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Settings } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'green',
  density: 'comfortable',
  animations: true,
  sidebarCollapsed: false,
  currency: 'UZS',
  dateFormat: 'DD.MM.YYYY',
  numberFormat: 'space',
  startPage: '/',
  budgetWarnPercent: 80,
};

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

/** Kichik interfeys sozlamalari — localStorage’da (moliyaviy ma’lumotlar esa IndexedDB’da) */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'pf-settings',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          const k = '__pf_test';
          localStorage.setItem(k, '1');
          localStorage.removeItem(k);
          return localStorage;
        } catch {
          // Maxfiy rejim va h.k. — xotirada ishlaymiz
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          };
        }
      }),
      partialize: (s) => {
        const { set: _s, reset: _r, ...rest } = s;
        return rest;
      },
      merge: (persisted, current) => ({ ...current, ...((persisted as Partial<Settings>) ?? {}) }),
    },
  ),
);

export function pickSettings(s: Settings): Settings {
  return {
    theme: s.theme,
    accent: s.accent,
    density: s.density,
    animations: s.animations,
    sidebarCollapsed: s.sidebarCollapsed,
    currency: s.currency,
    dateFormat: s.dateFormat,
    numberFormat: s.numberFormat,
    startPage: s.startPage,
    budgetWarnPercent: s.budgetWarnPercent,
  };
}
