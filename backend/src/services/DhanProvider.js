/**
 * DhanHQ v2 market-data provider (https://dhanhq.co/docs/v2/).
 *
 * Serves Indian instruments only (symbols written Yahoo-style: TCS.NS, TCS.BO,
 * ^NSEI, ^NSEBANK, ^BSESN, ^CNXIT, ^CNXAUTO).
 *
 * Credentials come from a `credentials()` callback (the encrypted store behind
 * DhanCredentialService), never straight from the environment. With no
 * credentials, or a lapsed token, the provider is simply inactive: canServe()
 * is false, nothing is called, and the existing providers answer as before.
 *
 * Auth: headers `access-token` + `client-id`, never logged or returned. DhanHQ
 * answers 401/403 (or an error code such as DH-901 / 807 / 808) for an expired
 * token; the provider then logs ONE line, stands down for a cooldown, tells the
 * credential service (so it can pick up a token renewed by another process),
 * and throws so the caller falls through to the next provider.
 *
 * Endpoints:
 *   POST /marketfeed/quote   {"NSE_EQ":[2885], "IDX_I":[13]}  (<=1000 ids, 1 req/s)
 *   POST /charts/intraday    1/5/15/25/60 minute candles       (Data API, 5 req/s)
 *   POST /charts/historical  daily candles                     (Data API, 5 req/s)
 *
 * Symbol -> securityId: see InstrumentMaster below.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MASTER_URL = 'https://images.dhan.co/api-data/api-scrip-master.csv';
const MASTER_TTL_MS = 24 * 60 * 60 * 1000;
const AUTH_COOLDOWN_MS = 10 * 60 * 1000;
const RATE_COOLDOWN_MS = 5 * 1000;
const MAX_INSTRUMENTS_PER_REQUEST = 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MAX_MASTER_BYTES = 64 * 1024 * 1024;
const MAX_MASTER_LINE = 4096;
const MAX_INTRADAY_SPAN_S = 90 * 24 * 60 * 60;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Serialises async tasks and spaces their start times by at least minIntervalMs. */
class RateGate {
    constructor(minIntervalMs) {
        this.minIntervalMs = minIntervalMs;
        this.tail = Promise.resolve();
        this.lastStart = 0;
    }

    schedule(task) {
        const run = async () => {
            const wait = this.lastStart + this.minIntervalMs - Date.now();
            if (wait > 0) await sleep(wait);
            this.lastStart = Date.now();
            return task();
        };
        const result = this.tail.then(run, run);
        this.tail = result.catch(() => { });
        return result;
    }
}

// --- Symbol handling --------------------------------------------------------

const INDEX_ALIASES = {
    '^NSEI': { exchange: 'NSE', key: 'NIFTY' },
    '^NSEBANK': { exchange: 'NSE', key: 'BANKNIFTY' },
    '^BSESN': { exchange: 'BSE', key: 'SENSEX' },
    '^CNXIT': { exchange: 'NSE', key: 'NIFTYIT' },
    '^CNXAUTO': { exchange: 'NSE', key: 'NIFTY AUTO' },
};

/**
 * Curated fallback so the common large caps resolve even if the instrument
 * master can't be downloaded. IDs were checked against Dhan's published master
 * (api-scrip-master.csv); the downloaded master overrides these.
 */
