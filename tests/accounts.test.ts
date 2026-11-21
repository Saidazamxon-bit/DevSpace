import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, FinanceDB } from '../src/database/db';
import {
  accountFlow, addAccount, addRecurring, addTransaction, addTransfer, confirmRecurring, deleteAccount, skipRecurring, updateAccount, wipeAllData,
} from '../src/services/finance';
import { applyBackup, buildBackup, validateBackup } from '../src/services/backup';
import { accountBalances } from '../src/utils/stats';
import { dueRecurring, nextDue, occurrenceOnOrAfter } from '../src/utils/recurring';
import { applyPadKey, evaluateMinor, type PadKey } from '../src/utils/keypad';
import type { Recurring } from '../src/types';

beforeEach(async () => {
  await db.open();
  await wipeAllData();
});

const balances = async () => {
  const m = accountBalances(await db.accounts.toArray(), await db.transactions.toArray(), await db.transfers.toArray());
  return Object.fromEntries(m);
};

describe('hisoblar', () => {
  it('standart hisoblar: Karta, Naqd, Jamg‘arma', async () => {
    const names = (await db.accounts.orderBy('order').toArray()).map((a) => a.name);
    expect(names).toEqual(['Karta', 'Naqd', 'Jamg‘arma']);
  });

  it('qoldiqlar: daromad, xarajat va o‘tkazma', async () => {
    await addTransaction({ type: 'income', amount: 1_000_00, categoryId: 'inc-salary', accountId: 'acc-card', date: '2026-11-01' });
    await addTransaction({ type: 'expense', amount: 200_00, categoryId: 'exp-food', accountId: 'acc-cash', date: '2026-11-02' });
    await addTransfer({ fromId: 'acc-card', toId: 'acc-savings', amount: 300_00, date: '2026-11-03' });
    expect(await balances()).toEqual({ 'acc-card': 700_00, 'acc-cash': -200_00, 'acc-savings': 300_00 });
    await expect(addTransfer({ fromId: 'acc-card', toId: 'acc-card', amount: 1, date: '2026-11-03' })).rejects.toThrow();
  });

  it('joriy qoldiqni to‘g‘rilash boshlang‘ich qoldiqni hisoblaydi', async () => {
    await addTransaction({ type: 'expense', amount: 50_00, categoryId: 'exp-food', accountId: 'acc-cash', date: '2026-11-02' });
    await updateAccount('acc-cash', { name: 'Naqd', kind: 'cash', icon: 'banknote', color: '#1baf7a', currentBalance: 500_00 });
    expect((await balances())['acc-cash']).toBe(500_00);
    expect(await accountFlow('acc-cash')).toBe(-50_00);
  });

  it('yangi hisob va o‘chirish (yozuvlar ko‘chiriladi, jami balans o‘zgarmaydi)', async () => {
    const a = await addAccount({ name: 'Humo', kind: 'card', icon: 'credit-card', color: '#6250d6', currentBalance: 100_00 });
    await addTransaction({ type: 'expense', amount: 30_00, categoryId: 'exp-food', accountId: a.id, date: '2026-11-02' });
    await addTransfer({ fromId: a.id, toId: 'acc-card', amount: 10_00, date: '2026-11-03' });
    const total = Object.values(await balances()).reduce((s, x) => s + x, 0);
    await expect(deleteAccount(a.id)).rejects.toThrow();
    await deleteAccount(a.id, 'acc-cash');
    const after = await balances();
    expect(after[a.id]).toBeUndefined();
    expect(Object.values(after).reduce((s, x) => s + x, 0)).toBe(total);
    expect(await db.transfers.count()).toBe(1);
    await expect(addAccount({ name: 'karta', kind: 'card', icon: 'x', color: '#000000' })).rejects.toThrow();
  });
});

describe('doimiy to‘lovlar', () => {
  const rec = (p: Partial<Recurring>): Recurring => ({
    id: 'r', type: 'expense', amount: 100, categoryId: 'exp-housing', accountId: 'acc-card', note: '', freq: 'monthly',
    startDate: '2026-01-31', lastDate: null, active: true, createdAt: 0, updatedAt: 0, ...p,
  });
  it('har oy: qisqa oylarda oyning oxirgi kuni', () => {
    expect(nextDue(rec({}))).toBe('2026-01-31');
    expect(nextDue(rec({ lastDate: '2026-01-31' }))).toBe('2026-02-28');
    expect(nextDue(rec({ lastDate: '2026-02-28' }))).toBe('2026-03-31');
  });
  it('har hafta: bir xil hafta kuni', () => {
    const r = rec({ freq: 'weekly', startDate: '2026-11-16' }); // dushanba
    expect(occurrenceOnOrAfter(r, '2026-11-18')).toBe('2026-11-23');
    expect(nextDue({ ...r, lastDate: '2026-11-16' })).toBe('2026-11-23');
  });
  it('muddati kelganlar, tasdiqlash va o‘tkazib yuborish', async () => {
    const r = await addRecurring({ type: 'expense', amount: 2_800_000_00, categoryId: 'exp-housing', accountId: 'acc-card', freq: 'monthly', startDate: '2026-09-05', lastDate: '2026-09-05' });
    let due = dueRecurring(await db.recurring.toArray(), '2026-11-21');
    expect(due.map((d) => d.date)).toEqual(['2026-10-05']);
    await confirmRecurring(r.id, '2026-10-05');
    expect(await db.transactions.where('accountId').equals('acc-card').count()).toBe(1);
    due = dueRecurring(await db.recurring.toArray(), '2026-11-21');
    expect(due[0].date).toBe('2026-11-05');
    await skipRecurring(r.id, '2026-11-05');
    expect(dueRecurring(await db.recurring.toArray(), '2026-11-21')).toEqual([]);
    expect(await db.transactions.count()).toBe(1);
  });
});

