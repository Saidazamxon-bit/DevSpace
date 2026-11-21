import { create } from 'zustand';
import type { DateRange, PeriodPreset } from '@/types';
import { rangeForPreset, startOfMonth, todayISO } from '@/utils/date';

interface PeriodState {
  preset: PeriodPreset;
  offset: number;
  custom: DateRange;
  setPreset: (p: PeriodPreset) => void;
  shift: (n: number) => void;
  setCustom: (r: DateRange) => void;
}

/** Bosh ekrandagi tanlangan davr (sessiya davomida eslab qolinadi) */
export const usePeriodStore = create<PeriodState>((set) => ({
  preset: 'month',
  offset: 0,
  custom: { from: startOfMonth(todayISO()), to: todayISO() },
  setPreset: (preset) => set({ preset, offset: 0 }),
  shift: (n) => set((s) => ({ offset: s.offset + n })),
  setCustom: (custom) => set({ custom }),
}));

export function periodRange(preset: PeriodPreset, offset: number, custom: DateRange): DateRange {
  return preset === 'custom' ? custom : rangeForPreset(preset, todayISO(), offset);
}