const CURATED = [
    ['NSE', 'TCS', 11536, 'Tata Consultancy Services'],
    ['NSE', 'RELIANCE', 2885, 'Reliance Industries'],
    ['NSE', 'INFY', 1594, 'Infosys'],
    ['NSE', 'HDFCBANK', 1333, 'HDFC Bank'],
    ['NSE', 'ICICIBANK', 4963, 'ICICI Bank'],
    ['NSE', 'SBIN', 3045, 'State Bank of India'],
    ['NSE', 'BHARTIARTL', 10604, 'Bharti Airtel'],
    ['NSE', 'ITC', 1660, 'ITC'],
    ['NSE', 'LT', 11483, 'Larsen & Toubro'],
    ['NSE', 'KOTAKBANK', 1922, 'Kotak Bank'],
    ['NSE', 'AXISBANK', 5900, 'Axis Bank'],
    ['NSE', 'HINDUNILVR', 1394, 'Hindustan Unilever'],
    ['NSE', 'WIPRO', 3787, 'Wipro'],
    ['NSE', 'MARUTI', 10999, 'Maruti Suzuki'],
    ['NSE', 'M&M', 2031, 'Mahindra & Mahindra'],
    ['NSE', 'BAJFINANCE', 317, 'Bajaj Finance'],
    ['NSE', 'ADANIENT', 25, 'Adani Enterprises'],
    ['NSE', 'SUNPHARMA', 3351, 'Sun Pharmaceutical'],
    ['NSE', 'ASIANPAINT', 236, 'Asian Paints'],
    ['BSE', 'TCS', 532540, 'Tata Consultancy Services'],
    ['BSE', 'RELIANCE', 500325, 'Reliance Industries'],
];
const CURATED_INDICES = [
    ['NSE', 'NIFTY', 13, 'Nifty 50'],
    ['NSE', 'BANKNIFTY', 25, 'Nifty Bank'],
    ['NSE', 'NIFTYIT', 29, 'Nifty IT'],
    ['NSE', 'NIFTY AUTO', 14, 'Nifty Auto'],
    ['BSE', 'SENSEX', 51, 'Sensex'],
];
/** Index symbols shown on the dashboard, in display order. */
const UNIVERSE_INDEX_SYMBOLS = ['^NSEI', '^NSEBANK', '^BSESN', '^CNXIT', '^CNXAUTO'];
const UNIVERSE_SERIES = new Set(['EQ', 'BE']);

/** Yahoo-style symbol -> { exchange, kind, key } or null when not an Indian symbol. */
function parseSymbol(symbol) {
    if (typeof symbol !== 'string') return null;
    const s = symbol.trim().toUpperCase();
    if (INDEX_ALIASES[s]) return { ...INDEX_ALIASES[s], kind: 'index' };
    const m = /^([A-Z0-9&_-]{1,30})\.(NS|BO)$/.exec(s);
    if (!m) return null;
    return { exchange: m[2] === 'NS' ? 'NSE' : 'BSE', key: m[1], kind: 'equity' };
}

function isIndianSymbol(symbol) {
    return parseSymbol(symbol) !== null;
}

/**
 * Symbol -> {securityId, segment, instrument} lookup.
 *
 * Design: Dhan publishes the full instrument master (~25 MB CSV, ~200k rows,
 * mostly derivatives). We download it on demand (server-side only), keep just
 * NSE/BSE cash equities and indices (~25k rows -> a few MB), hold that in memory
 * and mirror it to a JSON file in the OS temp dir (DHAN_INSTRUMENT_CACHE_DIR to
 * override). It is refreshed when older than 24h; if the download fails the last
 * cached copy (even stale) and the curated map are used.
 */
class InstrumentMaster {
    constructor({ cacheDir, url, ttlMs, maxBytes, maxLineLength } = {}) {
        // Default: a per-user directory name under the OS temp dir. It is only
        // used if it passes the ownership/permission checks in prepareCacheDir().
        const uid = typeof process.getuid === 'function' ? process.getuid() : 'u';
        this.cacheDir = cacheDir || process.env.DHAN_INSTRUMENT_CACHE_DIR || path.join(os.tmpdir(), `protocall-dhan-${uid}`);
        this.url = url || MASTER_URL;
        this.ttlMs = ttlMs ?? MASTER_TTL_MS;
        this.maxBytes = maxBytes ?? MAX_MASTER_BYTES;
        this.maxLineLength = maxLineLength ?? MAX_MASTER_LINE;
        this.map = new Map();
        this.loadedAt = 0;
        this.loading = null;
        this.cacheDirReady = null; // Promise<string|null>: usable dir, or null = memory only
        this.searchIndex = null;
        this.seedCurated();
    }

    get cacheFile() {
        return path.join(this.cacheDir, 'instrument-master.json');
    }

    /**
     * Create the cache dir privately (0700) or, if it already exists, accept it
     * only when it is a real directory (not a symlink) owned by this process's
     * user and not accessible to group/others. Anything else -> memory only, so
     * another local user cannot pre-create or write into it to poison the map.
     */
    prepareCacheDir() {
        if (!this.cacheDirReady) {
            this.cacheDirReady = (async () => {
                const uid = typeof process.getuid === 'function' ? process.getuid() : null;
                const trusted = (st) => st.isDirectory() && !st.isSymbolicLink()
                    && (uid === null || st.uid === uid) && (st.mode & 0o077) === 0;
                try {
                    await fs.promises.mkdir(this.cacheDir, { recursive: true, mode: 0o700 });
                } catch { /* may already exist, or be unwritable: checked next */ }
                try {
                    let st = await fs.promises.lstat(this.cacheDir);
                    if (st.isDirectory() && !st.isSymbolicLink() && (uid === null || st.uid === uid) && (st.mode & 0o077) !== 0) {
                        await fs.promises.chmod(this.cacheDir, 0o700); // ours but too open (umask): tighten
                        st = await fs.promises.lstat(this.cacheDir);
                    }
                    if (trusted(st)) return this.cacheDir;
                } catch { /* fall through */ }
                console.warn('[Dhan] instrument cache directory is not private to this user; keeping the symbol map in memory only');
                return null;
            })();
        }
        return this.cacheDirReady;
    }

