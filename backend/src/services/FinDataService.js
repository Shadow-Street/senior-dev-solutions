const { default: YahooFinance } = require('yahoo-finance2');
const { createClient } = require('redis');
const db = require('../models');
const { Op } = require('sequelize');
const { DhanProvider } = require('./DhanProvider');
const { dhanCredentials } = require('./DhanCredentialService');
const { MarketSnapshotService } = require('./MarketSnapshotService');

// --- Provider Interface & Implementations ---

class StockDataProvider {
    async getQuote(symbol) { throw new Error('Not implemented'); }
    async search(query) { throw new Error('Not implemented'); }
    async getBulkQuotes(symbols) { throw new Error('Not implemented'); }
}

class YahooFinanceProvider extends StockDataProvider {
    constructor() {
        super();
        this.client = new YahooFinance({
            logger: {
                info: (...args) => console.log(...args),
                warn: (...args) => console.warn(...args),
                error: (...args) => console.error(...args),
                debug: (...args) => { }
            }
        });
        try {
            this.client._opts.suppressNotices = ['yahooSurvey'];
        } catch (e) { /* ignore */ }
    }

    async getQuote(symbol) {
        return await this.client.quote(symbol);
    }

    async search(query) {
        const results = await this.client.search(query);
        return (results.quotes || [])
            .filter(q => q.isYahooFinance === true && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
            .map(q => ({
                symbol: q.symbol,
                name: q.longname || q.shortname || q.symbol,
                exchange: q.exchange,
                type: q.quoteType
            }));
    }

    async getBulkQuotes(symbols) {
        return await this.client.quote(symbols);
    }
}

/**
 * Finnhub (https://finnhub.io) — REST base https://api.finnhub.io/api/v1
 *
 * Auth: the key travels as the `X-Finnhub-Token` header (never a query string,
 * so it cannot leak into access logs or a browser URL bar). It is read from
 * FINNHUB_API_KEY on the server; the browser never sees it.
 *
 * Endpoints used:
 *   GET /quote?symbol=            -> { c, d, dp, h, l, o, pc, t }
 *   GET /search?q=                -> { count, result: [{ symbol, description, type }] }
 *   GET /stock/profile2?symbol=   -> { name, ticker, exchange, currency, marketCapitalization }
 *   GET /stock/candle?...         -> { c[], h[], l[], o[], t[], v[], s }
 *   GET /news?category=           -> [{ headline, summary, source, url, image, datetime }]
 *   GET /company-news?symbol=&from=&to=
 *
 * Quotes are normalised to the Yahoo-shaped object the rest of this service
 * already consumes, so formatStockData() and every caller stay unchanged.
 */
class FinnhubProvider extends StockDataProvider {
    // Override for testing or an enterprise Finnhub endpoint.
    static get BASE_URL() {
        return (process.env.FINNHUB_BASE_URL || 'https://api.finnhub.io/api/v1').replace(/\/$/, '');
    }

    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.profileCache = new Map(); // symbol -> { name, exchange, currency, marketCap }
    }

    static isConfigured() {
        return Boolean((process.env.FINNHUB_API_KEY || '').trim());
    }

