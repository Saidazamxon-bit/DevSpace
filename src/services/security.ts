/**
 * Ilovani qulflash: PIN-kod va (mavjud bo‘lsa) biometrik tasdiqlash (WebAuthn platform authenticator).
 *
 * MUHIM: bu himoya ilova interfeysiga kirishni cheklaydi. Brauzer IndexedDB dagi ma’lumotlar
 * diskda shifrlanmagan holda saqlanadi va qurilmaga to‘liq kirish huquqiga ega shaxsdan mutlaq
 * himoyalanmaydi. Maxfiy nusxa uchun “Shifrlangan zaxira” funksiyasidan foydalaning.
 */
import { base64ToBytes, bytesToBase64 } from '@/utils/misc';
import { cryptoAvailable, hashPin, randomBytes, safeEqual } from './crypto';
import { DEFAULT_SECURITY, getSecurity, setSecurity } from './finance';

export function pinSupported(): boolean {
  return cryptoAvailable();
}

export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN 4–6 ta raqamdan iborat bo‘lishi kerak');
  const cfg = await getSecurity();
  const salt = bytesToBase64(randomBytes(16));
  const pinHash = await hashPin(pin, salt, cfg.pinIterations || DEFAULT_SECURITY.pinIterations);
  await setSecurity({ ...cfg, pinHash, pinSalt: salt, pinLength: pin.length, pinIterations: cfg.pinIterations || DEFAULT_SECURITY.pinIterations });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const cfg = await getSecurity();
  if (!cfg.pinHash || !cfg.pinSalt) return true;
  const h = await hashPin(pin, cfg.pinSalt, cfg.pinIterations);
  return safeEqual(h, cfg.pinHash);
}

export async function removePin(): Promise<void> {
  const cfg = await getSecurity();
  await setSecurity({ ...cfg, pinHash: null, pinSalt: null, biometricCredentialId: null });
}

export async function biometricAvailable(): Promise<boolean> {
  try {
    if (!window.isSecureContext || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Qurilmaning biometrik autentifikatorida mahalliy kalit yaratadi (server talab qilinmaydi) */
export async function enableBiometric(): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32) as BufferSource,
      rp: { name: 'Personal Finance' },
      user: { id: randomBytes(16) as BufferSource, name: 'personal-finance', displayName: 'Personal Finance' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Biometrik kalit yaratilmadi');
  const cfg = await getSecurity();
  await setSecurity({ ...cfg, biometricCredentialId: bytesToBase64(new Uint8Array(cred.rawId)) });
}

export async function disableBiometric(): Promise<void> {
  const cfg = await getSecurity();
  await setSecurity({ ...cfg, biometricCredentialId: null });
}

/** Barmoq izi / Face ID orqali tasdiqlash */
export async function verifyBiometric(): Promise<boolean> {
  const cfg = await getSecurity();
  if (!cfg.biometricCredentialId) return false;
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32) as BufferSource,
        allowCredentials: [{ type: 'public-key', id: base64ToBytes(cfg.biometricCredentialId) as BufferSource, transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!res;
  } catch {
    return false;
  }
}