    static mapKey(kind, exchange, key) {
        return `${kind}:${exchange}:${key}`;
    }

    seedCurated() {
        for (const [exchange, key, id, name] of CURATED) {
            this.map.set(InstrumentMaster.mapKey('equity', exchange, key), {
                securityId: String(id), segment: `${exchange}_EQ`, instrument: 'EQUITY', name, exchange,
            });
        }
        for (const [exchange, key, id, name] of CURATED_INDICES) {
            this.map.set(InstrumentMaster.mapKey('index', exchange, key), {
                securityId: String(id), segment: 'IDX_I', instrument: 'INDEX', name, exchange,
            });
        }
    }

    isFresh() {
        return this.loadedAt > 0 && Date.now() - this.loadedAt < this.ttlMs;
    }

    async ensureLoaded() {
        if (this.isFresh()) return;
        if (!this.loading) {
            this.loading = this.refresh()
                .catch(() => { /* already logged; curated/stale data keeps working */ })
                .finally(() => { this.loading = null; });
        }
        await this.loading;
    }

    /** One persisted/downloaded row: exact shape, numeric id, known exchange/segment. */
    static isValidRow(r) {
        return Boolean(r) && typeof r === 'object'
            && (r.k === 'equity' || r.k === 'index')
            && (r.e === 'NSE' || r.e === 'BSE')
            && typeof r.s === 'string' && /^[A-Z0-9][A-Z0-9&_.\- ]{0,39}$/.test(r.s)
            && typeof r.id === 'string' && /^\d{1,9}$/.test(r.id)
            && typeof r.n === 'string' && r.n.length <= 200
            && typeof r.q === 'string' && r.q.length <= 8;
    }

    /**
     * Read the on-disk copy. Returns validated rows, or null if the file is
     * missing, not ours, too large, unparsable, or contains ANY invalid row (a
     * partially tampered file is discarded whole rather than trusted).
     */
    async readCacheFile({ requireFresh }) {
        const dir = await this.prepareCacheDir();
        if (!dir) return null;
        try {
            const st = await fs.promises.lstat(this.cacheFile);
            const uid = typeof process.getuid === 'function' ? process.getuid() : null;
            if (!st.isFile() || st.isSymbolicLink() || (uid !== null && st.uid !== uid)
                || (st.mode & 0o022) !== 0 || st.size > this.maxBytes) return null;
            if (requireFresh && Date.now() - st.mtimeMs >= this.ttlMs) return null;
            const rows = JSON.parse(await fs.promises.readFile(this.cacheFile, 'utf8'));
            if (!Array.isArray(rows) || rows.length === 0 || !rows.every(InstrumentMaster.isValidRow)) return null;
            return rows;
        } catch {
            return null;
        }
    }

    async refresh() {
        // 1. A recent, valid disk copy avoids a 25 MB download after every restart.
        const cached = await this.readCacheFile({ requireFresh: true });
        if (cached) {
            this.absorb(cached);
            this.loadedAt = Date.now();
            return;
        }

        // 2. Download and filter.
        try {
            const rows = (await this.download()).filter(InstrumentMaster.isValidRow);
            if (rows.length === 0) throw new Error('empty instrument master');
            this.absorb(rows);
            this.loadedAt = Date.now();
            this.persist(rows);
        } catch (e) {
            console.warn(`[Dhan] instrument master download failed (${e && e.message}); using cached/curated symbols`);
            // 3. A stale (but still validated) disk copy beats nothing; retry the download in an hour.
            const stale = await this.readCacheFile({ requireFresh: false });
            if (stale) this.absorb(stale);
            this.loadedAt = Date.now() - this.ttlMs + 60 * 60 * 1000;
            throw e;
        }
    }

