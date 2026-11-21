import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/database/db';
import {
  addIncomeWithSplit, applyDistributionTemplate, computeSplit, deleteTransaction, getDistribution, restoreTransaction, saveDistribution,
  updateTransaction, wipeAllData,
} from '../src/services/finance';
import { applyBackup, buildBackup, validateBackup } from '../src/services/backup';
import { accountBalances } from '../src/utils/stats';

beforeEach(async () => {
  await db.open();
  await wipeAllData();
});

const balancesByName = async () => {
  const accounts = await db.accounts.toArray();
  const m = accountBalances(accounts, await db.transactions.toArray(), await db.transfers.toArray());
  return Object.fromEntries(accounts.map((a) => [a.name, m.get(a.id)]));
};

describe('daromadni taqsimlash', () => {
  it('100 000 so‘m: 20% uyga, 40% investitsiya, 10% o‘zimga, 5% ehson, 5% chiqim', async () => {
    await applyDistributionTemplate();
    const cfg = await getDistribution();
    expect(cfg.enabled).toBe(true);
    expect(cfg.rules.map((r) => r.percent)).toEqual([20, 40, 10, 5, 5]);

    const { parts } = await addIncomeWithSplit(
      { type: 'income', amount: 100_000_00, categoryId: 'inc-salary', accountId: 'acc-card', date: '2026-11-21' },
      true,
    );
    expect(parts).toBe(5);
    const b = await balancesByName();
    expect(b['Uy uchun']).toBe(20_000_00);
    expect(b['Investitsiya']).toBe(40_000_00);
    expect(b['O‘zim uchun']).toBe(10_000_00);
    expect(b['Ehson']).toBe(5_000_00);
    expect(b['Chiqim']).toBe(5_000_00);
    // Qolgan 20% daromad tushgan hisobda
    expect(b['Karta']).toBe(20_000_00);
    // Jami mablag‘ o‘zgarmaydi
    expect(Object.values(b).reduce((s, x) => s! + x!, 0)).toBe(100_000_00);
  });

  it('butun sonda yaxlitlash: hech qachon daromaddan ko‘p taqsimlanmaydi', () => {
    const parts = computeSplit(333, [
      { id: 'a', name: 'A', percent: 33, accountId: 'x' },
      { id: 'b', name: 'B', percent: 33, accountId: 'y' },
      { id: 'c', name: 'C', percent: 34, accountId: 'src' },
    ], 'src');
    expect(parts.map((p) => p.amount)).toEqual([109, 109]);
  });

  it('o‘chirilgan taqsimot yo‘q bo‘lsa yoki o‘chiq bo‘lsa — taqsimlanmaydi', async () => {
    await applyDistributionTemplate();
    const { parts } = await addIncomeWithSplit({ type: 'income', amount: 1000, categoryId: 'inc-salary', accountId: 'acc-card', date: '2026-11-21' }, false);
    expect(parts).toBe(0);
    await saveDistribution({ ...(await getDistribution()), enabled: false });
    const r = await addIncomeWithSplit({ type: 'income', amount: 1000, categoryId: 'inc-salary', accountId: 'acc-card', date: '2026-11-21' }, true);
    expect(r.parts).toBe(0);
  });

  it('daromad tahrirlansa — taqsimot qayta hisoblanadi; o‘chirilsa — birga o‘chadi va qaytariladi', async () => {
    await applyDistributionTemplate();
    const { tx } = await addIncomeWithSplit({ type: 'income', amount: 100_000_00, categoryId: 'inc-salary', accountId: 'acc-card', date: '2026-11-21' }, true);
    await updateTransaction(tx.id, { type: 'income', amount: 200_000_00, categoryId: 'inc-salary', accountId: 'acc-cash', date: '2026-11-20' });
    let b = await balancesByName();
    expect(b['Investitsiya']).toBe(80_000_00);
    expect(b['Naqd']).toBe(40_000_00);
    expect(b['Karta']).toBe(0);
    const removed = await deleteTransaction(tx.id);
    expect(await db.transfers.count()).toBe(0);
    await restoreTransaction(removed!);
    expect(await db.transfers.count()).toBe(5);
    b = await balancesByName();
    expect(b['Investitsiya']).toBe(80_000_00);
  });

  it('noto‘g‘ri sozlamalar rad etiladi', async () => {
    await expect(saveDistribution({ enabled: true, rules: [{ id: 'a', name: 'A', percent: 70, accountId: 'acc-card' }, { id: 'b', name: 'B', percent: 40, accountId: 'acc-cash' }] })).rejects.toThrow(/100%/);
    await expect(saveDistribution({ enabled: true, rules: [{ id: 'a', name: 'A', percent: 10, accountId: 'yo‘q' }] })).rejects.toThrow();
  });

  it('zaxiraga qoidalar va taqsimot bog‘lanishi kiradi', async () => {
    await applyDistributionTemplate();
    await addIncomeWithSplit({ type: 'income', amount: 1000_00, categoryId: 'inc-salary', accountId: 'acc-card', date: '2026-11-21' }, true);
    const backup = JSON.parse(JSON.stringify(await buildBackup()));
    await wipeAllData();
    await applyBackup(validateBackup(backup), 'replace');
    const cfg = await getDistribution();
    expect(cfg.rules).toHaveLength(5);
    expect((await db.transfers.toArray()).every((t) => t.split?.txId)).toBe(true);
  });
});