    async request(path, params = {}) {
        const url = new URL(`${FinnhubProvider.BASE_URL}${path}`);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
        });

        const res = await fetch(url, {
            headers: { 'X-Finnhub-Token': this.apiKey, Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (res.status === 429) throw new Error('429 Too Many Requests');
        if (res.status === 401 || res.status === 403) {
            throw new Error(`Finnhub auth failed (${res.status}) — check FINNHUB_API_KEY`);
        }
        if (!res.ok) throw new Error(`Finnhub ${path} failed: ${res.status}`);
        return res.json();
    }

    /** Company metadata, memoised — it changes far more slowly than price. */
    async getProfile(symbol) {
        if (this.profileCache.has(symbol)) return this.profileCache.get(symbol);
        let profile = {};
        try {
            profile = await this.request('/stock/profile2', { symbol });
        } catch {
            profile = {}; // profile is optional; a quote without a name is still useful
        }
        this.profileCache.set(symbol, profile);
        return profile;
    }

    /** Normalise a Finnhub quote into the Yahoo-shaped object used downstream. */
    static toYahooShape(symbol, q, profile = {}) {
        return {
            symbol,
            longName: profile.name || symbol,
            shortName: profile.name || symbol,
            regularMarketPrice: q.c ?? 0,
            regularMarketChange: q.d ?? 0,
            regularMarketChangePercent: q.dp ?? 0,
            regularMarketDayHigh: q.h ?? 0,
            regularMarketDayLow: q.l ?? 0,
            regularMarketOpen: q.o ?? 0,
            regularMarketPreviousClose: q.pc ?? 0,
            regularMarketVolume: 0, // /quote carries no volume; /stock/candle does
            currency: profile.currency || 'USD',
            // Finnhub reports market cap in millions.
            marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1e6 : 0,
            exchange: profile.exchange || undefined,
        };
    }

    async getQuote(symbol) {
        const [q, profile] = await Promise.all([
            this.request('/quote', { symbol }),
            this.getProfile(symbol),
        ]);
        // Finnhub answers 200 with c:0 for an unknown or unentitled symbol.
        if (!q || (q.c === 0 && q.pc === 0)) {
            throw new Error(`No Finnhub data for ${symbol}`);
        }
        return FinnhubProvider.toYahooShape(symbol, q, profile);
    }

    async search(query) {
        const data = await this.request('/search', { q: query });
        return (data.result || [])
            .filter(r => r.type === 'Common Stock' || r.type === 'ETP' || !r.type)
            .slice(0, 25)
            .map(r => ({
                symbol: r.symbol,
                name: r.description || r.symbol,
                exchange: r.displaySymbol !== r.symbol ? r.displaySymbol : undefined,
                type: r.type || 'EQUITY',
            }));
    }

    /**
     * Finnhub has no bulk-quote endpoint; quotes are fetched concurrently but
     * capped so a large watchlist cannot burn the 60 req/min free-tier budget
     * in one burst. Individual failures are dropped, not thrown.
     */
    async getBulkQuotes(symbols) {
        const list = Array.isArray(symbols) ? symbols : [symbols];
        const CONCURRENCY = 5;
        const out = [];

        for (let i = 0; i < list.length; i += CONCURRENCY) {
            const batch = list.slice(i, i + CONCURRENCY);
            const settled = await Promise.allSettled(batch.map(s => this.getQuote(s)));
            settled.forEach((r) => { if (r.status === 'fulfilled') out.push(r.value); });
        }
        return out;
    }

    /** OHLC series for the Market Overview chart. */
    async getCandles(symbol, resolution = '5', from, to) {
        const data = await this.request('/stock/candle', { symbol, resolution, from, to });
        if (!data || data.s !== 'ok' || !Array.isArray(data.t)) return [];
        return data.t.map((ts, i) => ({
            time: ts * 1000,
            open: data.o?.[i] ?? null,
            high: data.h?.[i] ?? null,
            low: data.l?.[i] ?? null,
            close: data.c?.[i] ?? null,
            volume: data.v?.[i] ?? 0,
        }));
    }

    async getMarketNews(category = 'general') {
        const data = await this.request('/news', { category });
        return Array.isArray(data) ? data : [];
    }

    async getCompanyNews(symbol, from, to) {
        const data = await this.request('/company-news', { symbol, from, to });
        return Array.isArray(data) ? data : [];
    }
}

/**
 * Random-number provider for offline development ONLY.
 *
 * Disabled by default. Its output is tagged `__mock` so the service refuses to
 * persist it — random prices were previously written into the `stocks` table
 * and then served from cache as if they were real quotes.
 *
 * Enable deliberately with ALLOW_MOCK_MARKET_DATA=true.
 */
class MockProvider extends StockDataProvider {
    static isEnabled() {
        return String(process.env.ALLOW_MOCK_MARKET_DATA || '').toLowerCase() === 'true';
    }

    async getQuote(symbol) {
        return {
            __mock: true,
            symbol: symbol,
            longName: `${symbol} (Mock)`,
            regularMarketPrice: Math.floor(Math.random() * 1000) + 100,
            regularMarketChange: Math.random() * 10 - 5,
            regularMarketChangePercent: Math.random() * 5 - 2.5,
            currency: 'USD',
            marketCap: 1000000000,
            regularMarketVolume: 100000,
            regularMarketDayHigh: 0,
            regularMarketDayLow: 0,
            regularMarketOpen: 0,
            regularMarketPreviousClose: 0
        };
    }

    async search(query) {
        // Return mostly seeded stocks from seed script + some randoms
        return [
            { symbol: 'AAPL', name: 'Apple Inc. (Mock)', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'TSLA', name: 'Tesla Inc. (Mock)', exchange: 'NASDAQ', type: 'EQUITY' },
            { symbol: 'TCS.NS', name: 'Tata Consultancy Services (Mock)', exchange: 'NSE', type: 'EQUITY' }
        ].filter(s => s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()));
    }

    async getBulkQuotes(symbols) {
        return symbols.map(s => ({
            __mock: true,
            symbol: s,
            regularMarketPrice: Math.floor(Math.random() * 1000) + 100,
            regularMarketChange: 0,
            regularMarketChangePercent: 0
        }));
    }
}


