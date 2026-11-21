import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/database/db';
import { getMeta, META_INITIAL_BALANCE, META_ONBOARDING, getSecurity } from '@/services/finance';
import type { Budget, Category, Transaction } from '@/types';

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
