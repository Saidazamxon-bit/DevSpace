import { useEffect, useState } from 'react';
import { useSettings } from '@/store/settings';

const mq = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => mq()?.matches ?? false);
  useEffect(() => {
    const m = mq();
    if (!m) return;
    const on = () => setDark(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return dark;
}

export function useResolvedDark(): boolean {
  const theme = useSettings((s) => s.theme);
  const sys = useSystemDark();
  return theme === 'dark' || (theme === 'system' && sys);
}

/** Sozlamalarni <html> atributlariga qo‘llaydi */
export function useApplyTheme() {
  const dark = useResolvedDark();
  const accent = useSettings((s) => s.accent);
  const density = useSettings((s) => s.density);
  const animations = useSettings((s) => s.animations);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('dark', dark);
    el.dataset.accent = accent;
    el.dataset.density = density;
    el.dataset.motion = animations ? 'on' : 'off';
    const color = dark ? '#0A0B0E' : '#F5F7FA';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
    document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', dark ? 'black' : 'default');
  }, [dark, accent, density, animations]);
}

/** Grafiklar uchun aniq ranglar (SVG atributlari CSS o‘zgaruvchilarini o‘qimaydi) */
export function useChartColors() {
  const dark = useResolvedDark();
  const accent = useSettings((s) => s.accent);
  const [accentHex, setAccentHex] = useState('#1D4ED8');
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const [r, g, b] = v.split(/\s+/).map(Number);
    if ([r, g, b].every((n) => Number.isFinite(n))) setAccentHex(`rgb(${r}, ${g}, ${b})`);
  }, [dark, accent]);
  return dark
    ? { income: '#199e70', expense: '#e66767', net: accentHex, grid: '#2a2e37', axis: '#8a92a1', surface: '#15171c', cursor: 'rgba(255,255,255,0.06)' }
    : { income: '#1baf7a', expense: '#e34948', net: accentHex, grid: '#e8ebf0', axis: '#8a92a1', surface: '#ffffff', cursor: 'rgba(15,23,42,0.05)' };
}
