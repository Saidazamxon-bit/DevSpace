import { BarChart3, FolderKanban, LayoutDashboard, ListOrdered, Settings, Target, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard },
  { to: '/transactions', label: 'Tranzaksiyalar', icon: ListOrdered },
  { to: '/analytics', label: 'Analitika', icon: BarChart3 },
  { to: '/budgets', label: 'Budjetlar', icon: Target },
  { to: '/categories', label: 'Kategoriyalar', icon: FolderKanban },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
];
