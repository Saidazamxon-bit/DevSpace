import { db, SCHEMA_VERSION } from '@/database/db';
import type { Account, BackupFile, Budget, Category, EncryptedBackupFile, Recurring, Settings, Transaction, Transfer } from '@/types';
import { DEFAULT_ACCOUNT_IDS, defaultAccounts } from '@/database/defaults';
import { isValidISODate, todayISO } from '@/utils/date';
import { cleanText, uuid } from '@/utils/misc';
import { CURRENCIES, MAX_MINOR, minorToDecimalString } from '@/utils/money';
import { decryptText, encryptText } from './crypto';
import { ACCOUNT_KINDS, ACCOUNT_NAME_MAX, CATEGORY_NAME_MAX, META_INITIAL_BALANCE, META_LAST_BACKUP, NOTE_MAX, PAYMENT_LABEL, setMeta } from './finance';

declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

// ───────────────────────── Eksport ─────────────────────────

export async function buildBackup(settings?: Partial<Settings>): Promise<BackupFile> {
  const [transactions, categories, budgets, accounts, transfers, recurring] = await Promise.all([
    db.transactions.orderBy('date').toArray(),
    db.categories.orderBy('order').toArray(),
    db.budgets.toArray(),
    db.accounts.orderBy('order').toArray(),
    db.transfers.orderBy('date').toArray(),
    db.recurring.toArray(),
  ]);
  return {
    app: 'personal-finance',
    format: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    // initialBalance: v3 dan boshlab hisoblarda saqlanadi
    data: { transactions, categories, budgets, initialBalance: 0, accounts, transfers, recurring },
    settings,
  };
}

/** Zaxira olingan vaqtni eslab qolish (zaxira eslatmasi uchun) */
export async function markBackupDone(): Promise<void> {
  await setMeta(META_LAST_BACKUP, Date.now());
}

