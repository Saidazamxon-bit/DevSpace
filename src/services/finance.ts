/**
 * Ma’lumotlar bilan ishlash qatlami (repository).
 * UI hech qachon Dexie’ga to‘g‘ridan-to‘g‘ri yozmaydi — barcha o‘zgarishlar shu yerdan o‘tadi.
 * Kelajakda server bilan sinxronlash qo‘shilsa, o‘zgarishlarni shu funksiyalarda navbatga qo‘yish kifoya.
 */
import { db } from '@/database/db';
import type { Account, AccountKind, Budget, Category, DistributionConfig, Minor, PaymentMethod, Recurring, RecurringFreq, SecurityConfig, SplitRule, Transaction, Transfer, TxType } from '@/types';
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
  accountId: string;
  date: string;
  note?: string;
  /** Berilmasa hisob turidan olinadi */
  paymentMethod?: PaymentMethod;
}

export function paymentForKind(kind: AccountKind | undefined): PaymentMethod {
  return kind === 'cash' ? 'cash' : kind === 'card' ? 'card' : 'other';
}

async function validateTx(input: TransactionInput): Promise<Required<TransactionInput>> {
  if (input.type !== 'income' && input.type !== 'expense') throw new ValidationError('Tranzaksiya turi noto‘g‘ri');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > MAX_MINOR)
    throw new ValidationError('Summa noto‘g‘ri');
  if (!isValidISODate(input.date)) throw new ValidationError('Sana noto‘g‘ri');
  const cat = await db.categories.get(input.categoryId);
  if (!cat) throw new ValidationError('Kategoriya topilmadi');
  if (cat.type !== input.type) throw new ValidationError('Kategoriya turi tranzaksiya turiga mos emas');
  const acc = await db.accounts.get(input.accountId);
  if (!acc) throw new ValidationError('Hisob topilmadi');
  const paymentMethod = input.paymentMethod && PAYMENT_LABEL[input.paymentMethod] ? input.paymentMethod : paymentForKind(acc.kind);
  return { ...input, paymentMethod, note: cleanText(input.note ?? '', NOTE_MAX) };
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const v = await validateTx(input);
  const now = Date.now();
  const tx: Transaction = {
    id: uuid(),
    type: v.type,
    amount: v.amount,
    categoryId: v.categoryId,
    accountId: v.accountId,
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
  await db.transaction('rw', [db.transactions, db.categories, db.accounts, db.transfers], async () => {
    await updateTransactionInner(id, input);
    await resyncSplit(id);
  });
}

async function updateTransactionInner(id: string, input: TransactionInput): Promise<void> {
  const v = await validateTx(input);
  const count = await db.transactions.update(id, {
    type: v.type,
    amount: v.amount,
    categoryId: v.categoryId,
    accountId: v.accountId,
    date: v.date,
    note: v.note ?? '',
    paymentMethod: v.paymentMethod,
    updatedAt: Date.now(),
  });
  if (!count) throw new ValidationError('Tranzaksiya topilmadi');
}

export type RemovedTransaction = Transaction & { _splits?: Transfer[] };

/** Tranzaksiyani o‘chirish; unga bog‘liq taqsimot o‘tkazmalari ham o‘chiriladi (qaytarish uchun saqlanadi) */
export async function deleteTransaction(id: string): Promise<RemovedTransaction | undefined> {
  return db.transaction('rw', [db.transactions, db.transfers], async () => {
    const existing = await db.transactions.get(id);
    const splits = await db.transfers.filter((t) => t.split?.txId === id).toArray();
    await db.transactions.delete(id);
    await db.transfers.bulkDelete(splits.map((t) => t.id));
    return existing ? { ...existing, _splits: splits } : undefined;
  });
}

