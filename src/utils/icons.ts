import {
  Apple, Baby, Banknote, BookOpen, Briefcase, Bus, Car, Coffee, CreditCard, Dumbbell, Fuel, Gamepad2,
  Gift, GraduationCap, Heart, HeartPulse, Home, Laptop, Lightbulb, type LucideIcon, Music, Package,
  PawPrint, PiggyBank, Pill, Plane, Receipt, Scissors, Shirt, ShoppingBag, ShoppingCart, Smartphone,
  Sparkles, Store, TrendingUp, Tv, Utensils, Wallet, Wifi, Wrench, Zap, Landmark, HandCoins, Coins,
  Building2, Ticket, Bike, Train, Droplets, Flame, Stethoscope, Pizza, Wine, Cigarette, Palette, Users,
  CircleDollarSign, MoreHorizontal,
} from 'lucide-react';

/** Kategoriya ikonkalari ro‘yxati (nom => komponent). Nom ma’lumotlar bazasida saqlanadi. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  briefcase: Briefcase,
  laptop: Laptop,
  gift: Gift,
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  'hand-coins': HandCoins,
  coins: Coins,
  landmark: Landmark,
  'dollar': CircleDollarSign,
  store: Store,
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  apple: Apple,
  coffee: Coffee,
  pizza: Pizza,
  wine: Wine,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  train: Train,
  bike: Bike,
  plane: Plane,
  home: Home,
  building: Building2,
  zap: Zap,
  droplets: Droplets,
  flame: Flame,
  lightbulb: Lightbulb,
  wifi: Wifi,
  smartphone: Smartphone,
  tv: Tv,
  shirt: Shirt,
  scissors: Scissors,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
  pill: Pill,
  'graduation-cap': GraduationCap,
  book: BookOpen,
  gamepad: Gamepad2,
  music: Music,
  ticket: Ticket,
  palette: Palette,
  'shopping-bag': ShoppingBag,
  package: Package,
  dumbbell: Dumbbell,
  baby: Baby,
  paw: PawPrint,
  users: Users,
  heart: Heart,
  wrench: Wrench,
  receipt: Receipt,
  'credit-card': CreditCard,
  cigarette: Cigarette,
  sparkles: Sparkles,
  more: MoreHorizontal,
};

export const ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function getIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? MoreHorizontal;
}

/**
 * Kategoriya ranglari. Birinchi sakkiztasi rang ko‘rligi uchun tekshirilgan kategorik palitra tartibida.
 */
export const CATEGORY_COLORS = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948',
  '#0ea5b7', '#8b5e3c', '#64748b', '#c026d3',
];
