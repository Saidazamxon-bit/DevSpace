import Dexie, { type EntityTable } from 'dexie';
import type { Account, Budget, Category, MetaRecord, Recurring, Transaction, Transfer } from '@/types';
import { DEFAULT_ACCOUNT_IDS, defaultAccounts, defaultCategories } from './defaults';

export const DB_NAME = 'personal-finance';

/**
 * Ma’lumotlar bazasi sxemasi versiyalari.
 *
 * Qoidalar (ma’lumot yo‘qolmasligi uchun):
 *  - Mavjud `version(n)` bloklari HECH QACHON o‘zgartirilmaydi yoki o‘chirilmaydi.
 *  - Har bir o‘zgarish yangi `version(n + 1)` sifatida qo‘shiladi.
 *  - Ma’lumotlarni o‘zgartirish kerak bo‘lsa `.upgrade(tx => ...)` ishlatiladi —
 *    Dexie uni bitta tranzaksiya ichida bajaradi: xato bo‘lsa, hammasi bekor qilinadi.
 */
export const SCHEMA_VERSION = 3;

export class FinanceDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;
  accounts!: EntityTable<Account, 'id'>;
  transfers!: EntityTable<Transfer, 'id'>;
  recurring!: EntityTable<Recurring, 'id'>;

  constructor(name = DB_NAME) {
    super(name);

    // v1 — boshlang‘ich sxema
    this.version(1).stores({
      transactions: 'id, type, categoryId, date, createdAt',
      categories: 'id, type, order',
      budgets: 'id, categoryId',
      meta: 'key',
    });

    // v2 — tezkor filtrlash uchun murakkab indeks va `updatedAt` (sinxronlashga tayyorgarlik)
    this.version(2)
      .stores({
        transactions: 'id, type, categoryId, date, createdAt, updatedAt, [type+date]',
        categories: 'id, type, order, updatedAt',
        budgets: 'id, categoryId, updatedAt',
        meta: 'key',
      })
      .upgrade(async (tx) => {
        const now = Date.now();
        await tx.table('transactions').toCollection().modify((t: Partial<Transaction>) => {
          if (!t.updatedAt) t.updatedAt = t.createdAt ?? now;
          if (!t.paymentMethod) t.paymentMethod = 'cash';
          if (typeof t.note !== 'string') t.note = '';
        });
        await tx.table('categories').toCollection().modify((c: Partial<Category>) => {
          if (!c.updatedAt) c.updatedAt = c.createdAt ?? now;
        });
        await tx.table('budgets').toCollection().modify((b: Partial<Budget>) => {
          if (!b.updatedAt) b.updatedAt = b.createdAt ?? now;
        });
      });

    // v3 — hisoblar (Karta, Naqd, Jamg‘arma), o‘tkazmalar va doimiy to‘lovlar
    this.version(3)
      .stores({
        transactions: 'id, type, categoryId, accountId, date, createdAt, updatedAt, [type+date]',
        categories: 'id, type, order, updatedAt',
        budgets: 'id, categoryId, updatedAt',
        meta: 'key',
        accounts: 'id, order, updatedAt',
        transfers: 'id, fromId, toId, date, updatedAt',
        recurring: 'id, active, updatedAt',
      })
      .upgrade(async (tx) => {
        const accounts = defaultAccounts();
        // Eski umumiy boshlang‘ich balans “Karta” hisobiga o‘tkaziladi
        const initial = (await tx.table('meta').get('initialBalance')) as MetaRecord<number> | undefined;
        if (initial && Number.isSafeInteger(initial.value)) accounts[0].initialBalance = initial.value;
        await tx.table('accounts').bulkAdd(accounts);
        // Eski yozuvlar to‘lov turiga qarab hisobga bog‘lanadi: naqd → Naqd, qolganlari → Karta
        await tx.table('transactions').toCollection().modify((t: Partial<Transaction>) => {
          if (!t.accountId) t.accountId = t.paymentMethod === 'cash' ? DEFAULT_ACCOUNT_IDS.cash : DEFAULT_ACCOUNT_IDS.card;
        });
      });

    // Baza birinchi marta yaratilganda standart kategoriyalar va hisoblar qo‘shiladi (demo tranzaksiyalar yo‘q)
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(defaultCategories());
      tx.table('accounts').bulkAdd(defaultAccounts());
    });

    // Boshqa tabda yangi versiya ochilsa — eski ulanishni yopamiz, aks holda migratsiya bloklanadi
    this.on('versionchange', () => {
      this.close();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pf:db-version-change'));
      }
      return false;
    });
  }
}

export const db = new FinanceDB();

/** Brauzerdan ma’lumotlarni avtomatik o‘chirmaslikni so‘rash (storage eviction’dan himoya) */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* qo‘llab-quvvatlanmaydi */
  }
  return false;
}

export async function getStorageInfo(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted };
  } catch {
    return null;
  }
}