// --- Main Service ---

// Redis Client Configuration
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

(async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
})();

const CACHE_TTL = 900; // 15 minutes (min_update_interval)

class FinDataService {

    // Provider chain, highest priority first. Finnhub is used when
    // FINNHUB_API_KEY is set; Yahoo and Mock remain as automatic failover so a
    // missing key or an exhausted quota degrades instead of breaking.
    static providers = [
        ...(FinnhubProvider.isConfigured()
            ? [new FinnhubProvider(process.env.FINNHUB_API_KEY.trim())]
            : []),
        new YahooFinanceProvider(),
        ...(MockProvider.isEnabled() ? [new MockProvider()] : []),
    ];
    static activeProviderIndex = 0;
    static lastProviderSwitch = 0;

    // DhanHQ is tried FIRST, but only for Indian symbols (TCS.NS, TCS.BO,
    // ^NSEI ...) and only while it has usable credentials. The credentials live
    // in the encrypted store (DhanCredentialService), are renewed automatically,
    // and are absent when the key/token is missing or lapsed - in which case
    // canServe() is false everywhere and the chain below behaves exactly as it
    // did before Dhan existed. Dhan is deliberately outside the rotating
    // `providers` list: a Dhan failure just means "use the chain as usual".
    static dhan = new DhanProvider({
        credentials: () => dhanCredentials.getCredentials(),
        onAuthFailure: () => dhanCredentials.noteAuthFailure(),
    });

    // One market-wide snapshot of the NSE universe, refreshed in the background
    // while Dhan is active (see MarketSnapshotService). Requests only read it.
    static snapshot = new MarketSnapshotService({ getProvider: () => FinDataService.dhan });

    /** True when Dhan can serve right now. */
    static get dhanActive() {
        return Boolean(this.dhan && this.dhan.isActive());
    }

    /**
     * Quotes Dhan can supply for the Indian subset of `symbols`; never throws.
     * The shared snapshot is consulted first so most reads cost no Dhan call.
     */
    static async tryDhanQuotes(symbols) {
        const dhan = this.dhan;
        if (!dhan) return [];
        const eligible = symbols.filter(s => dhan.canServe(s));
        if (eligible.length === 0) return [];

        const out = [];
        const rest = [];
        for (const s of eligible) {
            const hit = this.snapshot ? this.snapshot.getQuote(s) : undefined;
            if (hit) out.push(hit); else rest.push(s);
        }
        if (rest.length === 0) return out;
        try {
            out.push(...await dhan.getBulkQuotes(rest));
        } catch (err) {
            // Auth failures are logged once by the provider itself.
            if (err.message !== 'Dhan auth failed') {
                console.warn(`[FinDataService] Dhan unavailable, using fallback providers: ${err.message}`);
            }
        }
        return out;
    }

