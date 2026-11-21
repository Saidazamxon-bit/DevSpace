/** Tranzaksiya turi */
export type TxType = 'income' | 'expense';

/** To‘lov turi */
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

/**
 * Pul summalari doimo butun sonda — eng kichik birlikda (tiyin / sent) saqlanadi.
 * Masalan 12 500,50 so‘m => 1250050.
 */
export type Minor = number;

/** Sana `YYYY-MM-DD` ko‘rinishida (mahalliy vaqt) */
export type ISODate = string;

export interface Transaction {
  /** UUID — kelajakda server bilan sinxronlash uchun global noyob identifikator */
  id: string;
  type: TxType;
  amount: Minor;
  categoryId: string;
  date: ISODate;
  note: string;
  paymentMethod: PaymentMethod;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  icon: string;
  color: string;
  /** Tartiblash uchun */
  order: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Budget {
  id: string;
  /** Faqat xarajat kategoriyasi */
  categoryId: string;
  /** Oylik limit (tiyin) */
  limit: Minor;
  createdAt: number;
  updatedAt: number;
}

/** Kalit-qiymat ko‘rinishidagi qo‘shimcha ma’lumotlar (boshlang‘ich balans, xavfsizlik va h.k.) */
export interface MetaRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

export interface SecurityConfig {
  pinHash: string | null;
  pinSalt: string | null;
  pinIterations: number;
  pinLength: number;
  biometricCredentialId: string | null;
  /** Fonga o‘tgandan keyin necha daqiqada qulflash (0 — darhol) */
  autoLockMinutes: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentName = 'blue' | 'green' | 'violet' | 'orange' | 'pink' | 'teal' | 'gold';
export type Density = 'comfortable' | 'compact';
export type CurrencyCode = 'UZS' | 'USD' | 'EUR' | 'RUB';
export type DateFormat = 'DD.MM.YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'D MMMM YYYY';
export type NumberFormat = 'space' | 'comma' | 'dot';
export type StartPage = '/' | '/transactions' | '/analytics' | '/budgets';

export interface Settings {
  theme: ThemeMode;
  accent: AccentName;
  density: Density;
  animations: boolean;
  sidebarCollapsed: boolean;
  currency: CurrencyCode;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  startPage: StartPage;
  /** Budjet ogohlantirish chegarasi, foizda */
  budgetWarnPercent: number;
}

export type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/** JSON zaxira fayli formati */
export interface BackupFile {
  app: 'personal-finance';
  format: 1;
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: {
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    initialBalance: Minor;
  };
  settings?: Partial<Settings>;
}

export interface EncryptedBackupFile {
  app: 'personal-finance';
  format: 1;
  encrypted: true;
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}
