import { useMemo, useState } from 'react';
import type { DateRange, PeriodPreset } from '@/types';
import { rangeForPreset, todayISO, startOfMonth } from '@/utils/date';

export function usePeriod(initial: PeriodPreset = 'month') {
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [custom, setCustom] = useState<DateRange>(() => ({ from: startOfMonth(todayISO()), to: todayISO() }));
  const range = useMemo<DateRange>(() => (preset === 'custom' ? custom : rangeForPreset(preset)), [preset, custom]);
  return { preset, setPreset, custom, setCustom, range };
}