    /**
     * Dashboard payload from the shared Dhan snapshot, or null when Dhan is not
     * active / no snapshot exists yet (the caller then uses the legacy path).
     */
    static getDhanMarketView() {
        if (!this.dhanActive || !this.snapshot || !this.snapshot.hasData()) return null;
        const views = this.snapshot.getViews();
        const info = this.snapshot.getInfo();
        return { views, info };
    }

    static get activeProvider() {
        return this.providers[this.activeProviderIndex];
    }

    static async switchProvider() {
        const now = Date.now();
        // Prevent rapid flapping
        if (now - this.lastProviderSwitch < 60000) return;

        this.activeProviderIndex = (this.activeProviderIndex + 1) % this.providers.length;
        this.lastProviderSwitch = now;
        console.warn(`[FinDataService] Switched to provider: ${this.activeProvider.constructor.name}`);
    }

    // Helper to format quote to internal structure
    static formatStockData(quote) {
        return {
            __mock: quote.__mock === true,
            symbol: quote.symbol,
            name: quote.longName || quote.shortName || quote.symbol,
            current_price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            change_percent: quote.regularMarketChangePercent || 0,
            currency: quote.currency || 'USD',
            market_cap: quote.marketCap || 0,
            volume: quote.regularMarketVolume || 0,
            exchange: quote.exchange,
            timestamp: new Date()
        };
    }

    /**
     * Get stock price (Store First Strategy)
     */
    static async getStockPrice(symbol) {
        try {
            // 1. Check DB first
            let localStock = await db.Stock.findOne({ where: { symbol } });

            // Check staleness (15 mins) OR invalid price (0)
            const isStale = !localStock || (parseFloat(localStock.current_price || 0) <= 0) || (new Date() - new Date(localStock.updatedAt) > 15 * 60 * 1000);

            if (localStock && !isStale) {
                // If fresh, return from DB immediately (NO API CALL)
                return {
                    symbol: localStock.symbol,
                    name: localStock.name,
                    current_price: parseFloat(localStock.current_price),
                    change: parseFloat(localStock.change || 0),
                    change_percent: parseFloat(localStock.change_percent || 0),
                    currency: localStock.currency || 'USD',
                    market_cap: parseFloat(localStock.market_cap || 0),
                    volume: parseInt(localStock.volume || 0),
                    timestamp: localStock.updatedAt
                };
            }

            // 2. Fetch from Active Provider (if missing or stale)
            let quote;
            const [dhanQuote] = await this.tryDhanQuotes([symbol]);
            if (dhanQuote) {
                quote = dhanQuote;
            } else {
                try {
                    quote = await this.activeProvider.getQuote(symbol);
                    if (!quote) throw new Error('Not found');
                } catch (err) {
                    if (err.message.includes('Too Many Requests') || err.message.includes('429')) {
                        console.error('[FinDataService] 429 Error - Switching Provider');
                        await this.switchProvider();
                        // Retry once with new provider
                        quote = await this.activeProvider.getQuote(symbol);
                    } else {
                        throw err;
                    }
                }
            }

            const stockData = this.formatStockData(quote);

            // 3. Update/Create in DB — synthetic prices are never persisted.
            if (stockData.__mock) return stockData;

            if (localStock) {
                await localStock.update({
                    current_price: stockData.current_price,
                    change: stockData.change,
                    change_percent: stockData.change_percent,
                    market_cap: stockData.market_cap,
                    volume: stockData.volume,
                    currency: stockData.currency,
                    exchange: stockData.exchange
                });
            } else {
                await db.Stock.create({
                    symbol: stockData.symbol,
                    name: stockData.name,
                    current_price: stockData.current_price,
                    market_cap: stockData.market_cap,
                    volume: stockData.volume,
                    currency: stockData.currency,
                    exchange: stockData.exchange,
                    sector: 'Unknown' // default
                });
            }

            return stockData;

        } catch (error) {
            console.error(`Error fetching stock price for ${symbol}:`, error.message);
            // Final Fallback: Return whatever is in DB even if stale
            const localStock = await db.Stock.findOne({ where: { symbol } });
            if (localStock) {
                return {
                    symbol: localStock.symbol,
                    name: localStock.name,
                    current_price: parseFloat(localStock.current_price),
                    change: parseFloat(localStock.change || 0),
                    change_percent: parseFloat(localStock.change_percent || 0),
                    currency: localStock.currency || 'USD',
                    market_cap: parseFloat(localStock.market_cap || 0),
                    volume: parseInt(localStock.volume || 0),
                    timestamp: localStock.updatedAt
                };
            }
            throw new Error(`Stock data unavailable for ${symbol}`);
        }
    }

