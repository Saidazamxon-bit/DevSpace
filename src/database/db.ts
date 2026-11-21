import Dexie, { type EntityTable } from 'dexie';
import type { Budget, Category, MetaRecord, Transaction } from '@/types';
import { defaultCategories } from './defaults';

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
export const SCHEMA_VERSION = 2;

export class FinanceDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

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

    // Baza birinchi marta yaratilganda standart kategoriyalar qo‘shiladi (demo tranzaksiyalar yo‘q)
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(defaultCategories());
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