export async function buildEncryptedBackup(settings: Partial<Settings>, password: string): Promise<EncryptedBackupFile> {
  const plain = JSON.stringify(await buildBackup(settings));
  const enc = await encryptText(plain, password);
  return { app: 'personal-finance', format: 1, encrypted: true, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA256', ...enc };
}

export function backupFilename(ext: 'json' | 'csv', suffix = ''): string {
  return `personal-finance-${suffix ? suffix + '-' : ''}${todayISO()}.${ext}`;
}

/** CSV hujayrasi: formula in’ektsiyasidan himoya (=, +, -, @ bilan boshlanadigan matnlar) */
function csvCell(v: string): string {
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",;\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function transactionsToCsv(
  txs: Transaction[],
  categories: Map<string, Category>,
  currency: keyof typeof CURRENCIES,
  accounts?: Map<string, Account>,
): string {
  const header = ['Sana', 'Turi', 'Kategoriya', 'Summa', 'Valyuta', 'Hisob', 'Izoh', 'ID'];
  const rows = txs
    .slice()
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((t) =>
      [
        t.date,
        t.type === 'income' ? 'Daromad' : 'Xarajat',
        csvCell(categories.get(t.categoryId)?.name ?? 'Noma’lum'),
        (t.type === 'expense' ? '-' : '') + minorToDecimalString(t.amount),
        currency,
        csvCell(accounts?.get(t.accountId)?.name ?? PAYMENT_LABEL[t.paymentMethod] ?? ''),
        csvCell(t.note ?? ''),
        t.id,
      ].join(','),
    );
  // BOM — Excel UTF-8 ni to‘g‘ri o‘qishi uchun
  return '\uFEFF' + [header.join(','), ...rows].join('\r\n');
}

// ───────────────────────── Import: tekshirish ─────────────────────────

export class ImportError extends Error {}

export interface ParsedBackup {
  backup: BackupFile;
  stats: { transactions: number; categories: number; budgets: number; accounts: number; skipped: number };
  warnings: string[];
}

export function isEncryptedBackup(x: unknown): x is EncryptedBackupFile {
  const o = x as Record<string, unknown>;
  return !!o && o.app === 'personal-finance' && o.encrypted === true && typeof o.data === 'string' && typeof o.salt === 'string' && typeof o.iv === 'string';
}

export function parseBackupText(text: string): unknown {
  if (text.length > MAX_IMPORT_BYTES) throw new ImportError('Fayl juda katta (50 MB dan oshmasligi kerak)');
  try {
    return JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new ImportError('Fayl JSON formatida emas yoki shikastlangan');
  }
}

export async function decryptBackup(file: EncryptedBackupFile, password: string): Promise<unknown> {
  const iterations = Number(file.iterations);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 5_000_000) throw new ImportError('Shifrlangan fayl parametrlari noto‘g‘ri');
  try {
    const plain = await decryptText({ iterations, salt: file.salt, iv: file.iv, data: file.data }, password);
    return JSON.parse(plain);
  } catch {
    throw new ImportError('Parol noto‘g‘ri yoki fayl shikastlangan');
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x);
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function vCategory(x: unknown): Category | null {
  if (!isObj(x) || !isStr(x.id) || !ID_RE.test(x.id)) return null;
  if (x.type !== 'income' && x.type !== 'expense') return null;
  const name = cleanText(x.name, CATEGORY_NAME_MAX);
  if (!name) return null;
  const now = Date.now();
  return {
    id: x.id,
    name,
    type: x.type,
    icon: isStr(x.icon) ? cleanText(x.icon, 32) || 'more' : 'more',
    color: isStr(x.color) && /^#[0-9a-fA-F]{6}$/.test(x.color) ? x.color : '#64748b',
    order: isInt(x.order) ? x.order : 0,
    isDefault: x.isDefault === true,
    createdAt: isInt(x.createdAt) ? x.createdAt : now,
    updatedAt: isInt(x.updatedAt) ? x.updatedAt : isInt(x.createdAt) ? x.createdAt : now,
  };
}

function vTransaction(x: unknown): Transaction | null {
  if (!isObj(x) || !isStr(x.id) || !ID_RE.test(x.id)) return null;
  if (x.type !== 'income' && x.type !== 'expense') return null;
  if (!isInt(x.amount) || x.amount <= 0 || x.amount > MAX_MINOR) return null;
  if (!isStr(x.categoryId) || !ID_RE.test(x.categoryId)) return null;
  if (!isValidISODate(x.date)) return null;
  const pm = isStr(x.paymentMethod) && x.paymentMethod in PAYMENT_LABEL ? (x.paymentMethod as Transaction['paymentMethod']) : 'other';
  const now = Date.now();
  return {
    id: x.id,
    type: x.type,
    amount: x.amount,
    categoryId: x.categoryId,
    // Eski zaxiralarda hisob yo‘q — to‘lov turiga qarab bog‘lanadi
    accountId: isStr(x.accountId) && ID_RE.test(x.accountId) ? x.accountId : pm === 'cash' ? DEFAULT_ACCOUNT_IDS.cash : DEFAULT_ACCOUNT_IDS.card,
    date: x.date,
    note: cleanText(x.note ?? '', NOTE_MAX),
    paymentMethod: pm,
    createdAt: isInt(x.createdAt) ? x.createdAt : now,
    updatedAt: isInt(x.updatedAt) ? x.updatedAt : isInt(x.createdAt) ? x.createdAt : now,
  };
}

function vAccount(x: unknown): Account | null {
  if (!isObj(x) || !isStr(x.id) || !ID_RE.test(x.id)) return null;
  const name = cleanText(x.name, ACCOUNT_NAME_MAX);
  if (!name) return null;
  const now = Date.now();
  return {
    id: x.id,
    name,
    kind: ACCOUNT_KINDS.some((k) => k.value === x.kind) ? (x.kind as Account['kind']) : 'other',
    icon: isStr(x.icon) ? cleanText(x.icon, 32) || 'wallet' : 'wallet',
    color: isStr(x.color) && /^#[0-9a-fA-F]{6}$/.test(x.color) ? x.color : '#64748b',
    initialBalance: isInt(x.initialBalance) && Math.abs(x.initialBalance) <= MAX_MINOR ? x.initialBalance : 0,
    order: isInt(x.order) ? x.order : 0,
    createdAt: isInt(x.createdAt) ? x.createdAt : now,
    updatedAt: isInt(x.updatedAt) ? x.updatedAt : now,
  };
}

function vTransfer(x: unknown): Transfer | null {
  if (!isObj(x) || !isStr(x.id) || !ID_RE.test(x.id)) return null;
  if (!isStr(x.fromId) || !ID_RE.test(x.fromId) || !isStr(x.toId) || !ID_RE.test(x.toId) || x.fromId === x.toId) return null;
  if (!isInt(x.amount) || x.amount <= 0 || x.amount > MAX_MINOR || !isValidISODate(x.date)) return null;
  const now = Date.now();
  return {
    id: x.id,
    fromId: x.fromId,
    toId: x.toId,
    amount: x.amount,
    date: x.date,
    note: cleanText(x.note ?? '', NOTE_MAX),
    createdAt: isInt(x.createdAt) ? x.createdAt : now,
    updatedAt: isInt(x.updatedAt) ? x.updatedAt : now,
  };
}

function vRecurring(x: unknown): Recurring | null {
  if (!isObj(x) || !isStr(x.id) || !ID_RE.test(x.id)) return null;
  if (x.type !== 'income' && x.type !== 'expense') return null;
  if (x.freq !== 'weekly' && x.freq !== 'monthly') return null;
  if (!isInt(x.amount) || x.amount <= 0 || x.amount > MAX_MINOR || !isValidISODate(x.startDate)) return null;
  if (!isStr(x.categoryId) || !ID_RE.test(x.categoryId) || !isStr(x.accountId) || !ID_RE.test(x.accountId)) return null;
  const now = Date.now();
  return {
    id: x.id,
    type: x.type,
    amount: x.amount,
    categoryId: x.categoryId,
    accountId: x.accountId,
    note: cleanText(x.note ?? '', NOTE_MAX),
    freq: x.freq,
    startDate: x.startDate,
    lastDate: isValidISODate(x.lastDate) ? x.lastDate : null,
    active: x.active !== false,
    createdAt: isInt(x.createdAt) ? x.createdAt : now,
    updatedAt: isInt(x.updatedAt) ? x.updatedAt : now,
  };
}

function vBudget(x: unknown): Budget | null {
  if (!isObj(x) || !isStr(x.id) || !ID_RE.test(x.id)) return null;
  if (!isStr(x.categoryId) || !ID_RE.test(x.categoryId)) return null;
  if (!isInt(x.limit) || x.limit <= 0 || x.limit > MAX_MINOR) return null;
  const now = Date.now();
  return {
    id: x.id,
    categoryId: x.categoryId,
    limit: x.limit,
    createdAt: isInt(x.createdAt) ? x.createdAt : now,
    updatedAt: isInt(x.updatedAt) ? x.updatedAt : now,
  };
}

function vSettings(x: unknown): Partial<Settings> | undefined {
  if (!isObj(x)) return undefined;
  const out: Partial<Settings> = {};
  const pick = <K extends keyof Settings>(k: K, allowed: readonly Settings[K][]) => {
    if (allowed.includes(x[k] as Settings[K])) out[k] = x[k] as Settings[K];
  };
  pick('theme', ['light', 'dark', 'system']);
  pick('accent', ['blue', 'green', 'violet', 'orange', 'pink', 'teal', 'gold']);
  pick('density', ['comfortable', 'compact']);
  pick('currency', ['UZS', 'USD', 'EUR', 'RUB']);
  pick('dateFormat', ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'D MMMM YYYY']);
  pick('numberFormat', ['space', 'comma', 'dot']);
  pick('startPage', ['/', '/transactions', '/analytics', '/budgets']);
  if (typeof x.animations === 'boolean') out.animations = x.animations;
  if (typeof x.sidebarCollapsed === 'boolean') out.sidebarCollapsed = x.sidebarCollapsed;
  if (isInt(x.budgetWarnPercent) && x.budgetWarnPercent >= 50 && x.budgetWarnPercent <= 100) out.budgetWarnPercent = x.budgetWarnPercent;
  return out;
}

