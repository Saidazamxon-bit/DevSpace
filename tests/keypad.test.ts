import { describe, expect, it } from 'vitest';
import { applyPadKey, type PadKey } from '../src/utils/keypad';
import { parseMoney } from '../src/utils/money';

const type = (keys: PadKey[], fmt: 'space' | 'comma' | 'dot' = 'space', neg = false) => keys.reduce((v, k) => applyPadKey(v, k, fmt, neg), '');
const digits = (s: string) => s.split('') as PadKey[];

describe('ilova klaviaturasi', () => {
  it('raqamlarni minglik ajratuvchi bilan yozadi', () => {
    expect(type(digits('1250000'))).toBe('1 250 000');
    expect(type([...digits('125'), '000'])).toBe('125 000');
    expect(type(digits('1250'), 'comma')).toBe('1,250');
    expect(type(digits('1250'), 'dot')).toBe('1.250');
  });
  it('kasr qismi: ko‘pi bilan 2 xona', () => {
    expect(type([...digits('12'), 'dec', ...digits('505')])).toBe('12,50');
    expect(type(['dec', '5'], 'comma')).toBe('0.5');
    expect(type([...digits('12'), 'dec', 'dec', '3'])).toBe('12,3');
  });
  it('boshidagi nollar va 000', () => {
    expect(type(['0', '0', '5'])).toBe('5');
    expect(type(['000'])).toBe('');
    expect(type(['0', '000'])).toBe('0');
  });
  it('o‘chirish va tozalash', () => {
    expect(type([...digits('12345'), 'back'])).toBe('1 234');
    expect(type([...digits('12'), 'dec', '5', 'back', 'back'])).toBe('12');
    expect(type([...digits('99'), 'clear'])).toBe('');
  });
  it('ishora (boshlang‘ich balans uchun)', () => {
    expect(type(['sign', ...digits('500')], 'space', true)).toBe('−500');
    expect(type(['sign', '5'], 'space', false)).toBe('5');
  });
  it('natija parseMoney bilan to‘g‘ri o‘qiladi', () => {
    for (const fmt of ['space', 'comma', 'dot'] as const) {
      const v = type([...digits('1250000'), 'dec', '7', '5'], fmt);
      const r = parseMoney(v);
      expect(r.ok && r.value).toBe(125_000_075);
    }
  });
});
