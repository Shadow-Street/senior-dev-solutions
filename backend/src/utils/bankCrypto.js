/**
 * Encryption for bank account numbers (AES-256-GCM).
 *
 * The key comes from BANK_DATA_KEY: 32 bytes, either 64 hex characters or
 * base64. There is deliberately no fallback and no derived default: when the
 * key is missing or malformed, every function that would need it throws
 * BankCryptoUnavailableError, which the routes turn into a 503. Plaintext is
 * therefore never stored "just for now".
 *
 *   generate a key:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Stored format:  v1:<base64( iv(12) | authTag(16) | ciphertext )>
 * The owning user's id is bound in as additional authenticated data, so a
 * ciphertext copied onto another user's row fails to decrypt instead of
 * silently revealing the number.
 *
 * Losing or rotating the key makes existing rows undecryptable; there is no
 * re-encryption tooling yet (see BE-11 notes).
 */
const crypto = require('crypto');

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

class BankCryptoUnavailableError extends Error {
  constructor(message = 'Bank data encryption is not configured') {
    super(message);
    this.name = 'BankCryptoUnavailableError';
    this.code = 'BANK_CRYPTO_UNAVAILABLE';
  }
}

/** Returns the 32-byte key, or null when unset/invalid. Read per call so config changes take effect. */
function loadKey() {
  const raw = (process.env.BANK_DATA_KEY || '').trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(raw)) {
    const key = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (key.length === 32) return key;
  }
  return null;
}

/** True when encryption can be used. Never throws, never exposes the key. */
function isBankCryptoAvailable() {
  return loadKey() !== null;
}

function requireKey() {
  const key = loadKey();
  if (!key) throw new BankCryptoUnavailableError();
  return key;
}

/** Encrypts `plaintext`, binding it to `aad` (the owning user's id). */
function encryptBankValue(plaintext, aad) {
  const key = requireKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(String(aad), 'utf8'));
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ct]).toString('base64')}`;
}

/** Decrypts a value from encryptBankValue; throws on tamper, wrong key or wrong `aad`. */
function decryptBankValue(stored, aad) {
  const key = requireKey();
  const [version, payload] = String(stored || '').split(':');
  if (version !== VERSION || !payload) throw new Error('Unsupported ciphertext format');
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_BYTES + TAG_BYTES + 1) throw new Error('Ciphertext too short');
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(String(aad), 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** "XXXXXXXX1234" style mask built from the stored last four digits only. */
function maskAccountNumber(last4) {
  return `XXXXXXXX${String(last4 || '').slice(-4)}`;
}

module.exports = {
  BankCryptoUnavailableError,
  isBankCryptoAvailable,
  encryptBankValue,
  decryptBankValue,
  maskAccountNumber,
};