/** Zaxira faylini to‘liq tekshiradi. Noto‘g‘ri yozuvlar tashlab yuboriladi va hisobotda ko‘rsatiladi. */
export function validateBackup(raw: unknown): ParsedBackup {
  if (!isObj(raw) || raw.app !== 'personal-finance') throw new ImportError('Bu fayl Personal Finance zaxirasi emas');
  if (raw.encrypted === true) throw new ImportError('Fayl shifrlangan — avval parolni kiriting');
  if (raw.format !== 1) throw new ImportError('Zaxira formati versiyasi qo‘llab-quvvatlanmaydi');
  if (isInt(raw.schemaVersion) && raw.schemaVersion > SCHEMA_VERSION)
    throw new ImportError('Zaxira ilovaning yangiroq versiyasida yaratilgan. Ilovani yangilang.');
  const data = raw.data;
  if (!isObj(data) || !Array.isArray(data.transactions) || !Array.isArray(data.categories))
    throw new ImportError('Zaxira tuzilmasi noto‘g‘ri: ma’lumotlar bo‘limi topilmadi');

  const warnings: string[] = [];
  let skipped = 0;

  const categories: Category[] = [];
  const catIds = new Set<string>();
  for (const c of data.categories) {
    const v = vCategory(c);
    if (!v || catIds.has(v.id)) { skipped++; continue; }
    catIds.add(v.id);
    categories.push(v);
  }
  const catType = new Map(categories.map((c) => [c.id, c.type]));

  const transactions: Transaction[] = [];
  const txIds = new Set<string>();
  let orphans = 0;
  for (const t of data.transactions) {
    const v = vTransaction(t);
    if (!v || txIds.has(v.id)) { skipped++; continue; }
    const ct = catType.get(v.categoryId);
    if (ct && ct !== v.type) { skipped++; continue; }
    if (!ct) orphans++;
    txIds.add(v.id);
    transactions.push(v);
  }
  if (orphans) warnings.push(`${orphans} ta tranzaksiya kategoriyasi topilmadi — ular “Boshqa” kategoriyasiga o‘tkaziladi.`);

  const budgets: Budget[] = [];
  const budgetCats = new Set<string>();
  for (const b of Array.isArray(data.budgets) ? data.budgets : []) {
    const v = vBudget(b);
    if (!v || budgetCats.has(v.categoryId) || (catType.has(v.categoryId) && catType.get(v.categoryId) !== 'expense')) { skipped++; continue; }
    budgetCats.add(v.categoryId);
    budgets.push(v);
  }
  const initialBalance = isInt(data.initialBalance) && Math.abs(data.initialBalance) <= MAX_MINOR ? data.initialBalance : 0;

  // Hisoblar: eski (v1–v2) zaxiralarda yo‘q — standart hisoblar yaratiladi, umumiy boshlang‘ich balans “Karta”ga
  let accounts: Account[] = [];
  const accIds = new Set<string>();
  if (Array.isArray(data.accounts)) {
    for (const a of data.accounts) {
      const v = vAccount(a);
      if (!v || accIds.has(v.id)) { skipped++; continue; }
      accIds.add(v.id);
      accounts.push(v);
    }
  }
  const legacy = !Array.isArray(data.accounts) || accounts.length === 0;
  if (legacy) {
    accounts = defaultAccounts();
    accounts[0].initialBalance = initialBalance;
    accounts.forEach((a) => accIds.add(a.id));
  }

  const transfers: Transfer[] = [];
  for (const t of Array.isArray(data.transfers) ? data.transfers : []) {
    const v = vTransfer(t);
    if (!v || !accIds.has(v.fromId) || !accIds.has(v.toId)) { skipped++; continue; }
    transfers.push(v);
  }
  const recurring: Recurring[] = [];
  for (const r of Array.isArray(data.recurring) ? data.recurring : []) {
    const v = vRecurring(r);
    if (!v || (catType.has(v.categoryId) && catType.get(v.categoryId) !== v.type)) { skipped++; continue; }
    recurring.push(v);
  }
  if (skipped) warnings.push(`${skipped} ta noto‘g‘ri yoki takroriy yozuv o‘tkazib yuboriladi.`);

  return {
    backup: {
      app: 'personal-finance',
      format: 1,
      schemaVersion: isInt(raw.schemaVersion) ? raw.schemaVersion : SCHEMA_VERSION,
      exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
      appVersion: isStr(raw.appVersion) ? raw.appVersion : '',
      data: { transactions, categories, budgets, initialBalance, accounts, transfers, recurring },
      settings: vSettings(raw.settings),
    },
    stats: { transactions: transactions.length, categories: categories.length, budgets: budgets.length, accounts: accounts.length, skipped },
    warnings,
  };
}

