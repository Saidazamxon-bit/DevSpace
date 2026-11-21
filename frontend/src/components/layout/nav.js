import { Activity, Code2, FolderKanban, Globe, History, KeyRound, LayoutGrid, ListChecks, Server, Settings, Wallet } from 'lucide-react';
import { t } from '../../i18n';

export const NAV = [
  { to: '/', label: t('Overview'), short: t('Home'), icon: LayoutGrid, end: true },
  { to: '/projects', label: t('Projects'), icon: FolderKanban },
  { to: '/tasks', label: t('Tasks'), icon: ListChecks },
  { to: '/domains', label: t('Domains'), icon: Globe },
  { to: '/servers', label: t('Servers'), icon: Server },
  { to: '/monitoring', label: t('Monitoring'), icon: Activity },
  { to: '/vault', label: t('API Vault'), icon: KeyRound },
  { to: '/expenses', label: t('Expenses'), icon: Wallet },
  { to: '/snippets', label: t('Code Library'), icon: Code2 },
  { to: '/activity', label: t('Activity'), icon: History },
  { to: '/settings', label: t('Settings'), icon: Settings },
];

export const MOBILE_NAV = ['/', '/projects', '/tasks', '/monitoring'];