/** “Bekor qilish” uchun o‘chirilgan yozuvni (va uning taqsimotini) qayta tiklash */
export async function restoreTransaction(tx: RemovedTransaction): Promise<void> {
  const { _splits, ...plain } = tx;
  await db.transaction('rw', [db.transactions, db.transfers], async () => {
    await db.transactions.put(plain);
    if (_splits?.length) await db.transfers.bulkPut(_splits);
  });
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
  await db.transaction('rw', [db.categories, db.transactions, db.budgets, db.recurring], async () => {
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
    // Doimiy to‘lovlar: kategoriya o‘chsa — ko‘chiriladi yoki o‘chiriladi
    const recs = await db.recurring.filter((r) => r.categoryId === id).toArray();
    for (const r of recs) {
      if (reassignTo && reassignTo !== id) await db.recurring.update(r.id, { categoryId: reassignTo, updatedAt: Date.now() });
      else await db.recurring.delete(r.id);
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
export const META_LAST_BACKUP = 'lastBackupAt';
export const META_BACKUP_SNOOZE = 'backupSnoozeUntil';
export const META_DISTRIBUTION = 'distribution';

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
  const { defaultAccounts } = await import('@/database/defaults');
  await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.meta, db.accounts, db.transfers, db.recurring], async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.categories.clear();
    await db.transfers.clear();
    await db.recurring.clear();
    await db.accounts.clear();
    await db.categories.bulkAdd(defaultCategories());
    await db.accounts.bulkAdd(defaultAccounts());
    await db.meta.where('key').anyOf([META_INITIAL_BALANCE, META_ONBOARDING, META_LAST_BACKUP, META_BACKUP_SNOOZE, META_DISTRIBUTION]).delete();
  });
}

// ───────────────────────── Hisoblar ─────────────────────────

export const ACCOUNT_KINDS: { value: AccountKind; label: string; icon: string }[] = [
  { value: 'card', label: 'Karta', icon: 'credit-card' },
  { value: 'cash', label: 'Naqd', icon: 'banknote' },
  { value: 'savings', label: 'Jamg‘arma', icon: 'piggy-bank' },
  { value: 'other', label: 'Boshqa', icon: 'wallet' },
];
export const ACCOUNT_NAME_MAX = 32;

export interface AccountInput {
  name: string;
  kind: AccountKind;
  icon: string;
  color: string;
  /** Foydalanuvchi ko‘rsatgan JORIY qoldiq — boshlang‘ich qoldiq shundan hisoblanadi */
  currentBalance?: Minor;
}

/** Hisob bo‘yicha harakatlar yig‘indisi: daromad − xarajat + kirgan o‘tkazma − chiqqan o‘tkazma */
export async function accountFlow(id: string): Promise<Minor> {
  const [txs, tin, tout] = await Promise.all([
    db.transactions.where('accountId').equals(id).toArray(),
    db.transfers.where('toId').equals(id).toArray(),
    db.transfers.where('fromId').equals(id).toArray(),
  ]);
  let flow = 0;
  for (const t of txs) flow += t.type === 'income' ? t.amount : -t.amount;
  for (const t of tin) flow += t.amount;
  for (const t of tout) flow -= t.amount;
  return flow;
}

async function validateAccount(input: AccountInput, excludeId?: string): Promise<AccountInput> {
  const name = cleanText(input.name, ACCOUNT_NAME_MAX);
  if (!name) throw new ValidationError('Hisob nomini kiriting');
  if (!ACCOUNT_KINDS.some((k) => k.value === input.kind)) throw new ValidationError('Hisob turi noto‘g‘ri');
  if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) throw new ValidationError('Rang noto‘g‘ri');
  if (input.currentBalance !== undefined && (!Number.isSafeInteger(input.currentBalance) || Math.abs(input.currentBalance) > MAX_MINOR))
    throw new ValidationError('Qoldiq noto‘g‘ri');
  const all = await db.accounts.toArray();
  if (all.some((a) => a.id !== excludeId && a.name.toLocaleLowerCase() === name.toLocaleLowerCase()))
    throw new ValidationError('Bunday nomli hisob allaqachon mavjud');
  return { ...input, name, icon: cleanText(input.icon, 32) || 'wallet' };
}