// ───────────────────────── Import: qo‘llash ─────────────────────────

export type ImportMode = 'replace' | 'merge';

/**
 * Zaxirani bazaga yozadi. Hammasi bitta atomar tranzaksiyada — xato bo‘lsa, mavjud ma’lumotlar o‘zgarmaydi.
 *  - replace: barcha mavjud ma’lumotlar zaxiradagisi bilan almashtiriladi.
 *  - merge: bir xil ID dagi yozuvlardan yangirog‘i qoladi; bir xil nomli kategoriyalar birlashtiriladi.
 */
export async function applyBackup(parsed: ParsedBackup, mode: ImportMode): Promise<void> {
  const { transactions, categories, budgets } = parsed.backup.data;
  const accounts = parsed.backup.data.accounts ?? [];
  const transfers = parsed.backup.data.transfers ?? [];
  const recurring = parsed.backup.data.recurring ?? [];

  await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.meta, db.accounts, db.transfers, db.recurring], async () => {
    const idMap = new Map<string, string>();
    const accMap = new Map<string, string>();

    if (mode === 'replace') {
      await db.transactions.clear();
      await db.budgets.clear();
      await db.categories.clear();
      await db.transfers.clear();
      await db.recurring.clear();
      await db.accounts.clear();
      await db.categories.bulkPut(categories);
      await db.accounts.bulkPut(accounts.length ? accounts : defaultAccounts());
      await db.meta.delete(META_INITIAL_BALANCE);
    } else {
      // Hisoblar: bir xil ID — yangirog‘i; bir xil nom — birlashtiriladi
      const existingAcc = await db.accounts.toArray();
      const accById = new Map(existingAcc.map((a) => [a.id, a]));
      const accByName = new Map(existingAcc.map((a) => [a.name.toLocaleLowerCase(), a]));
      let aOrder = existingAcc.reduce((m, a) => Math.max(m, a.order), 0);
      const accPut: Account[] = [];
      for (const a of accounts) {
        const same = accById.get(a.id);
        if (same) {
          if (a.updatedAt > same.updatedAt) accPut.push({ ...a, order: same.order });
          continue;
        }
        const dup = accByName.get(a.name.toLocaleLowerCase());
        if (dup) {
          accMap.set(a.id, dup.id);
          continue;
        }
        accPut.push({ ...a, order: ++aOrder });
      }
      await db.accounts.bulkPut(accPut);

      const existing = await db.categories.toArray();
      const byId = new Map(existing.map((c) => [c.id, c]));
      const byName = new Map(existing.map((c) => [`${c.type}:${c.name.toLocaleLowerCase()}`, c]));
      let order = existing.reduce((m, c) => Math.max(m, c.order), 0);
      const toPut: Category[] = [];
      for (const c of categories) {
        const same = byId.get(c.id);
        if (same) {
          if (same.type !== c.type) {
            // ID to‘qnashuvi — yangi ID beramiz
            const nid = uuid();
            idMap.set(c.id, nid);
            toPut.push({ ...c, id: nid, order: ++order });
          } else if (c.updatedAt > same.updatedAt) {
            toPut.push({ ...c, order: same.order });
          }
          continue;
        }
        const dup = byName.get(`${c.type}:${c.name.toLocaleLowerCase()}`);
        if (dup) {
          idMap.set(c.id, dup.id);
          continue;
        }
        toPut.push({ ...c, order: ++order });
      }
      await db.categories.bulkPut(toPut);
    }

    // Kategoriyasi yo‘q tranzaksiyalar uchun “Boshqa”
    const allCats = await db.categories.toArray();
    const catById = new Map(allCats.map((c) => [c.id, c]));
    const fallback: Record<'income' | 'expense', string | undefined> = { income: undefined, expense: undefined };
    const ensureFallback = async (type: 'income' | 'expense'): Promise<string> => {
      if (fallback[type]) return fallback[type]!;
      let c = allCats.find((x) => x.type === type && x.name.toLocaleLowerCase() === 'boshqa');
      if (!c) {
        const now = Date.now();
        c = { id: uuid(), name: 'Boshqa', type, icon: 'more', color: '#64748b', order: allCats.length + 1, isDefault: false, createdAt: now, updatedAt: now };
        await db.categories.add(c);
        allCats.push(c);
        catById.set(c.id, c);
      }
      fallback[type] = c.id;
      return c.id;
    };

    // Hisobi topilmagan yozuvlar birinchi hisobga
    const allAcc = await db.accounts.orderBy('order').toArray();
    const accIdSet = new Set(allAcc.map((a) => a.id));
    const fixAcc = (id: string) => {
      const mapped = accMap.get(id) ?? id;
      return accIdSet.has(mapped) ? mapped : allAcc[0]?.id ?? DEFAULT_ACCOUNT_IDS.card;
    };

    const fixedTx: Transaction[] = [];
    for (const t of transactions) {
      let categoryId = idMap.get(t.categoryId) ?? t.categoryId;
      const cat = catById.get(categoryId);
      if (!cat || cat.type !== t.type) categoryId = await ensureFallback(t.type);
      fixedTx.push({ ...t, categoryId, accountId: fixAcc(t.accountId) });
    }

    const fixedTr = transfers.map((t) => ({ ...t, fromId: fixAcc(t.fromId), toId: fixAcc(t.toId) })).filter((t) => t.fromId !== t.toId);
    const fixedRec = recurring
      .map((r) => ({ ...r, categoryId: idMap.get(r.categoryId) ?? r.categoryId, accountId: fixAcc(r.accountId) }))
      .filter((r) => catById.get(r.categoryId)?.type === r.type);
    if (mode === 'replace') {
      await db.transfers.bulkPut(fixedTr);
      await db.recurring.bulkPut(fixedRec);
    } else {
      const exTr = await db.transfers.bulkGet(fixedTr.map((r) => r.id));
      await db.transfers.bulkPut(fixedTr.filter((r, i) => !exTr[i] || r.updatedAt > exTr[i]!.updatedAt));
      const exRec = await db.recurring.bulkGet(fixedRec.map((r) => r.id));
      await db.recurring.bulkPut(fixedRec.filter((r, i) => !exRec[i] || r.updatedAt > exRec[i]!.updatedAt));
    }

    if (mode === 'replace') {
      await db.transactions.bulkPut(fixedTx);
    } else {
      const existing = await db.transactions.bulkGet(fixedTx.map((t) => t.id));
      const toPut = fixedTx.filter((t, i) => !existing[i] || t.updatedAt > existing[i]!.updatedAt);
      await db.transactions.bulkPut(toPut);
    }

    const budgetRows: Budget[] = [];
    const current = mode === 'merge' ? await db.budgets.toArray() : [];
    const curByCat = new Map(current.map((b) => [b.categoryId, b]));
    for (const b of budgets) {
      const categoryId = idMap.get(b.categoryId) ?? b.categoryId;
      const cat = catById.get(categoryId);
      if (!cat || cat.type !== 'expense') continue;
      const cur = curByCat.get(categoryId);
      if (cur) {
        if (b.updatedAt > cur.updatedAt) budgetRows.push({ ...b, id: cur.id, categoryId });
        continue;
      }
      budgetRows.push({ ...b, categoryId });
    }
    await db.budgets.bulkPut(budgetRows);
  });
}