    /**
     * Search Stocks (Store First)
     */
    static searchCache = new Map(); // lower-cased query -> { at, value }
    static SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
    static SEARCH_CACHE_MAX = 200;

    static recallSearch(query) {
        const hit = this.searchCache.get(String(query).toLowerCase());
        return hit && Date.now() - hit.at < this.SEARCH_CACHE_TTL_MS ? hit.value : null;
    }

    static rememberSearch(query, value) {
        if (!Array.isArray(value) || value.length === 0) return;
        if (this.searchCache.size >= this.SEARCH_CACHE_MAX) {
            this.searchCache.delete(this.searchCache.keys().next().value); // oldest-inserted
        }
        this.searchCache.set(String(query).toLowerCase(), { at: Date.now(), value });
    }

    static async searchStocks(query) {
        // With Dhan active, search the whole instrument master (every NSE/BSE
        // equity and the main indices by symbol and company name).
        if (this.dhanActive) {
            try {
                const found = await this.dhan.search(query);
                if (found.length > 0) return found;
            } catch (err) {
                console.warn(`[FinDataService] Dhan search failed, using fallback: ${err.message}`);
            }
        }
        try {
            // 1. Check DB first
            const localResults = await db.Stock.findAll({
                where: {
                    [Op.or]: [
                        { symbol: { [Op.like]: `%${query}%` } },
                        { name: { [Op.like]: `%${query}%` } }
                    ]
                },
                limit: 10
            });

            // If we have enough results, return them immediately (limit API calls)
            // But if user wants specific new stock, they might need API. 
            // Compromise: If DB has results? Return them. 
            // Better: If DB has *exact* match? Return. 
            // Or just return DB results combined with async API fetch?
            // User requested: "if db not found means that time fetch from api"

            if (localResults.length > 0) {
                return localResults.map(s => ({
                    symbol: s.symbol,
                    name: s.name,
                    type: 'EQUITY',
                    exchange: s.exchange || 'UNKNOWN'
                }));
            }

            // 2. Not found in DB -> Fetch API (unless this exact query was answered recently)
            const cachedSearch = this.recallSearch(query);
            if (cachedSearch) return cachedSearch;
            let stocks = [];
            try {
                stocks = await this.activeProvider.search(query);
            } catch (err) {
                if (err.message.includes('Too Many Requests') || err.message.includes('429')) {
                    console.error('[FinDataService] 429 Error on Search - Switching Provider');
                    await this.switchProvider();
                    stocks = await this.activeProvider.search(query);
                }
            }

            // Results are NOT written to the stocks table any more: a public read
            // path must not create rows (it filled `stocks` with price-0
            // placeholders that then showed up in /stocks/search and trending).
            // Nothing reads those rows; repeat queries are served from the small
            // in-memory cache below instead.
            this.rememberSearch(query, stocks);
            return stocks;

        } catch (error) {
            console.error(`Error searching stocks for ${query}:`, error.message);
            return [];
        }
    }