    /**
     * Stream the CSV, enforcing a total size cap and a line length cap, and
     * abort the request cleanly when either is exceeded.
     */
    async download() {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 120000);
        try {
            const res = await fetch(this.url, { signal: ac.signal });
            if (!res.ok || !res.body) throw new Error(`instrument master HTTP ${res.status}`);
            const declared = Number(res.headers.get('content-length'));
            if (Number.isFinite(declared) && declared > this.maxBytes) {
                throw new Error('instrument master too large');
            }

            const decoder = new TextDecoder();
            const rows = [];
            let header = null;
            let buffer = '';
            let total = 0;

            const handleLine = (line) => {
                if (!line) return;
                if (line.length > this.maxLineLength) throw new Error('instrument master line too long');
                const cols = line.split(',');
                if (!header) {
                    header = Object.fromEntries(cols.map((c, i) => [c.trim(), i]));
                    return;
                }
                const row = InstrumentMaster.toRow(cols, header);
                if (row) rows.push(row);
            };

            for await (const chunk of res.body) {
                total += chunk.length;
                if (total > this.maxBytes) throw new Error('instrument master too large');
                buffer += decoder.decode(chunk, { stream: true });
                let nl;
                while ((nl = buffer.indexOf('\n')) >= 0) {
                    handleLine(buffer.slice(0, nl).replace(/\r$/, ''));
                    buffer = buffer.slice(nl + 1);
                }
                if (buffer.length > this.maxLineLength) throw new Error('instrument master line too long');
            }
            handleLine((buffer + decoder.decode()).replace(/\r$/, ''));
            return rows;
        } catch (e) {
            ac.abort(); // stop the transfer; the stream is released
            throw e;
        } finally {
            clearTimeout(timer);
        }
    }

    /** Keep only NSE/BSE cash equities and indices from a CSV row. */
    static toRow(cols, h) {
        const exchange = cols[h.SEM_EXM_EXCH_ID];
        if (exchange !== 'NSE' && exchange !== 'BSE') return null;
        const segment = cols[h.SEM_SEGMENT];
        const instrument = cols[h.SEM_INSTRUMENT_NAME];
        const securityId = cols[h.SEM_SMST_SECURITY_ID];
        const symbol = (cols[h.SEM_TRADING_SYMBOL] || '').trim().toUpperCase();
        if (!securityId || !symbol) return null;
        const isEquity = segment === 'E' && instrument === 'EQUITY';
        const isIndex = segment === 'I' && instrument === 'INDEX';
        if (!isEquity && !isIndex) return null;
        return {
            k: isIndex ? 'index' : 'equity',
            e: exchange,
            s: symbol,
            id: String(securityId).trim(),
            n: (cols[h.SEM_CUSTOM_SYMBOL] || symbol).trim(),
            // NSE has several series per symbol; EQ is the main board.
            q: (cols[h.SEM_SERIES] || '').trim(),
        };
    }

    absorb(rows) {
        this.searchIndex = null;
        for (const r of rows) {
            const mapKey = InstrumentMaster.mapKey(r.k, r.e, r.s);
            const existing = this.map.get(mapKey);
            // First row wins, except that an EQ-series row replaces a non-EQ one
            // and a master row always replaces a curated seed.
            if (existing && existing.fromMaster && !(r.q === 'EQ' && existing.series !== 'EQ')) continue;
            this.map.set(mapKey, {
                securityId: r.id,
                segment: r.k === 'index' ? 'IDX_I' : `${r.e}_EQ`,
                instrument: r.k === 'index' ? 'INDEX' : 'EQUITY',
                name: r.n,
                exchange: r.e,
                series: r.q,
                fromMaster: true,
            });
        }
    }

    persist(rows) {
        // Best effort; never blocks or fails a request. Owner-only file, written
        // under an unpredictable temp name then renamed into place.
        (async () => {
            try {
                const dir = await this.prepareCacheDir();
                if (!dir) return;
                const tmp = path.join(dir, `instrument-master.${crypto.randomBytes(8).toString('hex')}.tmp`);
                await fs.promises.writeFile(tmp, JSON.stringify(rows), { mode: 0o600, flag: 'wx' });
                await fs.promises.rename(tmp, this.cacheFile);
            } catch { /* read-only FS etc. */ }
        })();
    }

    /**
     * Every NSE cash equity in the EQ or BE series (plus the curated large caps
     * when the master could not be loaded), followed by the dashboard indices.
     * BE (trade-for-trade) is included: it adds ~200 symbols and still fits the
     * same three 1000-instrument requests; rankings later exclude it.
     * @returns {Array<{symbol:string, entry:object}>}
     */
    universe() {
        const out = [];
        for (const [mapKey, entry] of this.map) {
            if (!mapKey.startsWith('equity:NSE:')) continue;
            if (entry.fromMaster && !UNIVERSE_SERIES.has(entry.series)) continue;
            const symbol = `${mapKey.slice('equity:NSE:'.length)}.NS`;
            if (!parseSymbol(symbol)) continue; // must round-trip through parseSymbol
            out.push({ symbol, entry });
        }
        for (const alias of UNIVERSE_INDEX_SYMBOLS) {
            const parsed = parseSymbol(alias);
            const entry = parsed && this.map.get(InstrumentMaster.mapKey('index', parsed.exchange, parsed.key));
            if (entry) out.push({ symbol: alias, entry });
        }
        return out;
    }

    /** Lazily built, flat list used by search(); rebuilt after each reload. */
    buildSearchIndex() {
        const list = [];
        for (const [mapKey, entry] of this.map) {
            const [kind, exchange, key] = mapKey.split(':');
            if (kind === 'equity' && exchange === 'NSE' && entry.fromMaster && !UNIVERSE_SERIES.has(entry.series)) continue;
            const symbol = kind === 'index'
                ? Object.keys(INDEX_ALIASES).find((a) => INDEX_ALIASES[a].exchange === exchange && INDEX_ALIASES[a].key === key)
                : `${key}.${exchange === 'NSE' ? 'NS' : 'BO'}`;
            if (!symbol || !parseSymbol(symbol)) continue;
            list.push({
                symbol,
                base: key.toLowerCase(),
                name: entry.name,
                nameLower: String(entry.name || '').toLowerCase(),
                exchange,
                type: kind === 'index' ? 'INDEX' : 'EQUITY',
                nse: exchange === 'NSE' ? 0 : 1,
            });
        }
        this.searchIndex = list;
        return list;
    }

    /**
     * Search the whole instrument master by symbol and company name.
     * Ranking: exact symbol, symbol prefix, name prefix, then substring of
     * either; NSE before BSE within a rank. Query is capped at 50 characters.
     */
    async search(query, limit = 20) {
        const q = String(query || '').trim().toLowerCase().slice(0, 50);
        if (!q) return [];
        await this.ensureLoaded();
        const index = this.searchIndex || this.buildSearchIndex();
        const scored = [];
        for (const item of index) {
            let rank;
            if (item.base === q) rank = 0;
            else if (item.base.startsWith(q)) rank = 1;
            else if (item.nameLower.startsWith(q)) rank = 2;
            else if (item.base.includes(q) || item.nameLower.includes(q)) rank = 3;
            else continue;
            scored.push([rank * 2 + item.nse, item]);
        }
        scored.sort((a, b) => a[0] - b[0] || a[1].base.length - b[1].base.length || (a[1].symbol < b[1].symbol ? -1 : 1));
        return scored.slice(0, limit).map(([, i]) => ({
            symbol: i.symbol,
            name: i.name,
            exchange: i.exchange,
            type: i.type,
        }));
    }

    /** @returns {Promise<{securityId:string, segment:string, instrument:string, name:string, exchange:string}|null>} */
    async resolve(symbol) {
        const parsed = parseSymbol(symbol);
        if (!parsed) return null;
        await this.ensureLoaded();
        return this.map.get(InstrumentMaster.mapKey(parsed.kind, parsed.exchange, parsed.key)) || null;
    }
}

