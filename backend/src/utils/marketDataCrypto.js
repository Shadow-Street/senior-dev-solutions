/**
 * Encryption for market-data provider credentials (AES-256-GCM).
 *
 * Same scheme as utils/bankCrypto.js but with its OWN key, MARKET_DATA_KEY, so
 * a leak or rotation of one does not touch the other. The key is 32 bytes,
 * either 64 hex characters or base64:
 *
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * There is no fallback and no derived default. With the key missing or
 * malformed every function that needs it throws MarketDataCryptoUnavailableError;
 * the credential service then refuses to store anything and the Dhan provider
 * stays disabled (the admin panel shows why). Plaintext is never stored.
 *
 * Stored format:  v1:<base64( iv(12) | authTag(16) | ciphertext )>
 * The AAD binds the ciphertext to its provider row ("provider_credentials:dhan"),
 * so a value copied into another row fails to decrypt.
 */
const crypto = require('crypto');

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

class MarketDataCryptoUnavailableError extends Error {
  constructor(message = 'Market data credential encryption is not configured') {
    super(message);
    this.name = 'MarketDataCryptoUnavailableError';
    this.code = 'MARKET_DATA_CRYPTO_UNAVAILABLE';
  }
}

/** The 32-byte key, or null when unset/invalid. Read per call so config changes apply. */
function loadKey() {
  const raw = (process.env.MARKET_DATA_KEY || '').trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(raw)) {
    const key = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (key.length === 32) return key;
  }
  return null;
}

/** True when encryption can be used. Never throws, never exposes the key. */
function isMarketDataCryptoAvailable() {
  return loadKey() !== null;
}

function requireKey() {
  const key = loadKey();
  if (!key) throw new MarketDataCryptoUnavailableError();
  return key;
}

/** Encrypts `plaintext`, binding it to `aad`. */
function encryptSecret(plaintext, aad) {
  const key = requireKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(String(aad), 'utf8'));
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64')}`;
}

/** Decrypts a value from encryptSecret; throws on tamper, wrong key or wrong `aad`. */
function decryptSecret(stored, aad) {
  const key = requireKey();
  const [version, payload] = String(stored || '').split(':');
  if (version !== VERSION || !payload) throw new Error('Unsupported ciphertext format');
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_BYTES + TAG_BYTES + 1) throw new Error('Ciphertext too short');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, IV_BYTES));
  decipher.setAAD(Buffer.from(String(aad), 'utf8'));
  decipher.setAuthTag(buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(buf.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
}

module.exports = {
  MarketDataCryptoUnavailableError,
  isMarketDataCryptoAvailable,
  encryptSecret,
  decryptSecret,
};
