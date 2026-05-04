import crypto from 'crypto';

// AES-256-GCM symmetric encryption para credenciales sensibles (ej. Garmin
// email+password). La key se deriva via scrypt de GARMIN_CREDS_SECRET — un
// string random que vive en env (Vercel + .env local).
//
// Si se rota el secret, las credenciales viejas dejan de poder desencriptarse
// y el usuario debe re-loguearse — comportamiento esperado.

const KEY_SALT = Buffer.from('garmin-creds-v1', 'utf8');
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // recomendado para GCM

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.GARMIN_CREDS_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('GARMIN_CREDS_SECRET env var missing or too short (min 16 chars)');
  }
  cachedKey = crypto.scryptSync(secret, KEY_SALT, 32);
  return cachedKey;
}

export interface EncryptedField {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64 GCM auth tag
}

export function encrypt(plaintext: string): EncryptedField {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decrypt(field: EncryptedField): string {
  const key = getKey();
  const iv = Buffer.from(field.iv, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(Buffer.from(field.tag, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(field.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}