// --- Provider ---------------------------------------------------------------

const AUTH_CODES = new Set(['DH-901', 'DH-902', '806', '807', '808', '809', '810']);
const RATE_CODES = new Set(['DH-904', '805', '804']);

/** Pull a Dhan error code out of either error body shape. */
function errorCodeOf(body) {
    if (!body || typeof body !== 'object') return '';
    if (body.errorCode) return String(body.errorCode);
    if (body.data && typeof body.data === 'object') {
        const k = Object.keys(body.data).find((x) => /^\d{3}$/.test(x));
        if (k) return k;
    }
    return '';
}

const toNum = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

class DhanProvider {
    static get BASE_URL() {
        return (process.env.DHAN_BASE_URL || 'https://api.dhan.co/v2').replace(/\/$/, '');
    }

    /**
     * @param {object} opts
     * @param {() => ({clientId:string, accessToken:string, version?:number}|null)} [opts.credentials]
     *        Live credential source (null = provider inactive). Takes precedence over clientId/accessToken.
     * @param {string} [opts.clientId]     static credentials (tests)
     * @param {string} [opts.accessToken]  static credentials (tests)
     * @param {() => void} [opts.onAuthFailure]  called when Dhan rejects the token
     * @param {number} [opts.quoteIntervalMs=1100]  spacing between Quote API calls (limit 1/s)
     * @param {number} [opts.dataIntervalMs=250]    spacing between Data API calls (limit 5/s)
     * @param {number} [opts.quoteTtlMs=5000]       how long a quote is reused
     * @param {InstrumentMaster} [opts.master]
     */
    constructor({ credentials, clientId, accessToken, onAuthFailure, quoteIntervalMs = 1100, dataIntervalMs = 250, quoteTtlMs = 5000, master } = {}) {
        this.credentials = credentials || (clientId && accessToken ? () => ({ clientId, accessToken }) : () => null);
        this.onAuthFailure = onAuthFailure || null;
        this.seenCredentialVersion = undefined;
        this.quoteGate = new RateGate(quoteIntervalMs);
        this.dataGate = new RateGate(dataIntervalMs);
        this.quoteTtlMs = quoteTtlMs;
        this.master = master || new InstrumentMaster();
        this.quoteCache = new Map(); // `${segment}:${id}` -> { at, quote }
        this.disabledUntil = 0;
        this.failureLogged = false;
    }