    /**
     * Bulk Quotes (Store First)
     */
    static async getBulkQuotes(symbols) {
        if (!symbols || symbols.length === 0) return {};
        const results = {};
        const missingOrStale = [];

        // 1. Check DB
        for (const symbol of symbols) {
            const localStock = await db.Stock.findOne({ where: { symbol } });
            const isStale = !localStock || (parseFloat(localStock.current_price || 0) <= 0) || (new Date() - new Date(localStock.updatedAt) > 15 * 60 * 1000);

            if (localStock && !isStale) {
                results[symbol] = {
                    symbol: localStock.symbol,
                    name: localStock.name,
                    current_price: parseFloat(localStock.current_price),
                    change: parseFloat(localStock.change || 0),
                    change_percent: parseFloat(localStock.change_percent || 0),
                    currency: localStock.currency || 'USD',
                    market_cap: parseFloat(localStock.market_cap || 0),
                    volume: parseInt(localStock.volume || 0),
                    timestamp: localStock.updatedAt
                };
            } else {
                missingOrStale.push(symbol);
            }
        }

        // 2. Fetch Missing from API
        if (missingOrStale.length > 0) {
            try {
                // Indian symbols go to Dhan (one batched request) when it is
                // enabled; whatever it doesn't return goes down the usual chain.
                const dhanQuotes = await this.tryDhanQuotes(missingOrStale);
                const dhanSymbols = new Set(dhanQuotes.map(q => q.symbol));
                const remaining = missingOrStale.filter(s => !dhanSymbols.has(s));
                let restError = null;
                let rest = [];
                if (remaining.length > 0) {
                    try {
                        const fetched = await this.activeProvider.getBulkQuotes(remaining);
                        rest = Array.isArray(fetched) ? fetched : [fetched];
                    } catch (e) {
                        // Keep the Dhan quotes; surface this to the handler below.
                        if (dhanQuotes.length === 0) throw e;
                        restError = e;
                    }
                }
                const quotesArray = [...dhanQuotes, ...rest];

                for (const quote of quotesArray) {
                    if (!quote || quote.__mock) continue; // never cache synthetic prices
                    const stockData = this.formatStockData(quote);

                    // Update DB
                    const [record, created] = await db.Stock.findOrCreate({
                        where: { symbol: quote.symbol },
                        defaults: {
                            name: stockData.name,
                            exchange: stockData.exchange,
                            current_price: stockData.current_price,
                            change: stockData.change,
                            change_percent: stockData.change_percent
                        }
                    });

                    if (!created) {
                        await record.update({
                            current_price: stockData.current_price,
                            change: stockData.change,
                            change_percent: stockData.change_percent,
                            market_cap: stockData.market_cap,
                            volume: stockData.volume,
                            currency: stockData.currency,
                            exchange: stockData.exchange
                        });
                    }

                    results[quote.symbol] = stockData;
                }
                if (restError) throw restError;
            } catch (err) {
                console.error("Bulk quote error:", err.message);
                let retrySuccess = false;

                if (err.message.includes('429') || err.message.includes('Too Many Requests')) {
                    await this.switchProvider();
                    try {
                        // Don't re-fetch symbols Dhan already answered above.
                        const retrySymbols = missingOrStale.filter(s => !results[s]);
                        let quotes = await this.activeProvider.getBulkQuotes(retrySymbols);
                        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

                        for (const quote of quotesArray) {
                            if (!quote || quote.__mock) continue; // never cache synthetic prices
                            const stockData = this.formatStockData(quote);

                            // Update DB
                            const [record, created] = await db.Stock.findOrCreate({
                                where: { symbol: quote.symbol },
                                defaults: {
                                    name: stockData.name,
                                    exchange: stockData.exchange,
                                    change: stockData.change,
                                    change_percent: stockData.change_percent,
                                    current_price: stockData.current_price
                                }
                            });

                            if (!created) {
                                await record.update({
                                    current_price: stockData.current_price,
                                    market_cap: stockData.market_cap,
                                    volume: stockData.volume,
                                    currency: stockData.currency,
                                    exchange: stockData.exchange
                                });
                            }

                            results[quote.symbol] = stockData;
                        }
                        retrySuccess = true;
                    } catch (retryErr) {
                        console.error("Retry failed:", retryErr.message);
                    }
                }

                if (!retrySuccess) {
                    // Fallback: Use whatever DB has even if stale for missing items
                    for (const sym of missingOrStale) {
                        if (results[sym]) continue;
                        const localStock = await db.Stock.findOne({ where: { symbol: sym } });
                        if (localStock) {
                            results[sym] = {
                                symbol: localStock.symbol,
                                name: localStock.name,
                                current_price: parseFloat(localStock.current_price),
                                change: parseFloat(localStock.change || 0),
                    change_percent: parseFloat(localStock.change_percent || 0),
                                currency: localStock.currency || 'USD',
                                market_cap: parseFloat(localStock.market_cap || 0),
                                volume: parseInt(localStock.volume || 0),
                                timestamp: localStock.updatedAt
                            };
                        }
                    }
                }
            }
        }

        return results;
    }

