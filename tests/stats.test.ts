import { describe, expect, it } from 'vitest';
import { budgetStatuses, buildSeries, byCategory, computeBalance, computeTotals, financialHealth } from '../src/utils/stats';
import { addMonths, endOfMonth, formatDate, isValidISODate, rangeForPreset, startOfWeek } from '../src/utils/date';
import type { Category, Transaction } from '../src/types';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  type: 'expense',
  amount: 100,
  categoryId: 'exp-food',
  date: '2026-11-10',
  note: '',
  paymentMethod: 'card',
  createdAt: 1,
  updatedAt: 1,
  ...p,
});

const cats = new Map<string, Category>([
  ['exp-food', { id: 'exp-food', name: 'Oziq-ovqat', type: 'expense', icon: 'x', color: '#000000', order: 0, isDefault: true, createdAt: 0, updatedAt: 0 }],
  ['exp-transport', { id: 'exp-transport', name: 'Transport', type: 'expense', icon: 'x', color: '#000000', order: 1, isDefault: true, createdAt: 0, updatedAt: 0 }],
]);

const list = [
  tx({ type: 'income', amount: 1_000_000_00, categoryId: 'inc-salary', date: '2026-11-01' }),
  tx({ amount: 150_000_00, categoryId: 'exp-food', date: '2026-11-03' }),
  tx({ amount: 50_000_00, categoryId: 'exp-transport', date: '2026-11-05' }),
  tx({ amount: 30_000_00, categoryId: 'exp-food', date: '2026-10-28' }),
];

describe('hisob-kitoblar', () => {
  it('balans = boshlang‘ich + daromad − xarajat', () => {
    expect(computeBalance(200_000_00, list)).toBe(200_000_00 + 1_000_000_00 - 230_000_00);
  });
  it('sof natija', () => {
    const t = computeTotals(list);
    expect(t.income).toBe(1_000_000_00);
    expect(t.expense).toBe(230_000_00);
    expect(t.net).toBe(770_000_00);
  });
  it('kategoriyalar bo‘yicha taqsimot', () => {
    const s = byCategory(list, 'expense', cats);
    expect(s[0].categoryId).toBe('exp-food');
    expect(s[0].total).toBe(180_000_00);
    expect(Math.round(s.reduce((a, b) => a + b.percent, 0))).toBe(100);
  });
  it('vaqt qatori: bo‘sh kunlar nol bilan', () => {
    const s = buildSeries(list, { from: '2026-11-01', to: '2026-11-30' });
    expect(s).toHaveLength(30);
    expect(s[0].income).toBe(1_000_000_00);
    expect(s[2].expense).toBe(150_000_00);
    expect(s[1].expense).toBe(0);
    const m = buildSeries(list, { from: '2026-01-01', to: '2026-12-31' });
    expect(m).toHaveLength(12);
    expect(m[9].expense).toBe(30_000_00);
  });
  it('budjet qoldig‘i = limit − sarflangan', () => {
    const [s] = budgetStatuses(
      [{ id: 'b', categoryId: 'exp-food', limit: 200_000_00, createdAt: 0, updatedAt: 0 }],
      list,
      '2026-11-15',
      cats,
      80,
    );
    expect(s.spent).toBe(150_000_00);
    expect(s.remaining).toBe(50_000_00);
    expect(s.percent).toBe(75);
    expect(s.state).toBe('ok');
    const [w] = budgetStatuses([{ id: 'b', categoryId: 'exp-food', limit: 160_000_00, createdAt: 0, updatedAt: 0 }], list, '2026-11-15', cats, 80);
    expect(w.state).toBe('warn');
    const [o] = budgetStatuses([{ id: 'b', categoryId: 'exp-food', limit: 100_000_00, createdAt: 0, updatedAt: 0 }], list, '2026-11-15', cats, 80);
    expect(o.state).toBe('over');
    expect(o.remaining).toBe(-50_000_00);
  });
  it('moliyaviy holat', () => {
    expect(financialHealth(computeTotals(list)).level).toBe('good');
    expect(financialHealth(computeTotals([])).level).toBe('none');
  });
});

describe('sanalar', () => {
  it('hafta dushanbadan boshlanadi', () => {
    expect(startOfWeek('2026-11-21')).toBe('2026-11-16'); // shanba → dushanba
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16');
  });
  it('oy oxiri va oylar qo‘shish', () => {
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(rangeForPreset('year', '2026-05-05')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
  it('formatlar va tekshiruv', () => {
    expect(formatDate('2026-11-21', 'D MMMM YYYY')).toBe('21-noyabr, 2026');
    expect(formatDate('2026-11-21', 'DD.MM.YYYY')).toBe('21.11.2026');
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
  });
});
