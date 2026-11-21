import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/database/db';
import {
  addCategory, addTransaction, deleteCategory, saveBudget, setInitialBalance, updateTransaction, ValidationError, wipeAllData,
} from '../src/services/finance';
import { applyBackup, buildBackup, transactionsToCsv, validateBackup } from '../src/services/backup';
import { decryptText, encryptText } from '../src/services/crypto';

beforeEach(async () => {
  await db.open();
  await wipeAllData();
});

describe('IndexedDB servislari', () => {
  it('standart kategoriyalar yaratiladi (demo tranzaksiyalarsiz)', async () => {
    expect(await db.categories.count()).toBe(17);
    expect(await db.transactions.count()).toBe(0);
  });

  it('tranzaksiya qo‘shish, tahrirlash va validatsiya', async () => {
    const t = await addTransaction({ type: 'expense', amount: 12_500_00, categoryId: 'exp-food', date: '2026-11-20', note: '  Non <b>va</b>\u0000 sut ', paymentMethod: 'cash' });
    const saved = await db.transactions.get(t.id);
    expect(saved?.note).toBe('Non <b>va</b> sut');
    await updateTransaction(t.id, { type: 'expense', amount: 13_000_00, categoryId: 'exp-transport', date: '2026-11-20', paymentMethod: 'card' });
    expect((await db.transactions.get(t.id))?.amount).toBe(13_000_00);
    await expect(addTransaction({ type: 'income', amount: 100, categoryId: 'exp-food', date: '2026-11-20', paymentMethod: 'cash' })).rejects.toBeInstanceOf(ValidationError);
    await expect(addTransaction({ type: 'expense', amount: 0.5, categoryId: 'exp-food', date: '2026-11-20', paymentMethod: 'cash' })).rejects.toBeInstanceOf(ValidationError);
    await expect(addTransaction({ type: 'expense', amount: 100, categoryId: 'exp-food', date: '2026-13-01', paymentMethod: 'cash' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('ishlatilgan kategoriyani o‘chirish — tranzaksiyalar ko‘chiriladi', async () => {
    const c = await addCategory({ name: 'Kafe', type: 'expense', icon: 'coffee', color: '#112233' });
    await addTransaction({ type: 'expense', amount: 500, categoryId: c.id, date: '2026-11-20', paymentMethod: 'cash' });
    await saveBudget(c.id, 10_000);
    await expect(deleteCategory(c.id)).rejects.toThrow();
    await deleteCategory(c.id, 'exp-other');
    expect(await db.categories.get(c.id)).toBeUndefined();
    expect(await db.transactions.where('categoryId').equals('exp-other').count()).toBe(1);
    expect(await db.budgets.where('categoryId').equals(c.id).count()).toBe(0);
  });

  it('dublikat kategoriya nomi va dublikat budjet rad etiladi', async () => {
    await expect(addCategory({ name: 'oziq-OVQAT', type: 'expense', icon: 'x', color: '#112233' })).rejects.toThrow();
    await saveBudget('exp-food', 1000);
    await expect(saveBudget('exp-food', 2000)).rejects.toThrow();
  });
});

describe('zaxira: eksport → import', () => {
  it('JSON round-trip (almashtirish)', async () => {
    await setInitialBalance(50_000_00);
    await addTransaction({ type: 'income', amount: 1_000_00, categoryId: 'inc-salary', date: '2026-11-01', paymentMethod: 'transfer' });
    await addTransaction({ type: 'expense', amount: 300_00, categoryId: 'exp-food', date: '2026-11-02', note: '=SUM(A1)', paymentMethod: 'cash' });
    await saveBudget('exp-food', 2_000_00);
    const backup = JSON.parse(JSON.stringify(await buildBackup({ theme: 'dark' })));

    await wipeAllData();
    expect(await db.transactions.count()).toBe(0);

    const parsed = validateBackup(backup);
    expect(parsed.stats).toMatchObject({ transactions: 2, budgets: 1, skipped: 0 });
    await applyBackup(parsed, 'replace');
    expect(await db.transactions.count()).toBe(2);
    expect(await db.budgets.count()).toBe(1);
    expect((await db.meta.get('initialBalance'))?.value).toBe(50_000_00);
    expect(parsed.backup.settings?.theme).toBe('dark');
  });

  it('birlashtirish dublikat yaratmaydi', async () => {
    await addTransaction({ type: 'expense', amount: 300_00, categoryId: 'exp-food', date: '2026-11-02', paymentMethod: 'cash' });
    const backup = JSON.parse(JSON.stringify(await buildBackup()));
    await applyBackup(validateBackup(backup), 'merge');
    await applyBackup(validateBackup(backup), 'merge');
    expect(await db.transactions.count()).toBe(1);
    expect(await db.categories.count()).toBe(17);
  });

  it('noto‘g‘ri fayllar va yozuvlar', async () => {
    expect(() => validateBackup({ foo: 1 })).toThrow();
    expect(() => validateBackup({ app: 'personal-finance', format: 1, schemaVersion: 99, data: { transactions: [], categories: [] } })).toThrow(/yangiroq/);
    const parsed = validateBackup({
      app: 'personal-finance',
      format: 1,
      data: {
        categories: [{ id: 'c1', name: 'X', type: 'expense' }],
        transactions: [
          { id: 't1', type: 'expense', amount: 100, categoryId: 'c1', date: '2026-01-01' },
          { id: 't2', type: 'expense', amount: -5, categoryId: 'c1', date: '2026-01-01' },
          { id: 't3', type: 'expense', amount: 1.5, categoryId: 'c1', date: '2026-01-01' },
          { id: 't4', type: 'expense', amount: 100, categoryId: 'missing', date: '2026-01-01' },
          { id: '<script>', type: 'expense', amount: 100, categoryId: 'c1', date: '2026-01-01' },
        ],
      },
    });
    expect(parsed.stats.transactions).toBe(2);
    expect(parsed.stats.skipped).toBe(3);
    await applyBackup(parsed, 'merge');
    const orphan = await db.transactions.get('t4');
    expect(orphan?.categoryId).toBe('exp-other');
  });

  it('CSV formula in’ektsiyasidan himoya va BOM', async () => {
    await addTransaction({ type: 'expense', amount: 300_50, categoryId: 'exp-food', date: '2026-11-02', note: '=HYPERLINK("x")', paymentMethod: 'cash' });
    const cats = new Map((await db.categories.toArray()).map((c) => [c.id, c]));
    const csv = transactionsToCsv(await db.transactions.toArray(), cats, 'UZS');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    expect(csv).toContain('-300.50');
  });

  it('shifrlangan zaxira (AES-GCM)', async () => {
    const enc = await encryptText('{"a":1}', 'parol12345');
    expect(atob(enc.data)).not.toContain('"a"');
    expect(await decryptText(enc, 'parol12345')).toBe('{"a":1}');
    await expect(decryptText(enc, 'notogri-parol')).rejects.toBeTruthy();
  });
});
