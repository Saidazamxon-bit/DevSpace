import type { ISODate, Recurring } from '@/types';
import { addDays, endOfMonth, fromISODate, MONTHS, WEEKDAYS } from './date';

const pad = (n: number) => n.toString().padStart(2, '0');

/** `from` sanasidan boshlab (shu kun ham) keyingi takrorlanish sanasi */
export function occurrenceOnOrAfter(r: Pick<Recurring, 'freq' | 'startDate'>, from: ISODate): ISODate {
  if (from < r.startDate) from = r.startDate;
  if (r.freq === 'weekly') {
    const want = fromISODate(r.startDate).getDay();
    const have = fromISODate(from).getDay();
    return addDays(from, (want - have + 7) % 7);
  }
  // Har oy: boshlang‘ich sananing kuni; qisqa oylarda — oyning oxirgi kuni
  const day = Number(r.startDate.slice(8, 10));
  const inMonth = (ym: string) => {
    const last = Number(endOfMonth(`${ym}-01`).slice(8, 10));
    return `${ym}-${pad(Math.min(day, last))}`;
  };
  const ym = from.slice(0, 7);
  const cand = inMonth(ym);
  if (cand >= from) return cand;
  const d = fromISODate(`${ym}-01`);
  d.setMonth(d.getMonth() + 1);
  return inMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
}

/** Navbatdagi (hali qayd etilmagan) sana */
export function nextDue(r: Recurring): ISODate {
  return occurrenceOnOrAfter(r, r.lastDate ? addDays(r.lastDate, 1) : r.startDate);
}

/** Muddati kelgan (bugun yoki undan oldin) faol doimiy to‘lovlar, eng eskisi birinchi */
export function dueRecurring(list: Recurring[], today: ISODate): { rec: Recurring; date: ISODate }[] {
  return list
    .filter((r) => r.active)
    .map((r) => ({ rec: r, date: nextDue(r) }))
    .filter((x) => x.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function describeFreq(r: Pick<Recurring, 'freq' | 'startDate'>): string {
  const d = fromISODate(r.startDate);
  if (r.freq === 'weekly') return `Har hafta, ${WEEKDAYS[d.getDay()].toLowerCase()}`;
  return `Har oy, ${d.getDate()}-kuni`;
}

export function describeDue(date: ISODate, today: ISODate): string {
  if (date === today) return 'bugun';
  if (date === addDays(today, -1)) return 'kecha';
  if (date === addDays(today, 1)) return 'ertaga';
  const d = fromISODate(date);
  return `${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()}`;
}
