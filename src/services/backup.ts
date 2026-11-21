import { db, SCHEMA_VERSION } from '@/database/db';
import type { BackupFile, Budget, Category, EncryptedBackupFile, Settings, Transaction } from '@/types';
import { isValidISODate, todayISO } from '@/utils/date';
import { cleanText, uuid } from '@/utils/misc';
import { CURRENCIES, MAX_MINOR, minorToDecimalString } from '@/utils/money';
import { decryptText, encryptText } from './crypto';
import { CATEGORY_NAME_MAX, getMeta, META_INITIAL_BALANCE, NOTE_MAX, PAYMENT_LABEL } from './finance';

declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

// ───────────────────────── Eksport ─────────────────────────

export async function buildBackup(settings?: Partial<Settings>): Promise<BackupFile> {
  const [transactions, categories, budgets, initialBalance] = await Promise.all([
    db.transactions.orderBy('date').toArray(),
    db.categories.orderBy('order').toArray(),
    db.budgets.toArray(),
    getMeta<number>(META_INITIAL_BALANCE, 0),
  ]);
  return {
    app: 'personal-finance',
    format: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: { transactions, categories, budgets, initialBalance },
    settings,
  };
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
): string {
  const header = ['Sana', 'Turi', 'Kategoriya', 'Summa', 'Valyuta', 'To‘lov turi', 'Izoh', 'ID'];
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
        PAYMENT_LABEL[t.paymentMethod] ?? '',
        csvCell(t.note ?? ''),
        t.id,
      ].join(','),
    );
  // BOM — Excel UTF-8 ni to‘g‘ri o‘qishi uchun
  return '﻿' + [header.join(','), ...rows].join('\r\n');
}

// ───────────────────────── Import: tekshirish ─────────────────────────

export class ImportError extends Error {}

export interface ParsedBackup {
  backup: BackupFile;
  stats: { transactions: number; categories: number; budgets: number; skipped: number };
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
    date: x.date,
    note: cleanText(x.note ?? '', NOTE_MAX),
    paymentMethod: pm,
    createdAt: isInt(x.createdAt) ? x.createdAt : now,
    updatedAt: isInt(x.updatedAt) ? x.updatedAt : isInt(x.createdAt) ? x.createdAt : now,
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
  if (skipped) warnings.push(`${skipped} ta noto‘g‘ri yoki takroriy yozuv o‘tkazib yuboriladi.`);

  const initialBalance = isInt(data.initialBalance) && Math.abs(data.initialBalance) <= MAX_MINOR ? data.initialBalance : 0;

  return {
    backup: {
      app: 'personal-finance',
      format: 1,
      schemaVersion: isInt(raw.schemaVersion) ? raw.schemaVersion : SCHEMA_VERSION,
      exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
      appVersion: isStr(raw.appVersion) ? raw.appVersion : '',
      data: { transactions, categories, budgets, initialBalance },
      settings: vSettings(raw.settings),
    },
    stats: { transactions: transactions.length, categories: categories.length, budgets: budgets.length, skipped },
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
  const { transactions, categories, budgets, initialBalance } = parsed.backup.data;

  await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.meta], async () => {
    const idMap = new Map<string, string>();

    if (mode === 'replace') {
      await db.transactions.clear();
      await db.budgets.clear();
      await db.categories.clear();
      await db.categories.bulkPut(categories);
      await db.meta.put({ key: META_INITIAL_BALANCE, value: initialBalance, updatedAt: Date.now() });
    } else {
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

    const fixedTx: Transaction[] = [];
    for (const t of transactions) {
      let categoryId = idMap.get(t.categoryId) ?? t.categoryId;
      const cat = catById.get(categoryId);
      if (!cat || cat.type !== t.type) categoryId = await ensureFallback(t.type);
      fixedTx.push({ ...t, categoryId });
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
