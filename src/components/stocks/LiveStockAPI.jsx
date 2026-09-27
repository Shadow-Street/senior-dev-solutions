import apiClient from '@/lib/apiClient';

/**
 * Browser-side market data client.
 *
 * Every request is proxied through this application's own backend
 * (`/api/stocks/*`), which talks to Finnhub server-side. The provider key lives
 * in FINNHUB_API_KEY on the server and is never shipped to the browser.
 *
 * The public surface (getStockPrice, getMultipleStocks, searchStocks,
 * subscribe, getTrendingStocks, getMarketStatus) is unchanged, so existing
 * callers keep working.
 */
class LiveStockAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60_000; // 1 minute — the backend caches upstream too
    this.subscribers = new Map();
  }

  /** Indian markets trade 09:15–15:30 IST, Mon–Fri. */
  getMarketStatus() {
    const now = new Date();
    // IST is UTC+5:30; derive it without pulling in a date library.
    const ist = new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60_000);
    const day = ist.getDay();
    const minutes = ist.getHours() * 60 + ist.getMinutes();

    const isWeekday = day >= 1 && day <= 5;
    const isSession = minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
    const isOpen = isWeekday && isSession;

    return { isOpen, status: isOpen ? 'Market Open' : 'Market Closed' };
  }

  /**
   * Default watchlist. The authoritative list lives on the server
   * (MARKET_SYMBOLS); this is only the seed used before the first response
   * arrives. Prefer getTrendingStocksLive() where an await is possible.
   */
  getTrendingStocks() {
    return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META'];
  }

  /** Server-resolved watchlist symbols. */
  async getTrendingStocksLive() {
    const market = await this.getMarketData();
    const symbols = (market?.stocks || []).map(s => s.symbol);
    return symbols.length ? symbols : this.getTrendingStocks();
  }

  _cached(key) {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.cacheTimeout) return hit.value;
    return undefined;
  }

  _store(key, value) {
    this.cache.set(key, { value, at: Date.now() });
    return value;
  }

  /**
   * Dashboard aggregate: { stocks, gainers, losers, indices, meta }.
   * Throws on failure so callers can render a real error state rather than
   * silently displaying invented numbers.
   */
  async getMarketData() {
    const cached = this._cached('market-data');
    if (cached) return cached;

    const { data } = await apiClient.get('/stocks/market-data');
    return this._store('market-data', data);
  }

  /** Single quote. Returns null when the symbol has no data. */
  async getStockPrice(symbol) {
    if (!symbol) return null;
    const key = `quote:${symbol}`;
    const cached = this._cached(key);
    if (cached !== undefined) return cached;

    try {
      const { data } = await apiClient.get(`/stocks/${encodeURIComponent(symbol)}/price`);
      return this._store(key, data);
    } catch (error) {
      if (error?.response?.status === 404) return this._store(key, null);
      throw error;
    }
  }

  /** Quotes for several symbols; failures are dropped, not thrown. */
  async getMultipleStocks(symbols = []) {
    const results = await Promise.allSettled(symbols.map(s => this.getStockPrice(s)));
    return results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
  }

  /** Intraday OHLC series for charts. */
  async getCandles(symbol, resolution = '5') {
    const key = `candles:${symbol}:${resolution}`;
    const cached = this._cached(key);
    if (cached) return cached;

    const { data } = await apiClient.get(
      `/stocks/${encodeURIComponent(symbol)}/candles`,
      { params: { resolution } }
    );
    return this._store(key, data?.series || []);
  }

  /** Symbol lookup. */
  async searchStocks(query) {
    if (!query || query.trim().length < 1) return [];
    const { data } = await apiClient.get('/stocks/search-live', { params: { q: query.trim() } });
    return Array.isArray(data) ? data : [];
  }

  /**
   * Poll a symbol. Returns an unsubscribe function.
   * The interval is cleared once the last subscriber for the symbol leaves.
   */
  subscribe(symbol, callback, intervalMs = 60_000) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, { callbacks: [], timer: null });
    }
    const entry = this.subscribers.get(symbol);
    entry.callbacks.push(callback);

    if (!entry.timer) {
      entry.timer = setInterval(async () => {
        try {
          const data = await this.getStockPrice(symbol);
          if (data) entry.callbacks.forEach(cb => cb(data));
        } catch {
          // A transient poll failure must not tear down the subscription.
        }
      }, intervalMs);
    }

    return () => {
      const index = entry.callbacks.indexOf(callback);
      if (index > -1) entry.callbacks.splice(index, 1);
      if (entry.callbacks.length === 0 && entry.timer) {
        clearInterval(entry.timer);
        entry.timer = null;
        this.subscribers.delete(symbol);
      }
    };
  }
}

// Export singleton instance
export const stockAPI = new LiveStockAPI();
export default stockAPI;
