/**
 * DhanHQ credential store and automatic token renewal (BE-10).
 *
 * WHAT IT HOLDS
 *   One row in `provider_credentials` (provider = 'dhan'): the client id and the
 *   access token, the token AES-256-GCM encrypted with MARKET_DATA_KEY
 *   (utils/marketDataCrypto.js). Fail closed: without the key nothing is stored
 *   and nothing is decrypted, the provider stays inactive, and the admin panel
 *   shows why. DhanProvider reads credentials only through getCredentials().
 *
 * THE TOKEN NEVER LEAVES THIS MODULE
 *   It is not returned by getStatus(), not put in errors (CredentialError
 *   messages are fixed strings), not logged, not written to audit rows. The only
 *   places it is used are the three Dhan HTTP calls below, as a request header.
 *
 * RENEWAL (Dhan's RenewToken API, GET /v2/RenewToken)
 *   Dhan tokens live 24 h; RenewToken expires the current one and issues another
 *   24 h token, but only for a token that is still active and was generated from
 *   Dhan Web. No PIN or TOTP is ever stored. The scheduler checks every ~15 min
 *   (+/- jitter) and renews when under 4 h of validity remains.
 *   - Single flight in this process (one shared promise) and across processes via
 *     a row lock (SELECT ... FOR UPDATE inside a transaction): a process that
 *     gets the lock second sees the already-renewed row and adopts it.
 *   - A transient failure (network, 5xx, 429) while the token is still valid is
 *     retried with exponential backoff (1 min .. 15 min).
 *   - If Dhan rejects the renewal, or the token has expired, the credential is
 *     marked LAPSED: Dhan is disabled (existing providers answer as before) and
 *     admins are alerted ONCE per lapse (in-app notification + email). A new
 *     token pasted by an admin starts a fresh lapse cycle.
 *   - RenewToken invalidates the old token the moment it succeeds. If the DB
 *     write then fails, the new token is kept in memory (the provider keeps
 *     working) and persisted on the next tick.
 *
 * Everything time- and I/O-dependent (store, clock, timers, notifier) is
 * injectable, and nothing starts until start() is called, so tests leave no
 * timers behind.
 */
const {
  isMarketDataCryptoAvailable,
  encryptSecret,
  decryptSecret,
} = require('../utils/marketDataCrypto');

const { effectiveRole, ADMIN_ROLES } = require('../utils/roles');

const PROVIDER = 'dhan';
const AAD = 'provider_credentials:dhan';

const HOUR = 60 * 60 * 1000;
const RENEW_BEFORE_MS = 4 * HOUR;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const MAX_BACKOFF_MS = 15 * 60 * 1000;
const EXPIRY_SAFETY_MS = 30 * 1000;
const DEFAULT_VALIDITY_MS = 23 * HOUR; // used only when neither the JWT nor Dhan states an expiry
const IST_OFFSET_MS = 5.5 * HOUR;

const CLIENT_ID_RE = /^[0-9]{4,20}$/;
const TOKEN_RE = /^[A-Za-z0-9._~+/=-]{20,4096}$/;

/** Safe-to-show failure. `message` is always one of our own fixed strings. */
class CredentialError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'CredentialError';
    this.code = code;
    this.status = status;
  }
}

const baseUrl = () => require('./DhanProvider').DhanProvider.BASE_URL;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** "1234567890" -> "******7890". Used everywhere a client id is displayed. */
function maskClientId(clientId) {
  const v = String(clientId || '');
  if (!v) return null;
  return `${'*'.repeat(Math.max(v.length - 4, 0))}${v.slice(-4)}`;
}

