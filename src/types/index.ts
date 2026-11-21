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
  /** Qaysi hisobdan/hisobga (Karta, Naqd, Jamg‘arma …) */
  accountId: string;
  date: ISODate;
  note: string;
  /** Eski maydon (v1–v2). Hisob turidan avtomatik to‘ldiriladi */
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

export type AccountKind = 'card' | 'cash' | 'savings' | 'other';

/** Pul turadigan joy: karta, naqd, jamg‘arma va h.k. */
export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  icon: string;
  color: string;
  /** Boshlang‘ich qoldiq (tiyin). Joriy qoldiq = boshlang‘ich + daromad − xarajat ± o‘tkazmalar */
  initialBalance: Minor;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** Hisoblar orasidagi o‘tkazma (daromad ham, xarajat ham emas) */
export interface Transfer {
  id: string;
  fromId: string;
  toId: string;
  amount: Minor;
  date: ISODate;
  note: string;
  /** Daromadni avtomatik taqsimlash natijasida yaratilgan bo‘lsa — manba daromad va foiz */
  split?: { txId: string; ruleId: string; percent: number };
  createdAt: number;
  updatedAt: number;
}

/** Daromadni taqsimlash qoidasi: nomi, foizi va qaysi hisobga borishi */
export interface SplitRule {
  id: string;
  name: string;
  /** 0–100, butun son */
  percent: number;
  accountId: string;
}

export interface DistributionConfig {
  enabled: boolean;
  rules: SplitRule[];
}

export type RecurringFreq = 'weekly' | 'monthly';

/** Doimiy (takrorlanuvchi) to‘lov yoki daromad: ijara, oylik, internet … */
export interface Recurring {
  id: string;
  type: TxType;
  amount: Minor;
  categoryId: string;
  accountId: string;
  note: string;
  freq: RecurringFreq;
  /** Birinchi sana — kun/hafta kuni shundan olinadi */
  startDate: ISODate;
  /** Oxirgi qayd etilgan (yoki o‘tkazib yuborilgan) sana */
  lastDate: ISODate | null;
  active: boolean;
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
export type AccentName = 'green' | 'blue' | 'violet' | 'orange' | 'teal' | 'pink' | 'gold';
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

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'all';

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
    /** Eski (v1–v2) umumiy boshlang‘ich balans — endi hisoblarda saqlanadi */
    initialBalance: Minor;
    accounts?: Account[];
    transfers?: Transfer[];
    recurring?: Recurring[];
    distribution?: DistributionConfig;
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