    /** The Finnhub provider instance, or null when no key is configured. */
    static get finnhub() {
        return this.providers.find(p => p instanceof FinnhubProvider) || null;
    }

    /**
     * Market news. Finnhub's /news categories are:
     * general | forex | crypto | merger. Anything else maps to `general`.
     */
    static async fetchLatestNews(category = 'general') {
        const FINNHUB_CATEGORIES = ['general', 'forex', 'crypto', 'merger'];
        const finnhubCategory = FINNHUB_CATEGORIES.includes(category) ? category : 'general';

        const cacheKey = `news:${finnhubCategory}`;
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch { /* cache miss or redis down — fall through to a live fetch */ }

        const provider = this.finnhub;
        if (!provider) return [];

        try {
            const raw = await provider.getMarketNews(finnhubCategory);
            const articles = raw.slice(0, 50).map(a => ({
                external_id: String(a.id ?? ''),
                title: a.headline,
                summary: a.summary,
                source: a.source,
                url: a.url,
                image_url: a.image || null,
                category: a.category || finnhubCategory,
                related: a.related || null,
                published_at: a.datetime ? new Date(a.datetime * 1000).toISOString() : null,
            })).filter(a => a.title);

            try { await redisClient.setEx(cacheKey, 300, JSON.stringify(articles)); } catch { /* non-fatal */ }
            return articles;
        } catch (e) {
            console.error('[FinDataService] news fetch failed:', e.message);
            return [];
        }
    }

    /** Intraday OHLC for a symbol, used by the Market Overview chart. */
    static async getCandles(symbol, resolution = '5', from, to) {
        // Indian symbols: Dhan intraday/historical candles when enabled. Any
        // failure or empty answer falls through to the Finnhub path below.
        if (this.dhan && this.dhan.canServe(symbol)) {
            const dhanCacheKey = `candles:dhan:${symbol}:${resolution}:${from || ''}:${to || ''}`;
            try {
                const cached = await redisClient.get(dhanCacheKey);
                if (cached) return JSON.parse(cached);
            } catch { /* ignore */ }
            try {
                const series = await this.dhan.getCandles(symbol, resolution, from, to);
                if (series.length > 0) {
                    try { await redisClient.setEx(dhanCacheKey, 60, JSON.stringify(series)); } catch { /* ignore */ }
                    return series;
                }
            } catch (e) {
                if (e.message !== 'Dhan auth failed') {
                    console.warn(`[FinDataService] Dhan candles unavailable for ${symbol}: ${e.message}`);
                }
            }
        }

        const provider = this.finnhub;
        if (!provider) return [];

        const now = Math.floor(Date.now() / 1000);
        const toTs = to || now;
        const fromTs = from || toTs - 24 * 60 * 60;

        const cacheKey = `candles:${symbol}:${resolution}:${fromTs}:${toTs}`;
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch { /* ignore */ }

        try {
            const series = await provider.getCandles(symbol, resolution, fromTs, toTs);
            try { await redisClient.setEx(cacheKey, 60, JSON.stringify(series)); } catch { /* ignore */ }
            return series;
        } catch (e) {
            console.error(`[FinDataService] candles failed for ${symbol}:`, e.message);
            return [];
        }
    }
}

module.exports = { FinDataService, redisClient };