export async function addAccount(input: AccountInput): Promise<Account> {
  const v = await validateAccount(input);
  const last = await db.accounts.orderBy('order').last();
  const now = Date.now();
  const acc: Account = {
    id: uuid(),
    name: v.name,
    kind: v.kind,
    icon: v.icon,
    color: v.color,
    initialBalance: v.currentBalance ?? 0,
    order: (last?.order ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.accounts.add(acc);
  return acc;
}

export async function updateAccount(id: string, input: AccountInput): Promise<void> {
  const existing = await db.accounts.get(id);
  if (!existing) throw new ValidationError('Hisob topilmadi');
  const v = await validateAccount(input, id);
  const patch: Partial<Account> = { name: v.name, kind: v.kind, icon: v.icon, color: v.color, updatedAt: Date.now() };
  if (v.currentBalance !== undefined) patch.initialBalance = v.currentBalance - (await accountFlow(id));
  await db.accounts.update(id, patch);
}

export async function countAccountUsage(id: string): Promise<number> {
  const [a, b, c, d] = await Promise.all([
    db.transactions.where('accountId').equals(id).count(),
    db.transfers.where('fromId').equals(id).count(),
    db.transfers.where('toId').equals(id).count(),
    db.recurring.filter((r) => r.accountId === id).count(),
  ]);
  return a + b + c + d;
}

/**
 * Hisobni o‘chirish. Ishlatilgan bo‘lsa, barcha yozuvlar `reassignTo` hisobiga ko‘chiriladi,
 * boshlang‘ich qoldig‘i ham qo‘shiladi — umumiy balans o‘zgarmaydi.
 */
export async function deleteAccount(id: string, reassignTo?: string): Promise<void> {
  await db.transaction('rw', [db.accounts, db.transactions, db.transfers, db.recurring, db.meta], async () => {
    const acc = await db.accounts.get(id);
    if (!acc) throw new ValidationError('Hisob topilmadi');
    if ((await db.accounts.count()) <= 1) throw new ValidationError('Kamida bitta hisob qolishi kerak');
    const used = await countAccountUsage(id);
    if ((used > 0 || acc.initialBalance !== 0) && (!reassignTo || reassignTo === id)) throw new ValidationError('Yozuvlarni ko‘chirish uchun hisob tanlang');
    const now = Date.now();
    if (reassignTo && reassignTo !== id) {
      const target = await db.accounts.get(reassignTo);
      if (!target) throw new ValidationError('Tanlangan hisob topilmadi');
      await db.transactions.where('accountId').equals(id).modify({ accountId: reassignTo, updatedAt: now });
      await db.recurring.filter((r) => r.accountId === id).modify({ accountId: reassignTo, updatedAt: now });
      await db.transfers.where('fromId').equals(id).modify({ fromId: reassignTo, updatedAt: now });
      await db.transfers.where('toId').equals(id).modify({ toId: reassignTo, updatedAt: now });
      // O‘ziga o‘tkazma bo‘lib qolganlari ma’nosiz — o‘chiriladi
      await db.transfers.filter((t) => t.fromId === t.toId).delete();
      await db.accounts.update(reassignTo, { initialBalance: target.initialBalance + acc.initialBalance, updatedAt: now });
    }
    // Taqsimlash qoidalari: o‘chgan hisob o‘rniga tanlangan hisob (yoki qoida olib tashlanadi)
    const dist = await getDistribution();
    if (dist.rules.some((r) => r.accountId === id)) {
      const rules = dist.rules
        .map((r) => (r.accountId === id ? (reassignTo && reassignTo !== id ? { ...r, accountId: reassignTo } : null) : r))
        .filter((r): r is SplitRule => !!r);
      await setMeta(META_DISTRIBUTION, { ...dist, rules });
    }
    await db.accounts.delete(id);
  });
}

// ───────────────────────── O‘tkazmalar ─────────────────────────

export interface TransferInput {
  fromId: string;
  toId: string;
  amount: Minor;
  date: string;
  note?: string;
}

export async function addTransfer(input: TransferInput): Promise<Transfer> {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > MAX_MINOR) throw new ValidationError('Summa noto‘g‘ri');
  if (input.fromId === input.toId) throw new ValidationError('Bir xil hisoblar orasida o‘tkazma qilib bo‘lmaydi');
  if (!isValidISODate(input.date)) throw new ValidationError('Sana noto‘g‘ri');
  const [from, to] = await Promise.all([db.accounts.get(input.fromId), db.accounts.get(input.toId)]);
  if (!from || !to) throw new ValidationError('Hisob topilmadi');
  const now = Date.now();
  const t: Transfer = { id: uuid(), fromId: from.id, toId: to.id, amount: input.amount, date: input.date, note: cleanText(input.note ?? '', NOTE_MAX), createdAt: now, updatedAt: now };
  await db.transfers.add(t);
  return t;
}

export async function deleteTransfer(id: string): Promise<Transfer | undefined> {
  const t = await db.transfers.get(id);
  await db.transfers.delete(id);
  return t;
}

// ───────────────────────── Doimiy to‘lovlar ─────────────────────────

export interface RecurringInput {
  type: TxType;
  amount: Minor;
  categoryId: string;
  accountId: string;
  note?: string;
  freq: RecurringFreq;
  startDate: string;
  /** Birinchi sana allaqachon tranzaksiya sifatida yozilgan bo‘lsa — shu sana */
  lastDate?: string | null;
}

export async function addRecurring(input: RecurringInput): Promise<Recurring> {
  if (input.freq !== 'weekly' && input.freq !== 'monthly') throw new ValidationError('Takrorlanish turi noto‘g‘ri');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > MAX_MINOR) throw new ValidationError('Summa noto‘g‘ri');
  if (!isValidISODate(input.startDate)) throw new ValidationError('Sana noto‘g‘ri');
  const [cat, acc] = await Promise.all([db.categories.get(input.categoryId), db.accounts.get(input.accountId)]);
  if (!cat || cat.type !== input.type) throw new ValidationError('Kategoriya mos emas');
  if (!acc) throw new ValidationError('Hisob topilmadi');
  const now = Date.now();
  const r: Recurring = {
    id: uuid(),
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    accountId: input.accountId,
    note: cleanText(input.note ?? '', NOTE_MAX),
    freq: input.freq,
    startDate: input.startDate,
    lastDate: input.lastDate && isValidISODate(input.lastDate) ? input.lastDate : null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.recurring.add(r);
  return r;
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  await db.recurring.update(id, { active, updatedAt: Date.now() });
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring.delete(id);
}

/** Muddati kelgan doimiy to‘lovni tasdiqlash: tranzaksiya yaratiladi va oxirgi sana yangilanadi */
export async function confirmRecurring(id: string, date: string, amount?: Minor): Promise<Transaction> {
  return db.transaction('rw', [db.recurring, db.transactions, db.categories, db.accounts, db.transfers, db.meta], async () => {
    const r = await db.recurring.get(id);
    if (!r) throw new ValidationError('Doimiy to‘lov topilmadi');
    const tx = await addTransaction({ type: r.type, amount: amount ?? r.amount, categoryId: r.categoryId, accountId: r.accountId, date, note: r.note });
    await db.recurring.update(id, { lastDate: date, updatedAt: Date.now() });
    if (tx.type === 'income') await distributeIncome(tx);
    return tx;
  });
}

/** Bu safar o‘tkazib yuborish (tranzaksiya yaratilmaydi) */
export async function skipRecurring(id: string, date: string): Promise<void> {
  await db.recurring.update(id, { lastDate: date, updatedAt: Date.now() });
}

// ───────────────────────── Daromadni taqsimlash ─────────────────────────

export const DEFAULT_DISTRIBUTION: DistributionConfig = { enabled: false, rules: [] };

export async function getDistribution(): Promise<DistributionConfig> {
  const v = await getMeta<DistributionConfig | null>(META_DISTRIBUTION, null);
  return v && Array.isArray(v.rules) ? { enabled: !!v.enabled, rules: v.rules } : DEFAULT_DISTRIBUTION;
}

export async function saveDistribution(cfg: DistributionConfig): Promise<void> {
  const accounts = new Set((await db.accounts.toArray()).map((a) => a.id));
  const rules: SplitRule[] = [];
  for (const r of cfg.rules) {
    const name = cleanText(r.name, ACCOUNT_NAME_MAX);
    if (!name) throw new ValidationError('Har bir qoidaga nom bering');
    if (!Number.isInteger(r.percent) || r.percent < 0 || r.percent > 100) throw new ValidationError('Foiz 0 dan 100 gacha butun son bo‘lsin');
    if (!accounts.has(r.accountId)) throw new ValidationError(`“${name}” uchun hisob tanlang`);
    rules.push({ id: r.id || uuid(), name, percent: r.percent, accountId: r.accountId });
  }
  const sum = rules.reduce((s, r) => s + r.percent, 0);
  if (sum > 100) throw new ValidationError(`Foizlar yig‘indisi 100% dan oshmasin (hozir ${sum}%)`);
  await setMeta(META_DISTRIBUTION, { enabled: cfg.enabled && rules.length > 0, rules });
}

/**
 * Taqsimot hisobi (butun sonlarda): har bir ulush = ⌊summa × foiz / 100⌋.
 * Daromad tushgan hisobning o‘ziga yo‘naltirilgan qoidalar o‘tkazilmaydi.
 */
export function computeSplit(amount: Minor, rules: SplitRule[], sourceAccountId: string): { rule: SplitRule; amount: Minor }[] {
  return rules
    .filter((r) => r.percent > 0 && r.accountId !== sourceAccountId)
    .map((r) => ({ rule: r, amount: Math.floor((amount * r.percent) / 100) }))
    .filter((p) => p.amount > 0);
}

/** Daromadni yoqilgan qoidalar bo‘yicha hisoblarga o‘tkazish. Yaratilgan o‘tkazmalar soni qaytadi. */
export async function distributeIncome(tx: Transaction): Promise<number> {
  if (tx.type !== 'income') return 0;
  const cfg = await getDistribution();
  if (!cfg.enabled) return 0;
  const accounts = new Set((await db.accounts.toArray()).map((a) => a.id));
  const parts = computeSplit(tx.amount, cfg.rules.filter((r) => accounts.has(r.accountId)), tx.accountId);
  const now = Date.now();
  const rows: Transfer[] = parts.map((p) => ({
    id: uuid(),
    fromId: tx.accountId,
    toId: p.rule.accountId,
    amount: p.amount,
    date: tx.date,
    note: `${p.rule.name} · ${p.rule.percent}%`,
    split: { txId: tx.id, ruleId: p.rule.id, percent: p.rule.percent },
    createdAt: now,
    updatedAt: now,
  }));
  await db.transfers.bulkAdd(rows);
  return rows.length;
}

/** Daromad qo‘shib, darhol taqsimlash (atomar) */
export async function addIncomeWithSplit(input: TransactionInput, distribute: boolean): Promise<{ tx: Transaction; parts: number }> {
  return db.transaction('rw', [db.transactions, db.categories, db.accounts, db.transfers, db.meta], async () => {
    const tx = await addTransaction(input);
    const parts = distribute ? await distributeIncome(tx) : 0;
    return { tx, parts };
  });
}

/** Daromad tahrirlanganda unga bog‘liq taqsimotni yangilash (summa, hisob, sana) */
async function resyncSplit(txId: string): Promise<void> {
  const linked = await db.transfers.filter((t) => t.split?.txId === txId).toArray();
  if (!linked.length) return;
  const tx = await db.transactions.get(txId);
  if (!tx || tx.type !== 'income') {
    await db.transfers.bulkDelete(linked.map((t) => t.id));
    return;
  }
  const now = Date.now();
  for (const t of linked) {
    const amount = Math.floor((tx.amount * (t.split?.percent ?? 0)) / 100);
    if (amount <= 0 || t.toId === tx.accountId) await db.transfers.delete(t.id);
    else await db.transfers.update(t.id, { amount, fromId: tx.accountId, date: tx.date, updatedAt: now });
  }
}

/** Tavsiya etilgan reja: Uyga 20%, Qayta investitsiya 40%, O‘zimga 10%, Ehson 5%, Chiqim 5% — hisoblar ham yaratiladi */
export const DISTRIBUTION_TEMPLATE: { name: string; percent: number; account: string; icon: string; color: string; kind: AccountKind }[] = [
  { name: 'Uyga', percent: 20, account: 'Uy uchun', icon: 'home', color: '#8b5e3c', kind: 'savings' },
  { name: 'Qayta investitsiya', percent: 40, account: 'Investitsiya', icon: 'trending-up', color: '#2a78d6', kind: 'savings' },
  { name: 'O‘zimga', percent: 10, account: 'O‘zim uchun', icon: 'sparkles', color: '#e87ba4', kind: 'savings' },
  { name: 'Ehson', percent: 5, account: 'Ehson', icon: 'heart', color: '#1baf7a', kind: 'other' },
  { name: 'Chiqim', percent: 5, account: 'Chiqim', icon: 'receipt', color: '#eb6834', kind: 'other' },
];

export async function applyDistributionTemplate(): Promise<DistributionConfig> {
  const existing = await db.accounts.toArray();
  const byName = new Map(existing.map((a) => [a.name.toLocaleLowerCase(), a]));
  const rules: SplitRule[] = [];
  for (const t of DISTRIBUTION_TEMPLATE) {
    const acc = byName.get(t.account.toLocaleLowerCase()) ?? (await addAccount({ name: t.account, kind: t.kind, icon: t.icon, color: t.color, currentBalance: 0 }));
    rules.push({ id: uuid(), name: t.name, percent: t.percent, accountId: acc.id });
  }
  const cfg = { enabled: true, rules };
  await saveDistribution(cfg);
  return cfg;
}