    /** Current credentials, or null. A new credential version lifts a stand-down. */
    currentCredentials() {
        let creds = null;
        try { creds = this.credentials(); } catch { creds = null; }
        if (!creds || !creds.clientId || !creds.accessToken) return null;
        if (creds.version !== this.seenCredentialVersion) {
            // A different token (renewed or pasted): the old rejection no longer applies.
            if (this.seenCredentialVersion !== undefined) {
                this.disabledUntil = 0;
                this.failureLogged = false;
            }
            this.seenCredentialVersion = creds.version;
        }
        return creds;
    }

    /** True when credentials exist and the provider is not standing down. */
    isActive() {
        return this.currentCredentials() !== null && Date.now() >= this.disabledUntil;
    }

    /** True when this provider should be tried for the symbol right now. */
    canServe(symbol) {
        return this.isActive() && isIndianSymbol(symbol);
    }

    async post(path, body, gate) {
        return gate.schedule(async () => {
            const creds = this.currentCredentials();
            if (!creds) throw new Error('Dhan auth failed');
            let res;
            try {
                res = await fetch(`${DhanProvider.BASE_URL}${path}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'access-token': creds.accessToken,
                        'client-id': creds.clientId,
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(10000),
                });
            } catch (e) {
                throw new Error(`Dhan network error (${e && e.name})`);
            }

            let json = null;
            try { json = await res.json(); } catch { /* non-JSON body */ }
            const code = errorCodeOf(json);

            if (res.status === 401 || res.status === 403 || AUTH_CODES.has(code)) {
                this.standDown(AUTH_COOLDOWN_MS, 'rejected the credentials (token expired or Data APIs not subscribed)');
                if (this.onAuthFailure) { try { this.onAuthFailure(); } catch { /* never break a request */ } }
                throw new Error('Dhan auth failed');
            }
            if (res.status === 429 || RATE_CODES.has(code)) {
                this.disabledUntil = Math.max(this.disabledUntil, Date.now() + RATE_COOLDOWN_MS);
                throw new Error('429 Too Many Requests');
            }
            if (!res.ok || (json && json.status === 'failed')) {
                throw new Error(`Dhan request failed (${res.status}${code ? ` ${code}` : ''})`);
            }
            this.failureLogged = false;
            return json;
        });
    }

    /** Stand down for a while, logging the first failure only. */
    standDown(ms, reason) {
        this.disabledUntil = Date.now() + ms;
        if (!this.failureLogged) {
            this.failureLogged = true;
            console.error(`[Dhan] ${reason}; falling back to other providers for ${Math.round(ms / 60000)} min`);
        }
    }

    /** Normalise a Dhan quote to the Yahoo-shaped object FinDataService consumes. */
    static toYahooShape(symbol, entry, q) {
        const price = toNum(q.last_price) ?? 0;
        const ohlc = q.ohlc || {};
        const netChange = toNum(q.net_change);
        // net_change is last - previous close; ohlc.close is the previous close
        // while the market is open, so either one yields the previous close.
        const prevClose = netChange !== null ? price - netChange : (toNum(ohlc.close) ?? 0);
        const change = prevClose ? price - prevClose : 0;
        return {
            symbol,
            longName: entry.name || symbol,
            shortName: entry.name || symbol,
            regularMarketPrice: price,
            regularMarketChange: Number(change.toFixed(4)),
            regularMarketChangePercent: prevClose ? Number(((change / prevClose) * 100).toFixed(4)) : 0,
            regularMarketDayHigh: toNum(ohlc.high) ?? 0,
            regularMarketDayLow: toNum(ohlc.low) ?? 0,
            regularMarketOpen: toNum(ohlc.open) ?? 0,
            regularMarketPreviousClose: prevClose,
            regularMarketVolume: toNum(q.volume) ?? 0,
            currency: 'INR',
            marketCap: 0, // Dhan's quote carries no market cap
            exchange: entry.exchange,
        };
    }

    /**
     * Quotes for many symbols in as few requests as possible. Symbols that are
     * not Indian, not in the instrument master, or that Dhan returns nothing for
     * are simply absent from the result (the caller falls back for those).
     * Throws on auth/rate/network failure so the caller can switch provider.
     */
    async getBulkQuotes(symbols) {
        const list = [...new Set((Array.isArray(symbols) ? symbols : [symbols]).map((s) => String(s).toUpperCase()))];
        const resolved = [];
        for (const symbol of list) {
            const entry = await this.master.resolve(symbol);
            if (entry) resolved.push({ symbol, entry });
        }
        if (resolved.length === 0) return [];

        const out = new Map();
        const cacheKey = ({ entry }) => `${entry.segment}:${entry.securityId}`;
        const fresh = (item) => {
            const hit = this.quoteCache.get(cacheKey(item));
            return hit && Date.now() - hit.at < this.quoteTtlMs ? hit : null;
        };

        // Serialised through the quote gate; the cache is re-checked inside the
        // gate so a call that queued behind an identical one reuses its result.
        for (let i = 0; i < resolved.length; i += MAX_INSTRUMENTS_PER_REQUEST) {
            const chunk = resolved.slice(i, i + MAX_INSTRUMENTS_PER_REQUEST);
            // Everything cached: answer without spending a rate-limit slot.
            if (chunk.every((item) => fresh(item))) {
                chunk.forEach((item) => out.set(item.symbol, { ...fresh(item).quote, symbol: item.symbol }));
                continue;
            }
            await this.quoteGate.schedule(async () => {
                const todo = [];
                for (const item of chunk) {
                    const hit = fresh(item);
                    if (hit) out.set(item.symbol, { ...hit.quote, symbol: item.symbol });
                    else todo.push(item);
                }
                if (todo.length === 0) return;

                const body = {};
                for (const { entry } of todo) {
                    (body[entry.segment] = body[entry.segment] || []).push(Number(entry.securityId));
                }
                // Already inside the gate: call the HTTP layer through a pass-through
                // so the spacing is applied once, not twice.
                const json = await this.postInsideGate('/marketfeed/quote', body);
                const data = (json && json.data) || {};
                for (const item of todo) {
                    const q = data[item.entry.segment] && data[item.entry.segment][item.entry.securityId];
                    if (!q || toNum(q.last_price) === null || q.last_price <= 0) continue;
                    const quote = DhanProvider.toYahooShape(item.symbol, item.entry, q);
                    this.quoteCache.set(cacheKey(item), { at: Date.now(), quote });
                    out.set(item.symbol, quote);
                }
            });
        }
        return resolved.map(({ symbol }) => out.get(symbol)).filter(Boolean);
    }

    postInsideGate(path, body) {
        return this.post(path, body, { schedule: (task) => task() });
    }

    async getQuote(symbol) {
        const [quote] = await this.getBulkQuotes([symbol]);
        if (!quote) throw new Error(`No Dhan data for ${symbol}`);
        return quote;
    }

    /** Search the instrument master (Dhan itself has no search endpoint). */
    async search(query) {
        return this.master.search(query);
    }

    /**
     * Quotes for a (large) list of already-resolved instruments, for the market
     * snapshot: no per-quote cache, 1000 per request, every request serialised
     * through the quote gate (>= quoteIntervalMs apart). A failed chunk does not
     * lose the others; it is reported so the caller can keep its previous values.
     * Auth and rate-limit failures stop the run (no point hammering Dhan).
     * @param {Array<{symbol:string, entry:object}>} items
     * @returns {Promise<{quotes: object[], failed: Array<{symbol:string, entry:object}>, aborted: Error|null}>}
     */
    async getQuotesForEntries(items) {
        const quotes = [];
        const failed = [];
        let aborted = null;
        for (let i = 0; i < items.length; i += MAX_INSTRUMENTS_PER_REQUEST) {
            const chunk = items.slice(i, i + MAX_INSTRUMENTS_PER_REQUEST);
            if (aborted) { failed.push(...chunk); continue; }
            try {
                await this.quoteGate.schedule(async () => {
                    const body = {};
                    for (const { entry } of chunk) {
                        (body[entry.segment] = body[entry.segment] || []).push(Number(entry.securityId));
                    }
                    const json = await this.postInsideGate('/marketfeed/quote', body);
                    const data = (json && json.data) || {};
                    for (const item of chunk) {
                        const q = data[item.entry.segment] && data[item.entry.segment][item.entry.securityId];
                        if (!q || toNum(q.last_price) === null || q.last_price <= 0) continue;
                        quotes.push(DhanProvider.toYahooShape(item.symbol, item.entry, q));
                    }
                });
            } catch (e) {
                failed.push(...chunk);
                if (e.message === 'Dhan auth failed' || /429/.test(e.message)) aborted = e;
            }
        }
        return { quotes, failed, aborted };
    }

    /**
     * OHLC series in the {time(ms), open, high, low, close, volume} shape the
     * Market Overview chart already consumes from Finnhub.
     * resolution: '1','5','15','25','60' intraday; 'D','W','M' (and anything else)
     * -> daily candles. '30' has no Dhan equivalent and maps to 25.
     */
    async getCandles(symbol, resolution = '5', fromSec, toSec) {
        const entry = await this.master.resolve(symbol);
        if (!entry) throw new Error(`No Dhan instrument for ${symbol}`);

        const nowSec = Math.floor(Date.now() / 1000);
        const to = toSec || nowSec;
        const res = String(resolution).toUpperCase();
        const intraday = { 1: '1', 5: '5', 15: '15', 25: '25', 30: '25', 60: '60' }[res];
        // Without an explicit `from`, look back far enough to be useful: a few
        // days for minute candles (so weekends/holidays still return the last
        // session), a week for 30/60-minute, a year for daily, five for W/M.
        const DAY = 24 * 60 * 60;
        const lookbackDays = !intraday ? (res === 'D' ? 365 : 5 * 365) : (Number(res) <= 15 ? 5 : 7);
        const from = fromSec || to - lookbackDays * DAY;
        const lastSessionOnly = !fromSec && intraday && Number(res) <= 15;

        const base = { securityId: entry.securityId, exchangeSegment: entry.segment, instrument: entry.instrument };
        let body;
        let path;
        if (intraday) {
            path = '/charts/intraday';
            body = {
                ...base,
                interval: intraday,
                oi: false,
                fromDate: istDateTime(Math.max(from, to - MAX_INTRADAY_SPAN_S)),
                toDate: istDateTime(to),
            };
        } else {
            path = '/charts/historical';
            body = { ...base, expiryCode: 0, oi: false, fromDate: istDate(from), toDate: istDate(to + 24 * 60 * 60) };
        }

        const json = await this.post(path, body, this.dataGate);
        if (!json || !Array.isArray(json.timestamp)) return [];
        let series = json.timestamp.map((ts, i) => ({
            time: ts * 1000,
            open: json.open?.[i] ?? null,
            high: json.high?.[i] ?? null,
            low: json.low?.[i] ?? null,
            close: json.close?.[i] ?? null,
            volume: json.volume?.[i] ?? 0,
        }));
        if (lastSessionOnly && series.length > 0) {
            const day = (ms) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
            const lastDay = day(series[series.length - 1].time);
            series = series.filter((c) => day(c.time) === lastDay);
        }
        return series;
    }
}

/** Epoch seconds -> "YYYY-MM-DD HH:mm:ss" in IST (Dhan's exchange time). */
function istDateTime(sec) {
    return new Date(sec * 1000 + IST_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
}

function istDate(sec) {
    return new Date(sec * 1000 + IST_OFFSET_MS).toISOString().slice(0, 10);
}

module.exports = { DhanProvider, InstrumentMaster, RateGate, parseSymbol, isIndianSymbol, UNIVERSE_INDEX_SYMBOLS };
