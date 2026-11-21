import type { Budget, Category, DateRange, ISODate, Minor, Transaction, TxType } from '@/types';
import { addDays, addMonths, daysBetween, endOfMonth, fromISODate, MONTHS_SHORT, monthKey, startOfMonth, WEEKDAYS_SHORT } from './date';

export interface Totals {
  income: Minor;
  expense: Minor;
  net: Minor;
  count: number;
}

export function computeTotals(txs: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense, count: txs.length };
}

/** Umumiy balans = boshlang‘ich balans + jami daromad − jami xarajat */
export function computeBalance(initial: Minor, txs: Transaction[], upTo?: ISODate): Minor {
  let bal = initial;
  for (const t of txs) {
    if (upTo && t.date > upTo) continue;
    bal += t.type === 'income' ? t.amount : -t.amount;
  }
  return bal;
}

export function inRange(txs: Transaction[], r: DateRange): Transaction[] {
  return txs.filter((t) => t.date >= r.from && t.date <= r.to);
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: Minor;
  count: number;
  percent: number;
}

export function byCategory(txs: Transaction[], type: TxType, categories: Map<string, Category>): CategorySlice[] {
  const acc = new Map<string, { total: number; count: number }>();
  let sum = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    const a = acc.get(t.categoryId) ?? { total: 0, count: 0 };
    a.total += t.amount;
    a.count += 1;
    acc.set(t.categoryId, a);
    sum += t.amount;
  }
  return [...acc.entries()]
    .map(([id, a]) => {
      const c = categories.get(id);
      return {
        categoryId: id,
        name: c?.name ?? 'Noma’lum',
        color: c?.color ?? '#94a3b8',
        icon: c?.icon ?? 'more',
        total: a.total,
        count: a.count,
        percent: sum ? (a.total / sum) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Ko‘p kategoriyalarni “Boshqalar”ga yig‘ish (grafikda 6 tadan ortiq rang bo‘lmasligi uchun) */
export function foldSlices(slices: CategorySlice[], max = 6): CategorySlice[] {
  if (slices.length <= max) return slices;
  const head = slices.slice(0, max - 1);
  const tail = slices.slice(max - 1);
  const total = tail.reduce((s, x) => s + x.total, 0);
  return [
    ...head,
    {
      categoryId: '__other',
      name: 'Boshqalar',
      color: '#94a3b8',
      icon: 'more',
      total,
      count: tail.reduce((s, x) => s + x.count, 0),
      percent: tail.reduce((s, x) => s + x.percent, 0),
    },
  ];
}

export interface SeriesPoint {
  key: string;
  label: string;
  /** Tooltip uchun to‘liq nom */
  fullLabel: string;
  income: Minor;
  expense: Minor;
  net: Minor;
}

export type Granularity = 'day' | 'month';

export function pickGranularity(r: DateRange): Granularity {
  return daysBetween(r.from, r.to) <= 62 ? 'day' : 'month';
}

/** Davr bo‘yicha vaqt qatori: kunlik yoki oylik bo‘laklar, bo‘sh bo‘laklar ham nol bilan to‘ldiriladi */
export function buildSeries(txs: Transaction[], r: DateRange, gran: Granularity = pickGranularity(r)): SeriesPoint[] {
  const points = new Map<string, SeriesPoint>();
  const short = daysBetween(r.from, r.to) <= 7;
  if (gran === 'day') {
    for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
      const dt = fromISODate(d);
      points.set(d, {
        key: d,
        label: short ? WEEKDAYS_SHORT[dt.getDay()] : String(dt.getDate()),
        fullLabel: `${dt.getDate()}-${MONTHS_SHORT[dt.getMonth()].toLowerCase()} ${dt.getFullYear()}`,
        income: 0,
        expense: 0,
        net: 0,
      });
    }
  } else {
    for (let m = startOfMonth(r.from); m <= r.to; m = addMonths(m, 1)) {
      const dt = fromISODate(m);
      points.set(monthKey(m), {
        key: monthKey(m),
        label: MONTHS_SHORT[dt.getMonth()],
        fullLabel: `${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear()}`,
        income: 0,
        expense: 0,
        net: 0,
      });
    }
  }
  for (const t of txs) {
    if (t.date < r.from || t.date > r.to) continue;
    const p = points.get(gran === 'day' ? t.date : monthKey(t.date));
    if (!p) continue;
    if (t.type === 'income') p.income += t.amount;
    else p.expense += t.amount;
  }
  for (const p of points.values()) p.net = p.income - p.expense;
  return [...points.values()];
}

/** Oxirgi N oy (joriy oy bilan birga) */
export function lastMonthsRange(n: number, today: ISODate): DateRange {
  return { from: startOfMonth(addMonths(today, -(n - 1))), to: endOfMonth(today) };
}

export type BudgetState = 'ok' | 'warn' | 'over';

export interface BudgetStatus {
  budget: Budget;
  category?: Category;
  spent: Minor;
  remaining: Minor;
  percent: number;
  state: BudgetState;
}

/** Budjet qoldig‘i = belgilangan limit − sarflangan summa (berilgan oy uchun) */
export function budgetStatuses(
  budgets: Budget[],
  txs: Transaction[],
  month: ISODate,
  categories: Map<string, Category>,
  warnPercent: number,
): BudgetStatus[] {
  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const spentBy = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense' || t.date < from || t.date > to) continue;
    spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount);
  }
  return budgets.map((b) => {
    const spent = spentBy.get(b.categoryId) ?? 0;
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    return {
      budget: b,
      category: categories.get(b.categoryId),
      spent,
      remaining: b.limit - spent,
      percent: pct,
      state: pct > 100 ? 'over' : pct >= warnPercent ? 'warn' : 'ok',
    };
  });
}

export interface Health {
  /** Jamg‘arma ulushi, % */
  savingsRate: number;
  level: 'none' | 'good' | 'fair' | 'poor';
  title: string;
  message: string;
}

export function financialHealth(t: Totals): Health {
  if (t.income === 0 && t.expense === 0)
    return { savingsRate: 0, level: 'none', title: 'Ma’lumot yetarli emas', message: 'Bu davrda hali operatsiyalar yo‘q.' };
  if (t.income === 0)
    return { savingsRate: -100, level: 'poor', title: 'Diqqat talab qiladi', message: 'Bu davrda daromad qayd etilmagan, faqat xarajatlar bor.' };
  const rate = (t.net / t.income) * 100;
  if (rate >= 20) return { savingsRate: rate, level: 'good', title: 'Yaxshi holat', message: 'Daromadingizning katta qismi tejalmoqda. Shunday davom eting!' };
  if (rate >= 0) return { savingsRate: rate, level: 'fair', title: 'Barqaror', message: 'Xarajatlar daromad doirasida. Tejash ulushini 20% ga yetkazishga harakat qiling.' };
  return { savingsRate: rate, level: 'poor', title: 'Xarajat daromaddan oshgan', message: 'Bu davrda sarflaringiz daromaddan ko‘p. Budjetlarni ko‘rib chiqing.' };
}