describe('klaviaturada hisoblash', () => {
  const type = (keys: PadKey[]) => keys.reduce((v, k) => applyPadKey(v, k, 'space'), '');
  it('45 000 + 12 000 − 5 000', () => {
    const v = type(['4', '5', '000', 'plus', '1', '2', '000', 'minus', '5', '000']);
    expect(v).toBe('45 000+12 000−5 000');
    expect(evaluateMinor(v, 'space')).toBe(52_000_00);
    expect(type(['4', '5', '000', 'plus', '1', '2', '000', 'equals'])).toBe('57 000');
  });
  it('amalni almashtirish va o‘chirish', () => {
    expect(type(['5', 'plus', 'minus'])).toBe('5−');
    expect(type(['5', 'plus', '3', 'back', 'back'])).toBe('5');
    expect(type(['plus'])).toBe('');
    expect(type(['1', 'dec', '5', 'plus', '0', 'dec', '2', '5'])).toBe('1,5+0,25');
    expect(evaluateMinor('1,5+0,25', 'space')).toBe(175);
  });
});

describe('migratsiya v2 → v3 va eski zaxira', () => {
  it('eski yozuvlar to‘lov turiga qarab hisobga bog‘lanadi, boshlang‘ich balans Kartaga', async () => {
    const name = 'pf-v2-to-v3';
    const old = new Dexie(name);
    old.version(2).stores({ transactions: 'id, type, categoryId, date, createdAt, updatedAt, [type+date]', categories: 'id, type, order, updatedAt', budgets: 'id, categoryId, updatedAt', meta: 'key' });
    await old.open();
    await old.table('transactions').bulkAdd([
      { id: 't1', type: 'expense', amount: 100, categoryId: 'exp-food', date: '2026-01-01', paymentMethod: 'cash', note: '', createdAt: 1, updatedAt: 1 },
      { id: 't2', type: 'expense', amount: 100, categoryId: 'exp-food', date: '2026-01-01', paymentMethod: 'card', note: '', createdAt: 1, updatedAt: 1 },
    ]);
    await old.table('meta').put({ key: 'initialBalance', value: 5000, updatedAt: 1 });
    old.close();
    const ndb = new FinanceDB(name);
    await ndb.open();
    expect(ndb.verno).toBe(3);
    expect((await ndb.transactions.get('t1'))?.accountId).toBe('acc-cash');
    expect((await ndb.transactions.get('t2'))?.accountId).toBe('acc-card');
    expect((await ndb.accounts.get('acc-card'))?.initialBalance).toBe(5000);
    ndb.close();
  });

  it('hisoblarsiz eski zaxira import qilinadi', async () => {
    const parsed = validateBackup({
      app: 'personal-finance', format: 1, schemaVersion: 2,
      data: {
        categories: [{ id: 'exp-food', name: 'Oziq-ovqat', type: 'expense' }],
        transactions: [{ id: 'a1', type: 'expense', amount: 1000, categoryId: 'exp-food', date: '2026-01-01', paymentMethod: 'cash' }],
        budgets: [], initialBalance: 7000,
      },
    });
    await applyBackup(parsed, 'replace');
    expect(await balances()).toEqual({ 'acc-card': 7000, 'acc-cash': -1000, 'acc-savings': 0 });
  });

  it('yangi zaxira: hisoblar, o‘tkazmalar va doimiy to‘lovlar saqlanadi', async () => {
    await addTransfer({ fromId: 'acc-card', toId: 'acc-savings', amount: 500, date: '2026-11-03' });
    await addRecurring({ type: 'income', amount: 9000, categoryId: 'inc-salary', accountId: 'acc-card', freq: 'monthly', startDate: '2026-11-01' });
    const backup = JSON.parse(JSON.stringify(await buildBackup()));
    await wipeAllData();
    await applyBackup(validateBackup(backup), 'replace');
    expect(await db.transfers.count()).toBe(1);
    expect(await db.recurring.count()).toBe(1);
    await applyBackup(validateBackup(backup), 'merge');
    expect(await db.transfers.count()).toBe(1);
    expect(await db.accounts.count()).toBe(3);
  });
});
