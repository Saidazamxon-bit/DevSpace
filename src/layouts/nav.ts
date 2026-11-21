import { FolderKanban, Home, ListOrdered, Settings, Target, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Asosiy', icon: Home },
  { to: '/transactions', label: 'Tranzaksiyalar', icon: ListOrdered },
  { to: '/categories', label: 'Kategoriyalar', icon: FolderKanban },
  { to: '/budgets', label: 'Budjetlar', icon: Target },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
];
