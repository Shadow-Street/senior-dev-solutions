/**
 * Marketaux (https://www.marketaux.com/documentation) news client.
 *
 * Endpoint: GET https://api.marketaux.com/v1/news/all
 *
 * The API token can only travel as the `api_token` query parameter, so the
 * request URL is itself a secret. This module therefore never logs a URL,
 * never echoes an upstream body, and never lets an upstream error message reach
 * a caller: failures are reduced to a small set of internal error codes.
 *
 * Indian-market defaults on every call: countries=in, language=en,
 * filter_entities=true (only the entities relevant to the query come back).
 *
 * The free tier is 100 requests/day, so every distinct query is cached in
 * memory for MARKETAUX_CACHE_TTL_SECONDS (default 600). Identical concurrent
 * queries share one upstream request, and an expired entry is still served for
 * up to an hour if the provider errors or the quota is exhausted.
 *
 * Env: MARKETAUX_API_KEY (required to enable), MARKETAUX_MAX_LIMIT (articles per
 * page the plan allows, default 50 - the free plan allows 3),
 * MARKETAUX_CACHE_TTL_SECONDS, MARKETAUX_BASE_URL (tests / proxies only).
 */

const DEFAULT_BASE_URL = 'https://api.marketaux.com/v1';
const HARD_MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;
const MAX_PAGE = 100; // 100 pages * 50 articles stays well under Marketaux's 20,000 result cap
const MAX_SEARCH_LENGTH = 100;
const MAX_SYMBOLS = 10;
const STALE_GRACE_MS = 60 * 60 * 1000;
// When the budget/quota is spent nothing can refresh the cache until tomorrow,
// so stale entries stay servable for a full day.
const STALE_GRACE_BUDGET_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_BUDGET = 90; // free tier is 100/day; keep headroom
const DEFAULT_BURST_PER_MINUTE = 10;
const MAX_CACHE_ENTRIES = 500;
const SENTIMENT_THRESHOLD = 0.1; // |score| above this is positive/negative, else neutral
const RANGES = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
const SENTIMENTS = ['positive', 'negative', 'neutral'];

class NewsQueryError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NewsQueryError';
        this.status = 400;
    }
}

/** An anonymous caller asked for something that would cost upstream quota. */
class NewsAuthRequiredError extends Error {
    constructor() {
        super('Sign in to search or browse further.');
        this.name = 'NewsAuthRequiredError';
        this.status = 401;
        this.code = 'login_required';
    }
}

class NewsUpstreamError extends Error {
    constructor(code, status = 502) {
        super(code);
        this.name = 'NewsUpstreamError';
        this.code = code;
        this.status = status;
    }
}

// Process-wide upstream spend. Per-process: a restart or a second instance
// starts its own count, so keep the budget below the real quota with headroom.
const budget = { day: '', used: 0, recent: [], blockedDay: '', exhaustedLogged: false };

const cache = new Map(); // key -> { value, expiresAt }
const inflight = new Map(); // key -> Promise
let authFailureLogged = false;

function apiKey() {
    return (process.env.MARKETAUX_API_KEY || '').trim();
}

function isConfigured() {
    return apiKey().length > 0;
}

