import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/database/db';
import { getMeta, META_INITIAL_BALANCE, META_ONBOARDING, getSecurity } from '@/services/finance';
import type { Account, Budget, Category, Recurring, Transaction, Transfer } from '@/types';

/** Barcha tranzaksiyalar (sana bo‘yicha kamayish tartibida). `undefined` — hali yuklanmoqda. */
export function useTransactions(): Transaction[] | undefined {
  return useLiveQuery(async () => {
    const list = await db.transactions.orderBy('date').reverse().toArray();
    // Bir kundagi yozuvlar — oxirgi qo‘shilgani tepada
    return list.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
  }, []);
}

export function useCategories(): { list: Category[] | undefined; map: Map<string, Category> } {
  const list = useLiveQuery(() => db.categories.orderBy('order').toArray(), []);
  const map = useMemo(() => new Map((list ?? []).map((c) => [c.id, c])), [list]);
  return { list, map };
}

export function useBudgets(): Budget[] | undefined {
  return useLiveQuery(() => db.budgets.toArray(), []);
}

export function useInitialBalance(): number | undefined {
  return useLiveQuery(() => getMeta<number>(META_INITIAL_BALANCE, 0), []);
}

export function useOnboardingDismissed(): boolean | undefined {
  return useLiveQuery(() => getMeta<boolean>(META_ONBOARDING, false), []);
}

export function useSecurityConfig() {
  return useLiveQuery(() => getSecurity(), []);
}

export function useAccounts(): { list: Account[] | undefined; map: Map<string, Account> } {
  const list = useLiveQuery(() => db.accounts.orderBy('order').toArray(), []);
  const map = useMemo(() => new Map((list ?? []).map((a) => [a.id, a])), [list]);
  return { list, map };
}

export function useTransfers(): Transfer[] | undefined {
  return useLiveQuery(() => db.transfers.orderBy('date').reverse().toArray(), []);
}

export function useRecurringList(): Recurring[] | undefined {
  return useLiveQuery(() => db.recurring.toArray(), []);
}

export function useMetaValue<T>(key: string, fallback: T): T | undefined {
  return useLiveQuery(() => getMeta<T>(key, fallback), [key]);
}
