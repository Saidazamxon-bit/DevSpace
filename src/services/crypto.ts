import { base64ToBytes, bytesToBase64 } from '@/utils/misc';

export function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function pbkdf2Bits(secret: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
}

/** PIN-kodni PBKDF2-SHA256 bilan xeshlash. PIN o‘zi hech qachon saqlanmaydi. */
export async function hashPin(pin: string, saltB64: string, iterations: number): Promise<string> {
  const bits = await pbkdf2Bits(pin, base64ToBytes(saltB64), iterations);
  return bytesToBase64(new Uint8Array(bits));
}

/** Vaqtga bog‘liq bo‘lmagan taqqoslash */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedPayload {
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

export const BACKUP_KDF_ITERATIONS = 310_000;

export async function encryptText(plain: string, password: string): Promise<EncryptedPayload> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(password, salt, BACKUP_KDF_ITERATIONS);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(plain));
  return { iterations: BACKUP_KDF_ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(ct)) };
}

export async function decryptText(p: EncryptedPayload, password: string): Promise<string> {
  const key = await deriveAesKey(password, base64ToBytes(p.salt), p.iterations);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(p.iv) as BufferSource }, key, base64ToBytes(p.data) as BufferSource);
  return new TextDecoder().decode(pt);
}
