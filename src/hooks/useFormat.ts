import { useCallback } from 'react';
import { useSettings } from '@/store/settings';
import { formatMoney, type FormatOptions } from '@/utils/money';
import { formatDate, formatDayHeading } from '@/utils/date';
import type { ISODate, Minor } from '@/types';

export function useFormat() {
  const currency = useSettings((s) => s.currency);
  const numberFormat = useSettings((s) => s.numberFormat);
  const dateFormat = useSettings((s) => s.dateFormat);

  const money = useCallback(
    (minor: Minor, opts: Omit<FormatOptions, 'currency' | 'numberFormat'> = {}) => formatMoney(minor, { currency, numberFormat, ...opts }),
    [currency, numberFormat],
  );
  const date = useCallback((d: ISODate) => formatDate(d, dateFormat), [dateFormat]);
  const day = useCallback((d: ISODate) => formatDayHeading(d, dateFormat), [dateFormat]);
  return { money, date, day, currency, numberFormat, dateFormat };
}