function baseUrl() {
    return (process.env.MARKETAUX_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function ttlMs() {
    const raw = (process.env.MARKETAUX_CACHE_TTL_SECONDS || '').trim();
    const s = raw === '' ? NaN : Number(raw);
    return (Number.isFinite(s) && s >= 0 ? s : 600) * 1000;
}

function maxLimit() {
    const n = parseInt(process.env.MARKETAUX_MAX_LIMIT, 10);
    return Number.isInteger(n) && n >= 1 ? Math.min(n, HARD_MAX_LIMIT) : HARD_MAX_LIMIT;
}

function intEnv(name, fallback) {
    const raw = (process.env[name] || '').trim();
    if (raw === '' || !/^\d{1,6}$/.test(raw)) return fallback;
    return parseInt(raw, 10);
}

/**
 * Reserve one upstream request or throw NewsUpstreamError('budget'|'burst', 503).
 * Cache hits and joined in-flight requests never reach this.
 */
function takeBudget(now = Date.now()) {
    const day = new Date(now).toISOString().slice(0, 10); // Marketaux quota resets daily (UTC)
    if (budget.day !== day) {
        budget.day = day;
        budget.used = 0;
        budget.exhaustedLogged = false;
    }
    budget.recent = budget.recent.filter(t => now - t < 60 * 1000);

    if (budget.blockedDay === day || budget.used >= intEnv('MARKETAUX_DAILY_BUDGET', DEFAULT_DAILY_BUDGET)) {
        if (!budget.exhaustedLogged) {
            budget.exhaustedLogged = true;
            console.error('[Marketaux] daily upstream budget spent; serving cache only until tomorrow');
        }
        throw new NewsUpstreamError('budget', 503);
    }
    if (budget.recent.length >= intEnv('MARKETAUX_BURST_PER_MINUTE', DEFAULT_BURST_PER_MINUTE)) {
        throw new NewsUpstreamError('burst', 503);
    }
    budget.used += 1;
    budget.recent.push(now);
}

function firstString(v) {
    return Array.isArray(v) ? v[0] : v;
}

/** Strip control characters and collapse whitespace. */
function cleanText(value, max) {
    return String(value)
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function parseIntParam(raw, name, min, max, fallback) {
    const v = firstString(raw);
    if (v === undefined || v === null || v === '') return fallback;
    if (!/^\d{1,6}$/.test(String(v))) throw new NewsQueryError(`${name} must be a whole number`);
    const n = parseInt(v, 10);
    if (n < min) throw new NewsQueryError(`${name} must be at least ${min}`);
    return Math.min(n, max);
}

/** Marketaux accepts Y-m-d\TH, which keeps the cache key stable for an hour. */
function publishedAfterFor(range, now = new Date()) {
    const hours = RANGES[range];
    if (!hours) return undefined;
    const d = new Date(now.getTime() - hours * 3600 * 1000);
    return `${d.toISOString().slice(0, 13)}`; // YYYY-MM-DDTHH
}

/**
 * Validate and bound the client's query. Throws NewsQueryError (400) for
 * anything malformed; out-of-range numbers are clamped rather than rejected.
 *
 * @returns {{ params: Record<string,string>, view: object }}
 */
function buildQuery(raw = {}, now = new Date()) {
    const params = { countries: 'in', language: 'en', filter_entities: 'true' };

    const limit = parseIntParam(raw.limit, 'limit', 1, maxLimit(), Math.min(DEFAULT_LIMIT, maxLimit()));
    const page = parseIntParam(raw.page, 'page', 1, MAX_PAGE, 1);
    params.limit = String(limit);
    params.page = String(page);

    const q = firstString(raw.q ?? raw.search);
    if (q !== undefined && q !== null && String(q).trim() !== '') {
        const text = cleanText(q, MAX_SEARCH_LENGTH + 1);
        if (text.length > MAX_SEARCH_LENGTH) {
            throw new NewsQueryError(`search must be at most ${MAX_SEARCH_LENGTH} characters`);
        }
        if (text) params.search = text;
    }

    const symbolsRaw = firstString(raw.symbols ?? raw.symbol);
    if (symbolsRaw !== undefined && String(symbolsRaw).trim() !== '') {
        const list = String(symbolsRaw).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (list.length > MAX_SYMBOLS) throw new NewsQueryError(`at most ${MAX_SYMBOLS} symbols`);
        if (!list.every(s => /^[A-Z0-9][A-Z0-9.&_^-]{0,19}$/.test(s))) {
            throw new NewsQueryError('invalid symbol');
        }
        if (list.length) params.symbols = [...new Set(list)].join(',');
    }

    const industries = firstString(raw.industries ?? raw.industry);
    if (industries !== undefined && String(industries).trim() !== '') {
        const text = cleanText(industries, 101);
        if (text.length > 100 || !/^[A-Za-z][A-Za-z &,-]*$/.test(text)) {
            throw new NewsQueryError('invalid industries');
        }
        params.industries = text.split(',').map(s => s.trim()).filter(Boolean).join(',');
    }

    const sentiment = firstString(raw.sentiment);
    if (sentiment !== undefined && sentiment !== '') {
        if (!SENTIMENTS.includes(sentiment)) throw new NewsQueryError('invalid sentiment');
        if (sentiment === 'positive') params.sentiment_gte = String(SENTIMENT_THRESHOLD);
        else if (sentiment === 'negative') params.sentiment_lte = String(-SENTIMENT_THRESHOLD);
        else {
            params.sentiment_gte = String(-SENTIMENT_THRESHOLD);
            params.sentiment_lte = String(SENTIMENT_THRESHOLD);
        }
    }

    const range = firstString(raw.range);
    if (range !== undefined && range !== '' && range !== 'all') {
        if (!RANGES[range]) throw new NewsQueryError('invalid range');
        params.published_after = publishedAfterFor(range, now);
    }

    return { params, view: { page, limit } };
}

function cacheKeyFor(params) {
    return Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
}

function safeHttpUrl(value) {
    if (typeof value !== 'string') return null;
    try {
        const u = new URL(value.trim());
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
    } catch {
        return null;
    }
}

function sentimentLabel(score) {
    if (typeof score !== 'number' || !Number.isFinite(score)) return null;
    if (score > SENTIMENT_THRESHOLD) return 'positive';
    if (score < -SENTIMENT_THRESHOLD) return 'negative';
    return 'neutral';
}

function num(v) {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * One upstream article -> the shape the UI consumes. Only whitelisted, plain
 * fields survive: entity "highlights" (which carry <em> markup) and everything
 * else upstream adds are dropped. Returns null for unusable rows.
 */
function normaliseArticle(a) {
    if (!a || typeof a !== 'object') return null;
    const title = typeof a.title === 'string' ? cleanText(a.title, 300) : '';
    const url = safeHttpUrl(a.url);
    if (!title || !url) return null;

    const entities = (Array.isArray(a.entities) ? a.entities : [])
        .filter(e => e && typeof e.symbol === 'string')
        .slice(0, 10)
        .map(e => ({
            symbol: cleanText(e.symbol, 32),
            name: typeof e.name === 'string' ? cleanText(e.name, 120) : null,
            exchange: typeof e.exchange === 'string' ? cleanText(e.exchange, 32) : null,
            industry: typeof e.industry === 'string' ? cleanText(e.industry, 80) : null,
            sentiment_score: num(e.sentiment_score),
            match_score: num(e.match_score),
        }));

    const scores = entities.map(e => e.sentiment_score).filter(s => s !== null);
    const sentimentScore = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null;
    const published = typeof a.published_at === 'string' && !Number.isNaN(Date.parse(a.published_at))
        ? new Date(a.published_at).toISOString()
        : null;

    return {
        id: typeof a.uuid === 'string' ? cleanText(a.uuid, 64) : url,
        title,
        description: typeof a.description === 'string' ? cleanText(a.description, 500) : '',
        snippet: typeof a.snippet === 'string' ? cleanText(a.snippet, 500) : '',
        url,
        image_url: safeHttpUrl(a.image_url),
        source: typeof a.source === 'string' ? cleanText(a.source, 100) : '',
        published_at: published,
        language: typeof a.language === 'string' ? cleanText(a.language, 8) : 'en',
        sentiment: sentimentLabel(sentimentScore),
        sentiment_score: sentimentScore,
        entities,
    };
}

/** Raw upstream call. Throws NewsUpstreamError with a coarse code only. */
async function requestUpstream(params) {
    const url = new URL(`${baseUrl()}/news/all`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('api_token', apiKey());

    let res;
    try {
        res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
        });
    } catch (e) {
        // Deliberately not logging the error object: it may carry the URL.
        throw new NewsUpstreamError(e && e.name === 'TimeoutError' ? 'timeout' : 'network');
    }

    if (res.status === 401 || res.status === 403) throw new NewsUpstreamError('auth', 502);
    if (res.status === 402 || res.status === 429) {
        // The provider says we are out; stop calling until the next UTC day.
        if (res.status === 402) budget.blockedDay = new Date().toISOString().slice(0, 10);
        throw new NewsUpstreamError('quota', 503);
    }
    if (res.status >= 400 && res.status < 500) throw new NewsUpstreamError('rejected', 502);
    if (!res.ok) throw new NewsUpstreamError('upstream', 502);

    let body;
    try {
        body = await res.json();
    } catch {
        throw new NewsUpstreamError('bad_response');
    }
    if (!body || !Array.isArray(body.data)) throw new NewsUpstreamError('bad_response');
    return body;
}

function remember(key, value) {
    if (cache.size >= MAX_CACHE_ENTRIES) {
        // Drop the oldest-inserted entry; Map iterates in insertion order.
        cache.delete(cache.keys().next().value);
    }
    cache.delete(key);
    cache.set(key, { value, expiresAt: Date.now() + ttlMs() });
}

/**
 * Fetch (or serve from cache) a page of Indian market news.
 *
 * Resolves to:
 *   { configured: false, articles: [], meta }           when no key is set
 *   { configured: true,  articles, meta }               otherwise
 * Rejects with NewsQueryError (400) or NewsUpstreamError (502/503).
 */
async function fetchNews(rawQuery = {}, { authenticated = false } = {}) {
    // Anonymous callers share ONE canonical page size so they cannot mint cache
    // keys by varying `limit`.
    const input = authenticated ? rawQuery : { ...rawQuery, limit: undefined };
    const { params, view } = buildQuery(input);

    if (!isConfigured()) {
        return {
            configured: false,
            articles: [],
            meta: { provider: 'marketaux', page: view.page, limit: view.limit, found: 0, returned: 0, has_more: false, cached: false, stale: false },
        };
    }

    const key = cacheKeyFor(params);
    const hit = cache.get(key);
    const now = Date.now();
    if (hit && hit.expiresAt > now) {
        return { ...hit.value, meta: { ...hit.value.meta, cached: true, stale: false } };
    }

    // Anonymous callers may only read the cache for anything that is not the
    // default first page: free-text search, page > 1, symbol/industry filters.
    // Each new combination would otherwise be a free upstream call.
    if (!authenticated && (params.search || params.page !== '1' || params.symbols || params.industries)) {
        if (hit && now - hit.expiresAt < STALE_GRACE_BUDGET_MS) {
            return { ...hit.value, meta: { ...hit.value.meta, cached: true, stale: true } };
        }
        throw new NewsAuthRequiredError();
    }

    let pending = inflight.get(key);
    if (!pending) {
        pending = (async () => {
            takeBudget();
            const body = await requestUpstream(params);
            const articles = body.data.map(normaliseArticle).filter(Boolean);
            const meta = body.meta || {};
            const limit = num(meta.limit) || view.limit;
            const found = num(meta.found) ?? articles.length;
            const returned = num(meta.returned) ?? articles.length;
            const value = {
                configured: true,
                articles,
                meta: {
                    provider: 'marketaux',
                    page: view.page,
                    limit,
                    found,
                    returned,
                    has_more: returned >= limit && view.page * limit < Math.min(found, 20000),
                    cached: false,
                    stale: false,
                },
            };
            remember(key, value);
            authFailureLogged = false;
            return value;
        })().finally(() => inflight.delete(key));
        inflight.set(key, pending);
    }

    try {
        return await pending;
    } catch (err) {
        if (err instanceof NewsUpstreamError) {
            if (err.code === 'auth') {
                if (!authFailureLogged) {
                    authFailureLogged = true;
                    console.error('[Marketaux] request rejected as unauthorised - check MARKETAUX_API_KEY');
                }
            } else if (err.code !== 'budget') { // budget exhaustion is logged once in takeBudget
                console.error(`[Marketaux] upstream error: ${err.code}`);
            }
            const spent = err.code === 'budget' || err.code === 'quota';
            if (hit && now - hit.expiresAt < (spent ? STALE_GRACE_BUDGET_MS : STALE_GRACE_MS)) {
                return { ...hit.value, meta: { ...hit.value.meta, cached: true, stale: true } };
            }
        }
        throw err;
    }
}

/** Test helper. */
function _resetForTests() {
    cache.clear();
    inflight.clear();
    authFailureLogged = false;
    budget.day = '';
    budget.used = 0;
    budget.recent = [];
    budget.blockedDay = '';
    budget.exhaustedLogged = false;
}

module.exports = {
    isConfigured,
    fetchNews,
    buildQuery,
    normaliseArticle,
    NewsQueryError,
    NewsUpstreamError,
    NewsAuthRequiredError,
    _resetForTests,
};
