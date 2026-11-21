/**
 * Ma’lumotlar bilan ishlash qatlami (repository).
 * UI hech qachon Dexie’ga to‘g‘ridan-to‘g‘ri yozmaydi — barcha o‘zgarishlar shu yerdan o‘tadi.
 * Kelajakda server bilan sinxronlash qo‘shilsa, o‘zgarishlarni shu funksiyalarda navbatga qo‘yish kifoya.
 */
import { db } from '@/database/db';
import type { Budget, Category, Minor, PaymentMethod, SecurityConfig, Transaction, TxType } from '@/types';
import { cleanText, uuid } from '@/utils/misc';
import { isValidISODate } from '@/utils/date';
import { MAX_MINOR } from '@/utils/money';

export class ValidationError extends Error {}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Naqd' },
  { value: 'card', label: 'Karta' },
  { value: 'transfer', label: 'O‘tkazma' },
  { value: 'other', label: 'Boshqa' },
];
export const PAYMENT_LABEL: Record<PaymentMethod, string> = Object.fromEntries(
  PAYMENT_METHODS.map((p) => [p.value, p.label]),
) as Record<PaymentMethod, string>;

export const NOTE_MAX = 200;
export const CATEGORY_NAME_MAX = 32;

// ───────────────────────── Tranzaksiyalar ─────────────────────────

export interface TransactionInput {
  type: TxType;
  amount: Minor;
  categoryId: string;
  date: string;
  note?: string;
  paymentMethod: PaymentMethod;
}

async function validateTx(input: TransactionInput): Promise<TransactionInput> {
  if (input.type !== 'income' && input.type !== 'expense') throw new ValidationError('Tranzaksiya turi noto‘g‘ri');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > MAX_MINOR)
    throw new ValidationError('Summa noto‘g‘ri');
  if (!isValidISODate(input.date)) throw new ValidationError('Sana noto‘g‘ri');
  if (!PAYMENT_LABEL[input.paymentMethod]) throw new ValidationError('To‘lov turi noto‘g‘ri');
  const cat = await db.categories.get(input.categoryId);
  if (!cat) throw new ValidationError('Kategoriya topilmadi');
  if (cat.type !== input.type) throw new ValidationError('Kategoriya turi tranzaksiya turiga mos emas');
  return { ...input, note: cleanText(input.note ?? '', NOTE_MAX) };
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const v = await validateTx(input);
  const now = Date.now();
  const tx: Transaction = {
    id: uuid(),
    type: v.type,
    amount: v.amount,
    categoryId: v.categoryId,
    date: v.date,
    note: v.note ?? '',
    paymentMethod: v.paymentMethod,
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.add(tx);
  return tx;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  const v = await validateTx(input);
  const count = await db.transactions.update(id, {
    type: v.type,
    amount: v.amount,
    categoryId: v.categoryId,
    date: v.date,
    note: v.note ?? '',
    paymentMethod: v.paymentMethod,
    updatedAt: Date.now(),
  });
  if (!count) throw new ValidationError('Tranzaksiya topilmadi');
}

export async function deleteTransaction(id: string): Promise<Transaction | undefined> {
  const existing = await db.transactions.get(id);
  await db.transactions.delete(id);
  return existing;
}

/** “Bekor qilish” uchun o‘chirilgan yozuvni qayta tiklash */
export async function restoreTransaction(tx: Transaction): Promise<void> {
  await db.transactions.put(tx);
}

// ───────────────────────── Kategoriyalar ─────────────────────────

export interface CategoryInput {
  name: string;
  type: TxType;
  icon: string;
  color: string;
}

async function validateCategory(input: CategoryInput, excludeId?: string): Promise<CategoryInput> {
  const name = cleanText(input.name, CATEGORY_NAME_MAX);
  if (!name) throw new ValidationError('Kategoriya nomini kiriting');
  if (input.type !== 'income' && input.type !== 'expense') throw new ValidationError('Kategoriya turi noto‘g‘ri');
  if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) throw new ValidationError('Rang noto‘g‘ri');
  const icon = cleanText(input.icon, 32) || 'more';
  const same = await db.categories.where('type').equals(input.type).toArray();
  const lower = name.toLocaleLowerCase();
  if (same.some((c) => c.id !== excludeId && c.name.toLocaleLowerCase() === lower))
    throw new ValidationError('Bunday nomli kategoriya allaqachon mavjud');
  return { ...input, name, icon };
}

