import { Activity, Code2, FolderKanban, Globe, History, KeyRound, LayoutGrid, ListChecks, Server, Settings, Wallet } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/domains', label: 'Domains', icon: Globe },
  { to: '/servers', label: 'Servers', icon: Server },
  { to: '/monitoring', label: 'Monitoring', icon: Activity },
  { to: '/vault', label: 'API Vault', icon: KeyRound },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/snippets', label: 'Code Library', icon: Code2 },
  { to: '/activity', label: 'Activity', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const MOBILE_NAV = ['/', '/projects', '/tasks', '/monitoring'];