/** `exp` claim of a JWT in ms, WITHOUT verifying the signature. null if absent/undecodable. */
function decodeJwtExp(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Dhan timestamps: "30/03/2025 15:37" (profile.tokenValidity) or
 * "2025-09-23T12:37:23(.000)" (expiryTime). Neither carries a zone: both are IST.
 * Values with an explicit zone ("Z", "+05:30") are honoured as written.
 */
function parseDhanTime(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  let m = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (m) {
    const [, dd, mm, yyyy, hh, mi, ss] = m;
    return Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi, +(ss || 0)) - IST_OFFSET_MS;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/.exec(v);
  if (m) {
    const [, yyyy, mm, dd, hh, mi, ss] = m;
    return Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi, +(ss || 0)) - IST_OFFSET_MS;
  }
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/**
 * Best expiry estimate: the earliest future instant among the JWT `exp` and any
 * Dhan-stated expiry (the earliest is the safe one to renew by). null if none is
 * in the future.
 */
function resolveExpiry({ token, stated, now }) {
  const candidates = [decodeJwtExp(token), parseDhanTime(stated)].filter((t) => Number.isFinite(t) && t > now);
  return candidates.length ? Math.min(...candidates) : null;
}

const AUTH_CODES = new Set(['DH-901', '807', '808', '809', '810']);

function errorCodeOf(json) {
  if (!json || typeof json !== 'object') return '';
  if (json.errorCode) return String(json.errorCode);
  if (json.data && typeof json.data === 'object') {
    const k = Object.keys(json.data).find((x) => /^\d{3}$/.test(x));
    if (k) return k;
  }
  return '';
}

/** Pull the new token out of a RenewToken response, whatever field Dhan names it. */
function parseRenewResponse(json) {
  const src = json && typeof json === 'object' ? json : {};
  const nested = src.data && typeof src.data === 'object' ? src.data : {};
  const token = [src.accessToken, src.access_token, src.token, nested.accessToken, nested.access_token, nested.token]
    .find((t) => typeof t === 'string' && TOKEN_RE.test(t.trim()));
  const stated = [src.expiryTime, src.expiry_time, src.expiresAt, nested.expiryTime, nested.expiry_time]
    .find((t) => typeof t === 'string');
  return { token: token ? token.trim() : null, stated: stated || null };
}

// ---------------------------------------------------------------------------
// Dhan HTTP (token goes out as a header only)
// ---------------------------------------------------------------------------

async function dhanGet(path, headers) {
  let res;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return { network: true, status: 0, json: null };
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  return { network: false, status: res.status, json };
}

const isAuthRejection = (r) => r.status === 401 || r.status === 403 || AUTH_CODES.has(errorCodeOf(r.json));
const isTransient = (r) => r.network || r.status === 429 || r.status >= 500 || errorCodeOf(r.json) === 'DH-904';

/**
 * Cheap token check: GET /profile (Dhan's "User Profile" API, meant as a test
 * call). Returns { expiresAt, dataPlan, dataValidity }; throws CredentialError.
 */
async function checkWithProfile(clientId, token, now) {
  const r = await dhanGet('/profile', { 'access-token': token });
  if (isAuthRejection(r)) {
    throw new CredentialError('invalid_credentials', 'Dhan rejected this access token. It may be expired or mistyped.', 422);
  }
  if (isTransient(r) || !r.json || r.status >= 400) {
    throw new CredentialError('upstream_unavailable', 'Could not reach Dhan to verify the token. Try again shortly.', 502);
  }
  const profile = r.json;
  if (profile.dhanClientId !== undefined && String(profile.dhanClientId) !== String(clientId)) {
    throw new CredentialError('client_mismatch', 'The access token belongs to a different Dhan client id.', 422);
  }
  const dataPlan = typeof profile.dataPlan === 'string' ? profile.dataPlan : null;
  if (dataPlan !== null && dataPlan.toLowerCase() !== 'active') {
    throw new CredentialError('subscription_inactive', 'The Dhan Data API subscription is not active for this account.', 422);
  }
  const expiresAt = resolveExpiry({ token, stated: profile.tokenValidity, now });
  return {
    expiresAt,
    dataPlan,
    dataValidity: typeof profile.dataValidity === 'string' ? profile.dataValidity : null,
  };
}

// ---------------------------------------------------------------------------
// Default collaborators (database store, admin alerts)
// ---------------------------------------------------------------------------

function sequelizeStore() {
  const db = require('../models');
  const where = { provider: PROVIDER };
  const plain = (row) => (row ? (typeof row.get === 'function' ? row.get({ plain: true }) : { ...row }) : null);
  return {
    async get() {
      return plain(await db.ProviderCredential.findOne({ where }));
    },
    /** Runs fn(tx) in one transaction; tx.read() takes the row lock. */
    async transaction(fn) {
      return db.sequelize.transaction(async (t) => {
        let existing;
        return fn({
          async read() {
            existing = await db.ProviderCredential.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
            return plain(existing);
          },
          async write(patch) {
            if (existing) {
              await existing.update({ ...patch, updated_at: new Date() }, { transaction: t });
            } else {
              existing = await db.ProviderCredential.create({ provider: PROVIDER, ...patch }, { transaction: t });
            }
          },
        });
      });
    },
  };
}

function defaultNotifier() {
  return {
    /** In-app notification for every admin / super_admin, plus an email to each. */
    async notifyLapse({ reason, clientIdMasked }) {
      const db = require('../models');
      const { Op } = db.Sequelize;
      // Same rule as every privilege check (utils/roles.js): app_role || role.
      // The SQL prefilter is a superset (any user whose app_role OR role is an
      // admin role, which also covers super_admin with an empty app_role); the
      // JS filter then applies effectiveRole exactly.
      const candidates = await db.User.findAll({
        where: { [Op.or]: [{ app_role: { [Op.in]: ADMIN_ROLES } }, { role: { [Op.in]: ADMIN_ROLES } }] },
        attributes: ['id', 'email', 'app_role', 'role'],
        limit: 500,
      });
      const admins = candidates.filter((u) => ADMIN_ROLES.includes(effectiveRole(u)));
      if (!admins.length) return 0;
      const title = 'Dhan market data token needs attention';
      const message = `The Dhan access token${clientIdMasked ? ` for client ${clientIdMasked}` : ''} has lapsed (${reason}). `
        + 'Live NSE data has fallen back to the other providers. Generate a new token at web.dhan.co > My Profile > Access DhanHQ APIs '
        + 'and paste it in Super Admin > Platform Settings > Market Data (Dhan).';
      await db.Notification.bulkCreate(admins.map((a) => ({
        user_id: a.id,
        type: 'market_data_lapsed',
        title,
        message,
        is_read: false,
        data: { provider: PROVIDER },
        action_url: '/SuperAdmin',
        priority: 'high',
      })));
      try {
        const EmailService = require('./EmailService');
        const html = `<p>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`;
        for (const a of admins) {
          if (a.email) await EmailService.sendEmail(a.email, title, html);
        }
      } catch (e) {
        console.error('[Dhan] lapse email failed:', e && e.name);
      }
      return admins.length;
    },
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class DhanCredentialService {
  /**
   * @param {object} [opts]
   * @param {{get:Function, transaction:Function}} [opts.store]   persistence (default: Sequelize)
   * @param {{notifyLapse:Function}} [opts.notifier]              admin alerts (default: Notification + email)
   * @param {() => number} [opts.now]                             clock (ms)
   * @param {{setTimeout:Function, clearTimeout:Function}} [opts.timers]
   * @param {() => number} [opts.random]                          jitter source in [0,1)
   * @param {object} [opts.env]                                   environment for the one-time bootstrap
   */
  constructor(opts = {}) {
    this.storeOverride = opts.store || null;
    this.notifierOverride = opts.notifier || null;
    this.now = opts.now || Date.now;
    this.timers = opts.timers || { setTimeout, clearTimeout };
    this.random = opts.random || Math.random;
    this.env = opts.env || process.env;

    this.state = null;       // row metadata (never the token) or null when no row
    this.token = null;       // decrypted access token, only while active
    this.loadProblem = null; // 'decrypt_failed' | 'load_failed' | null
    this.version = 0;        // bumps whenever the usable credentials change
    this.renewing = null;    // in-process single flight
    this.alerting = null;    // in-process single flight for the lapse alert
    this.failures = 0;       // consecutive failed ticks, drives backoff
    this.timer = null;
    this.needsPersist = false;
    this.unpersisted = null;
    this.lastAuthFailureReload = 0;
  }

  get store() {
    if (!this.storeOverride) this.storeOverride = sequelizeStore();
    return this.storeOverride;
  }

  get notifier() {
    if (!this.notifierOverride) this.notifierOverride = defaultNotifier();
    return this.notifierOverride;
  }

  // ----- reading -----------------------------------------------------------

  /**
   * What DhanProvider calls on every request. Synchronous, in-memory.
   * null = provider inactive (no key, no token, lapsed, expired, undecryptable).
   */
  getCredentials() {
    const st = this.state;
    if (!st || st.status !== 'active' || !this.token || !isMarketDataCryptoAvailable()) return null;
    if (st.expiresAt !== null && this.now() >= st.expiresAt - EXPIRY_SAFETY_MS) return null;
    return { clientId: st.clientId, accessToken: this.token, version: this.version };
  }

  /** Why Dhan is not usable right now (null when it is). */
  disabledReason() {
    if (!isMarketDataCryptoAvailable()) return 'encryption_key_missing';
    if (this.loadProblem) return this.loadProblem;
    const st = this.state;
    if (!st) return 'not_configured';
    if (st.status === 'lapsed') return 'lapsed';
    if (st.expiresAt !== null && this.now() >= st.expiresAt - EXPIRY_SAFETY_MS) return 'expired';
    return null;
  }

  /** Admin-safe description. Contains no token, no client id (only a mask), no upstream text. */
  getStatus() {
    const st = this.state;
    const reason = this.disabledReason();
    const iso = (ms) => (ms === null || ms === undefined ? null : new Date(ms).toISOString());
    return {
      provider: PROVIDER,
      encryption_available: isMarketDataCryptoAvailable(),
      configured: Boolean(st),
      client_id_masked: st ? maskClientId(st.clientId) : null,
      status: !st ? 'not_configured' : (reason === 'lapsed' || reason === 'expired' ? 'lapsed' : st.status),
      active: reason === null,
      disabled_reason: reason,
      expires_at: st ? iso(st.expiresAt) : null,
      last_renewed_at: st ? iso(st.lastRenewedAt) : null,
      last_error: st ? st.lastError : null,
      last_error_at: st ? iso(st.lastErrorAt) : null,
      renew_before_hours: RENEW_BEFORE_MS / HOUR,
    };
  }

  // ----- loading -----------------------------------------------------------

  static fromRow(row) {
    const ms = (v) => (v ? new Date(v).getTime() : null);
    return {
      clientId: String(row.client_id),
      status: row.status === 'lapsed' ? 'lapsed' : 'active',
      expiresAt: ms(row.expires_at),
      lastRenewedAt: ms(row.last_renewed_at),
      lastError: row.last_error || null,
      lastErrorAt: ms(row.last_error_at),
      lapsedNotified: Boolean(row.lapsed_notified_at),
    };
  }

  _adopt(row) {
    const next = DhanCredentialService.fromRow(row);
    let token = null;
    this.loadProblem = null;
    if (next.status === 'active' && isMarketDataCryptoAvailable()) {
      try {
        token = decryptSecret(row.access_token_encrypted, AAD);
      } catch {
        this.loadProblem = 'decrypt_failed'; // wrong key or tampered ciphertext
      }
    }
    const changed = this.token !== token || !this.state || this.state.status !== next.status || this.state.clientId !== next.clientId;
    this.state = next;
    this.token = token;
    if (changed) this.version += 1;
  }

  /** (Re)load the row into memory. Safe to call at any time. */
  async load() {
    try {
      const row = await this.store.get();
      if (!row) {
        if (this.state) this.version += 1;
        this.state = null;
        this.token = null;
        this.loadProblem = null;
      } else {
        this._adopt(row);
      }
    } catch {
      this.loadProblem = 'load_failed';
      console.error('[Dhan] could not read stored credentials');
    }
    return this.getStatus();
  }

  /**
   * One-time import of DHAN_CLIENT_ID / DHAN_ACCESS_TOKEN when the table has no
   * Dhan row. After this the stored (renewable) token supersedes the env one.
   */
  async bootstrapFromEnv() {
    const clientId = String(this.env.DHAN_CLIENT_ID || '').trim();
    const token = String(this.env.DHAN_ACCESS_TOKEN || '').trim();
    if (!clientId || !token) return false;
    if (!isMarketDataCryptoAvailable()) {
      console.warn('[Dhan] DHAN_CLIENT_ID/DHAN_ACCESS_TOKEN are set but MARKET_DATA_KEY is not; the credentials cannot be stored, so Dhan stays disabled');
      return false;
    }
    if (!CLIENT_ID_RE.test(clientId) || !TOKEN_RE.test(token)) {
      console.warn('[Dhan] DHAN_CLIENT_ID/DHAN_ACCESS_TOKEN look malformed; not imported');
      return false;
    }
    try {
      if (await this.store.get()) return false;
      const now = this.now();
      // No readable expiry: assume it is about to lapse so renewal is attempted soon.
      const expiresAt = decodeJwtExp(token) ?? now + HOUR;
      await this.store.transaction(async (tx) => {
        if (await tx.read()) return;
        await tx.write({
          client_id: clientId,
          access_token_encrypted: encryptSecret(token, AAD),
          status: 'active',
          expires_at: new Date(expiresAt),
          last_renewed_at: null,
          last_error: null,
          last_error_at: null,
          lapsed_notified_at: null,
          updated_by: null,
        });
      });
      await this.load();
      console.log('[Dhan] Imported DHAN_CLIENT_ID / DHAN_ACCESS_TOKEN from the environment into the encrypted credential store. '
        + 'The environment token is now superseded by the stored one (it is renewed automatically); remove DHAN_ACCESS_TOKEN from the environment.');
      return true;
    } catch (e) {
      console.error('[Dhan] bootstrap from environment failed:', e && e.name);
      return false;
    }
  }

  /** Called by DhanProvider when Dhan rejects the token: another process may have renewed it. */
  noteAuthFailure() {
    const t = this.now();
    if (t - this.lastAuthFailureReload < 30 * 1000) return;
    this.lastAuthFailureReload = t;
    this.load().catch(() => { /* logged inside */ });
  }

  // ----- admin actions -----------------------------------------------------

  _requireCrypto() {
    if (!isMarketDataCryptoAvailable()) {
      throw new CredentialError('crypto_unavailable', 'Market data encryption key (MARKET_DATA_KEY) is not configured on the server.', 503);
    }
  }

  /**
   * Validate a pasted token against Dhan, then store it. A token Dhan rejects is
   * never stored. Replaces any previous token and clears a lapse.
   */
  async setCredentials({ clientId, accessToken, actorId = null }) {
    this._requireCrypto();
    const id = String(clientId || '').trim();
    const token = String(accessToken || '').trim();
    if (!CLIENT_ID_RE.test(id)) throw new CredentialError('invalid_input', 'Client id must be numeric.', 400);
    if (!TOKEN_RE.test(token)) throw new CredentialError('invalid_input', 'Access token format is not valid.', 400);

    const now = this.now();
    const check = await checkWithProfile(id, token, now);
    const expiresAt = check.expiresAt ?? now + DEFAULT_VALIDITY_MS;
    const encrypted = encryptSecret(token, AAD);

    await this.store.transaction(async (tx) => {
      await tx.read(); // lock the row if it exists
      await tx.write({
        client_id: id,
        access_token_encrypted: encrypted,
        status: 'active',
        expires_at: new Date(expiresAt),
        last_error: null,
        last_error_at: null,
        lapsed_notified_at: null, // a new lapse later must alert again
        updated_by: actorId,
        ...(this.state ? {} : { last_renewed_at: null }),
      });
    });
    this.failures = 0;
    this.needsPersist = false;
    this.unpersisted = null;
    await this.load();
    return this.getStatus();
  }

  /** Verify the stored credentials against Dhan without changing anything. */
  async test() {
    this._requireCrypto();
    const creds = this.getCredentials();
    if (!creds) {
      return { ok: false, reason: this.disabledReason() || 'not_configured' };
    }
    try {
      const check = await checkWithProfile(creds.clientId, creds.accessToken, this.now());
      return {
        ok: true,
        token_valid_until: check.expiresAt ? new Date(check.expiresAt).toISOString() : null,
        data_plan: check.dataPlan,
        data_validity: check.dataValidity,
      };
    } catch (e) {
      if (e instanceof CredentialError) return { ok: false, reason: e.code, message: e.message };
      throw e;
    }
  }

  // ----- renewal -----------------------------------------------------------

  /**
   * Renew now (single flight). Resolves to the status; throws CredentialError.
   * `force` renews even if plenty of validity remains (admin "Renew now").
   */
  renew({ force = false } = {}) {
    if (!this.renewing) {
      this.renewing = this._renew(force).finally(() => { this.renewing = null; });
    }
    return this.renewing;
  }

  async _renew(force) {
    this._requireCrypto();
    let outcome;
    try {
      outcome = await this.store.transaction((tx) => this._renewLocked(tx, force));
    } catch (e) {
      if (e instanceof CredentialError) throw e;
      if (this.unpersisted) {
        // Dhan already issued the new token (the old one is dead): keep using it
        // and persist on the next tick rather than losing the credential.
        this._applyUnpersisted();
        throw new CredentialError('persist_failed', 'Token was renewed but could not be saved yet; it will be saved automatically.', 500);
      }
      console.error('[Dhan] renewal transaction failed:', e && e.name);
      throw new CredentialError('renew_failed', 'Token renewal failed. It will be retried.', 502);
    }
    return this._applyOutcome(outcome);
  }

  async _renewLocked(tx, force) {
    const row = await tx.read(); // FOR UPDATE: other processes wait here
    if (!row) throw new CredentialError('not_configured', 'No Dhan credentials are stored.', 409);
    const now = this.now();
    const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : null;

    if (row.status === 'lapsed') return { kind: 'adopted', row };
    // Someone else (another process, or an admin paste) refreshed it while we waited.
    if (!force && expiresMs !== null && expiresMs - now > RENEW_BEFORE_MS) return { kind: 'adopted', row };

    const lapse = async (reason) => {
      // lapsed_notified_at is set only AFTER an alert was actually sent
      // (_alertLapse), so a failed send is retried on a later tick.
      await tx.write({ status: 'lapsed', last_error: reason, last_error_at: new Date(now) });
      return { kind: 'lapsed', reason, shouldNotify: !row.lapsed_notified_at, clientId: row.client_id };
    };

    if (expiresMs !== null && expiresMs <= now) return lapse('Token expired');

    let token;
    try {
      token = decryptSecret(row.access_token_encrypted, AAD);
    } catch {
      throw new CredentialError('decrypt_failed', 'Stored token cannot be decrypted with the current MARKET_DATA_KEY.', 500);
    }

    const r = await dhanGet('/RenewToken', { 'access-token': token, dhanClientId: String(row.client_id) });
    if (isTransient(r)) {
      const message = r.network ? 'Dhan unreachable during renewal' : `Dhan temporarily unavailable during renewal (${r.status})`;
      await tx.write({ last_error: message, last_error_at: new Date(now) });
      return { kind: 'transient', message };
    }
    if (r.status < 200 || r.status >= 300) {
      return lapse('Renewal rejected by Dhan');
    }

    const parsed = parseRenewResponse(r.json);
    if (!parsed.token) {
      // The old token is already invalidated but we can't read the new one.
      return lapse('Renewal response could not be read');
    }
    const expiresAt = resolveExpiry({ token: parsed.token, stated: parsed.stated, now }) ?? now + DEFAULT_VALIDITY_MS;
    const encrypted = encryptSecret(parsed.token, AAD);
    this.unpersisted = {
      token: parsed.token, expiresAt, clientId: String(row.client_id), at: now,
      // The stored ciphertext this renewal replaced: the compare-and-set key for a later persist.
      fromCipher: row.access_token_encrypted,
    };
    await tx.write({
      access_token_encrypted: encrypted,
      status: 'active',
      expires_at: new Date(expiresAt),
      last_renewed_at: new Date(now),
      last_error: null,
      last_error_at: null,
      lapsed_notified_at: null,
    });
    return { kind: 'renewed', token: parsed.token, expiresAt, at: now, clientId: String(row.client_id) };
  }

  async _applyOutcome(outcome) {
    switch (outcome.kind) {
      case 'renewed': {
        this.unpersisted = null;
        this.needsPersist = false;
        this.token = outcome.token;
        this.loadProblem = null;
        this.state = {
          ...(this.state || {}),
          clientId: outcome.clientId,
          status: 'active',
          expiresAt: outcome.expiresAt,
          lastRenewedAt: outcome.at,
          lastError: null,
          lastErrorAt: null,
          lapsedNotified: false,
        };
        this.version += 1;
        this.failures = 0;
        console.log(`[Dhan] access token renewed; valid until ${new Date(outcome.expiresAt).toISOString()}`);
        return this.getStatus();
      }
      case 'adopted':
        this._adopt(outcome.row);
        return this.getStatus();
      case 'lapsed': {
        this.unpersisted = null;
        this.token = null;
        this.state = {
          ...(this.state || { clientId: String(outcome.clientId) }),
          status: 'lapsed',
          lastError: outcome.reason,
          lastErrorAt: this.now(),
        };
        this.version += 1;
        console.error(`[Dhan] credential lapsed: ${outcome.reason}. Dhan is disabled until a new token is saved.`);
        if (outcome.shouldNotify) await this._alertLapse(outcome.reason, outcome.clientId);
        return this.getStatus();
      }
      case 'transient':
      default:
        this.state = { ...(this.state || {}), lastError: outcome.message, lastErrorAt: this.now() };
        throw new CredentialError('renew_failed', 'Dhan did not accept the renewal request right now. It will be retried.', 502);
    }
  }

  /**
   * Alert admins about the current lapse and, only if that succeeded, record it
   * (lapsed_notified_at) so it is not repeated. Single flight; never throws.
   * A failed send leaves the marker empty and tick() tries again.
   */
  _alertLapse(reason, clientId) {
    if (!this.alerting) {
      this.alerting = (async () => {
        try {
          await this.notifier.notifyLapse({ reason, clientIdMasked: maskClientId(clientId) });
        } catch (e) {
          console.error('[Dhan] lapse alert failed (will retry):', e && e.name);
          return;
        }
        try {
          await this.store.transaction(async (tx) => {
            const row = await tx.read();
            if (row && !row.lapsed_notified_at) await tx.write({ lapsed_notified_at: new Date(this.now()) });
          });
          if (this.state) this.state.lapsedNotified = true;
        } catch (e) {
          console.error('[Dhan] could not record the lapse alert:', e && e.name);
        }
      })().finally(() => { this.alerting = null; });
    }
    return this.alerting;
  }

  _applyUnpersisted() {
    const u = this.unpersisted;
    if (!u) return;
    this.token = u.token;
    this.state = { ...(this.state || {}), clientId: u.clientId, status: 'active', expiresAt: u.expiresAt, lastRenewedAt: u.at, lastError: null, lastErrorAt: null };
    this.version += 1;
    this.needsPersist = true;
  }

  async _persistUnsaved() {
    const u = this.unpersisted;
    if (!u) { this.needsPersist = false; return; }
    const outcome = await this.store.transaction(async (tx) => {
      const row = await tx.read(); // FOR UPDATE
      // Compare-and-set: only write if the row still holds what we renewed FROM.
      // If an admin pasted a new token (or another process renewed) in between,
      // our in-memory token is stale and must not overwrite the newer one.
      if (!row || row.access_token_encrypted !== u.fromCipher) return { adopt: row || undefined };
      await tx.write({
        access_token_encrypted: encryptSecret(u.token, AAD),
        status: 'active',
        expires_at: new Date(u.expiresAt),
        last_renewed_at: new Date(u.at),
        last_error: null,
        last_error_at: null,
      });
      return { adopt: null };
    });
    this.unpersisted = null;
    this.needsPersist = false;
    if (outcome.adopt) {
      console.warn('[Dhan] a newer token was stored while a renewed one was waiting to be saved; using the stored one');
      this._adopt(outcome.adopt);
    } else if (outcome.adopt === undefined) {
      await this.load();
    }
  }

  // ----- scheduler ---------------------------------------------------------

  /** One scheduler step. Never throws. */
  async tick() {
    try {
      if (this.needsPersist) await this._persistUnsaved();
      if (!isMarketDataCryptoAvailable()) return;
      if (!this.needsPersist) await this.load(); // picks up pastes/renewals from other processes
      const st = this.state;
      // A lapse whose alert could not be sent (or recorded) is retried here.
      if (st && st.status === 'lapsed' && !st.lapsedNotified) await this._alertLapse(st.lastError || 'Token lapsed', st.clientId);
      if (!st || st.status !== 'active' || this.loadProblem) return;
      if (st.expiresAt === null || st.expiresAt - this.now() < RENEW_BEFORE_MS) {
        await this.renew();
      }
      this.failures = 0;
    } catch (e) {
      this.failures += 1;
      if (!(e instanceof CredentialError)) console.error('[Dhan] scheduler step failed:', e && e.name);
    }
  }

  nextDelay() {
    if (this.failures > 0) {
      return Math.min(60 * 1000 * 2 ** (this.failures - 1), MAX_BACKOFF_MS);
    }
    const jitter = (this.random() * 2 - 1) * 0.1 * CHECK_INTERVAL_MS; // +/- 10 %
    return Math.round(CHECK_INTERVAL_MS + jitter);
  }

  /** Start the periodic check. Idempotent; the timer never keeps the process alive. */
  start({ initialDelayMs = 5000 } = {}) {
    if (this.timer) return;
    const schedule = (delay) => {
      const handle = this.timers.setTimeout(async () => {
        await this.tick();
        if (this.timer) schedule(this.nextDelay());
      }, delay);
      if (handle && typeof handle.unref === 'function') handle.unref();
      this.timer = handle || true;
    };
    schedule(initialDelayMs);
  }

  stop() {
    if (this.timer && this.timer !== true) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }
}

const dhanCredentials = new DhanCredentialService();

module.exports = {
  DhanCredentialService,
  CredentialError,
  dhanCredentials,
  // helpers exported for tests and for the admin route
  maskClientId,
  decodeJwtExp,
  parseDhanTime,
  resolveExpiry,
  parseRenewResponse,
  CLIENT_ID_RE,
  TOKEN_RE,
  RENEW_BEFORE_MS,
  CHECK_INTERVAL_MS,
};
