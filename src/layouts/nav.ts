import { FolderKanban, Home, ListOrdered, Repeat, Settings, Target, Wallet, type LucideIcon } from 'lucide-react';
import type { InfoKey } from '@/utils/infoTexts';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** “ⓘ” — bo‘lim nima vazifa bajarishini tushuntirish */
  info?: InfoKey;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Asosiy', icon: Home },
  { to: '/accounts', label: 'Hisoblar', icon: Wallet, info: 'accounts' },
  { to: '/transactions', label: 'Tranzaksiyalar', icon: ListOrdered, info: 'transactions' },
  { to: '/categories', label: 'Kategoriyalar', icon: FolderKanban, info: 'categories' },
  { to: '/budgets', label: 'Budjetlar', icon: Target, info: 'budgets' },
  { to: '/recurring', label: 'Doimiy to‘lovlar', icon: Repeat, info: 'recurring' },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
];
