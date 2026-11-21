import type { Category } from '@/types';

type Seed = Pick<Category, 'id' | 'name' | 'type' | 'icon' | 'color'>;

/**
 * Standart kategoriyalar. Identifikatorlar barqaror — turli qurilmalardagi zaxiralarni
 * birlashtirishda dublikat paydo bo‘lmasligi uchun.
 */
const SEEDS: Seed[] = [
  // Daromad
  { id: 'inc-salary', name: 'Ish haqi', type: 'income', icon: 'briefcase', color: '#1baf7a' },
  { id: 'inc-business', name: 'Biznes', type: 'income', icon: 'store', color: '#2a78d6' },
  { id: 'inc-freelance', name: 'Freelance', type: 'income', icon: 'laptop', color: '#6250d6' },
  { id: 'inc-gift', name: 'Sovg‘a', type: 'income', icon: 'gift', color: '#e87ba4' },
  { id: 'inc-invest', name: 'Investitsiya', type: 'income', icon: 'trending-up', color: '#eda100' },
  { id: 'inc-other', name: 'Boshqa', type: 'income', icon: 'more', color: '#64748b' },
  // Xarajat
  { id: 'exp-food', name: 'Oziq-ovqat', type: 'expense', icon: 'shopping-cart', color: '#1baf7a' },
  { id: 'exp-transport', name: 'Transport', type: 'expense', icon: 'bus', color: '#2a78d6' },
  { id: 'exp-housing', name: 'Uy-joy', type: 'expense', icon: 'home', color: '#8b5e3c' },
  { id: 'exp-utilities', name: 'Kommunal', type: 'expense', icon: 'zap', color: '#eda100' },
  { id: 'exp-internet', name: 'Internet va aloqa', type: 'expense', icon: 'wifi', color: '#0ea5b7' },
  { id: 'exp-clothes', name: 'Kiyim-kechak', type: 'expense', icon: 'shirt', color: '#e87ba4' },
  { id: 'exp-health', name: 'Sog‘liq', type: 'expense', icon: 'heart-pulse', color: '#e34948' },
  { id: 'exp-education', name: 'Ta’lim', type: 'expense', icon: 'graduation-cap', color: '#6250d6' },
  { id: 'exp-fun', name: 'Ko‘ngilochar', type: 'expense', icon: 'gamepad', color: '#c026d3' },
  { id: 'exp-shopping', name: 'Xaridlar', type: 'expense', icon: 'shopping-bag', color: '#eb6834' },
  { id: 'exp-other', name: 'Boshqa', type: 'expense', icon: 'more', color: '#64748b' },
];

export function defaultCategories(now = Date.now()): Category[] {
  return SEEDS.map((s, i) => ({ ...s, order: i, isDefault: true, createdAt: now, updatedAt: now }));
}
