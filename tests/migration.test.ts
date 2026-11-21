import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { FinanceDB } from '../src/database/db';

describe('IndexedDB migratsiyasi v1 → v2', () => {
  it('eski ma’lumotlar saqlanadi va yangi maydonlar to‘ldiriladi', async () => {
    const name = 'pf-migration-test';
    const old = new Dexie(name);
    old.version(1).stores({ transactions: 'id, type, categoryId, date, createdAt', categories: 'id, type, order', budgets: 'id, categoryId', meta: 'key' });
    await old.open();
    await old.table('categories').add({ id: 'exp-food', name: 'Oziq-ovqat', type: 'expense', icon: 'x', color: '#000000', order: 0, isDefault: true, createdAt: 5 });
    await old.table('transactions').add({ id: 't1', type: 'expense', amount: 100, categoryId: 'exp-food', date: '2026-01-01', createdAt: 42 });
    old.close();

    const db = new FinanceDB(name);
    await db.open();
    expect(db.verno).toBe(2);
    const t = await db.transactions.get('t1');
    expect(t).toMatchObject({ amount: 100, updatedAt: 42, paymentMethod: 'cash', note: '' });
    expect((await db.categories.get('exp-food'))?.updatedAt).toBe(5);
    // Yangi murakkab indeks ishlaydi
    expect(await db.transactions.where('[type+date]').between(['expense', '2026-01-01'], ['expense', '2026-12-31']).count()).toBe(1);
    db.close();
  });
});
