import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, minorToDecimalString, minorToInput } from '../src/utils/money';

describe('parseMoney — tiyinda butun son', () => {
  const ok = (s: string) => {
    const r = parseMoney(s);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };
  it('turli formatlarni qabul qiladi', () => {
    expect(ok('1 250 000')).toBe(125_000_000);
    expect(ok('1250000,5')).toBe(125_000_050);
    expect(ok('1,250,000.50')).toBe(125_000_050);
    expect(ok('1.250.000,50')).toBe(125_000_050);
    expect(ok('99.9')).toBe(9990);
    expect(ok('0,01')).toBe(1);
    expect(ok('1,250')).toBe(125_000); // minglik ajratuvchi
    expect(ok('100.')).toBe(10_000);
  });
  it('floating-point xatosiz: 0.1 + 0.2', () => {
    expect(ok('0.1') + ok('0.2')).toBe(ok('0.3'));
  });
  it('noto‘g‘ri kiritishlarni rad etadi', () => {
    expect(parseMoney('').ok).toBe(false);
    expect(parseMoney('0').ok).toBe(false);
    expect(parseMoney('-5').ok).toBe(false);
    expect(parseMoney('abc').ok).toBe(false);
    expect(parseMoney('1.234').ok).toBe(true); // 1234
    expect(parseMoney('1,2,3.456').ok).toBe(false);
    expect(parseMoney('99999999999999999').ok).toBe(false);
  });
});

describe('formatMoney', () => {
  it('UZS — bo‘shliq bilan guruhlash, kasrsiz', () => {
    expect(formatMoney(125_000_000, { currency: 'UZS', numberFormat: 'space' })).toBe('1 250 000 so‘m');
  });
  it('USD — prefiks va doim 2 xonali kasr', () => {
    expect(formatMoney(4_050_080, { currency: 'USD', numberFormat: 'comma' })).toBe('$40,500.80');
    expect(formatMoney(100, { currency: 'USD', numberFormat: 'comma' })).toBe('$1.00');
  });
  it('ishoralar', () => {
    expect(formatMoney(-2000, { currency: 'USD', numberFormat: 'comma', sign: 'always' })).toBe('−$20.00');
    expect(formatMoney(2000, { currency: 'USD', numberFormat: 'comma', sign: 'always' })).toBe('+$20.00');
  });
  it('qisqa ko‘rinish', () => {
    expect(formatMoney(1_250_000_000, { currency: 'UZS', numberFormat: 'space', compact: true })).toBe('12,5 mln so‘m');
  });
  it('yordamchi konvertorlar', () => {
    expect(minorToDecimalString(125_000_050)).toBe('1250000.50');
    expect(minorToInput(125_000_050, 'space')).toBe('1 250 000,50');
  });
});