export async function addCategory(input: CategoryInput): Promise<Category> {
  const v = await validateCategory(input);
  const last = await db.categories.orderBy('order').last();
  const now = Date.now();
  const cat: Category = {
    id: uuid(),
    name: v.name,
    type: v.type,
    icon: v.icon,
    color: v.color,
    order: (last?.order ?? 0) + 1,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.categories.add(cat);
  return cat;
}

export async function updateCategory(id: string, input: Omit<CategoryInput, 'type'>): Promise<void> {
  const existing = await db.categories.get(id);
  if (!existing) throw new ValidationError('Kategoriya topilmadi');
  const v = await validateCategory({ ...input, type: existing.type }, id);
  await db.categories.update(id, { name: v.name, icon: v.icon, color: v.color, updatedAt: Date.now() });
}

export async function countCategoryUsage(id: string): Promise<{ transactions: number; budgets: number }> {
  const [transactions, budgets] = await Promise.all([
    db.transactions.where('categoryId').equals(id).count(),
    db.budgets.where('categoryId').equals(id).count(),
  ]);
  return { transactions, budgets };
}

/**
 * Kategoriyani o‘chirish. Agar u tranzaksiyalarda ishlatilgan bo‘lsa, `reassignTo` majburiy:
 * barcha tranzaksiyalar shu kategoriyaga ko‘chiriladi — hech qanday yozuv “yetim” bo‘lib qolmaydi.
 * Hammasi bitta atomar tranzaksiyada bajariladi.
 */
export async function deleteCategory(id: string, reassignTo?: string): Promise<void> {
  await db.transaction('rw', db.categories, db.transactions, db.budgets, async () => {
    const cat = await db.categories.get(id);
    if (!cat) throw new ValidationError('Kategoriya topilmadi');
    const sameTypeCount = await db.categories.where('type').equals(cat.type).count();
    if (sameTypeCount <= 1) throw new ValidationError('Kamida bitta kategoriya qolishi kerak');

    const used = await db.transactions.where('categoryId').equals(id).count();
    if (used > 0) {
      if (!reassignTo || reassignTo === id) throw new ValidationError('Tranzaksiyalarni ko‘chirish uchun kategoriya tanlang');
      const target = await db.categories.get(reassignTo);
      if (!target || target.type !== cat.type) throw new ValidationError('Tanlangan kategoriya mos emas');
      const now = Date.now();
      await db.transactions.where('categoryId').equals(id).modify({ categoryId: reassignTo, updatedAt: now });
    }
    await db.budgets.where('categoryId').equals(id).delete();
    await db.categories.delete(id);
  });
}

// ───────────────────────── Budjetlar ─────────────────────────

export async function saveBudget(categoryId: string, limit: Minor, id?: string): Promise<void> {
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > MAX_MINOR) throw new ValidationError('Limit noto‘g‘ri');
  const cat = await db.categories.get(categoryId);
  if (!cat || cat.type !== 'expense') throw new ValidationError('Budjet faqat xarajat kategoriyasi uchun');
  await db.transaction('rw', db.budgets, async () => {
    const existing = await db.budgets.where('categoryId').equals(categoryId).first();
    if (existing && existing.id !== id) throw new ValidationError('Bu kategoriya uchun budjet allaqachon mavjud');
    const now = Date.now();
    if (id) {
      const count = await db.budgets.update(id, { categoryId, limit, updatedAt: now });
      if (!count) throw new ValidationError('Budjet topilmadi');
    } else {
      await db.budgets.add({ id: uuid(), categoryId, limit, createdAt: now, updatedAt: now } satisfies Budget);
    }
  });
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

// ───────────────────────── Meta (boshlang‘ich balans, xavfsizlik) ─────────────────────────

export const META_INITIAL_BALANCE = 'initialBalance';
export const META_SECURITY = 'security';
export const META_ONBOARDING = 'onboardingDismissed';

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const r = await db.meta.get(key);
  return r ? (r.value as T) : fallback;
}
export async function setMeta<T>(key: string, value: T): Promise<void> {
  await db.meta.put({ key, value, updatedAt: Date.now() });
}

export async function setInitialBalance(minor: Minor): Promise<void> {
  if (!Number.isSafeInteger(minor) || Math.abs(minor) > MAX_MINOR) throw new ValidationError('Summa noto‘g‘ri');
  await setMeta(META_INITIAL_BALANCE, minor);
}

export const DEFAULT_SECURITY: SecurityConfig = {
  pinHash: null,
  pinSalt: null,
  pinIterations: 150_000,
  pinLength: 4,
  biometricCredentialId: null,
  autoLockMinutes: 1,
};

export async function getSecurity(): Promise<SecurityConfig> {
  return { ...DEFAULT_SECURITY, ...(await getMeta<Partial<SecurityConfig>>(META_SECURITY, {})) };
}
export async function setSecurity(cfg: SecurityConfig): Promise<void> {
  await setMeta(META_SECURITY, cfg);
}

/** Barcha moliyaviy ma’lumotlarni o‘chirish (sozlamalar va xavfsizlik saqlanadi), standart kategoriyalar tiklanadi */
export async function wipeAllData(): Promise<void> {
  const { defaultCategories } = await import('@/database/defaults');
  await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.meta], async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.categories.clear();
    await db.categories.bulkAdd(defaultCategories());
    await db.meta.where('key').anyOf([META_INITIAL_BALANCE, META_ONBOARDING]).delete();
  });
}
