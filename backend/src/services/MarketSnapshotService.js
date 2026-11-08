/**
 * Shared market snapshot over the whole NSE equity universe (BE-10).
 *
 * WHEN DHAN IS ACTIVE a background refresher pulls quotes for every NSE equity
 * in the EQ and BE series plus the main indices (NIFTY 50, BANK NIFTY, SENSEX,
 * NIFTY IT, NIFTY AUTO) from the instrument master - about 3,000 instruments,
 * three POST /marketfeed/quote requests of up to 1000, spaced >= 1.1 s apart by
 * DhanProvider's serialiser. /marketfeed/quote (not /ohlc) is used because it
 * carries volume as well as change, which "most active" needs.
 *
 *   market open (Mon-Fri 09:15-15:30 IST)   every 60 s
 *   otherwise                               every 15 min, plus one more
 *                                           snapshot right after the close,
 *                                           and one at the next open
 *
 * HTTP requests NEVER trigger quote calls: they read the in-memory snapshot,
 * which is shared by every user. Memory is bounded by the universe size (one
 * compact object per instrument, replaced wholesale on each refresh). When the
 * token is lapsed or Dhan is inactive no call is made at all; the refresher just
 * idles and re-checks every minute.
 *
 * Nothing starts at import: start() is called from server startup, and the clock
 * and timers are injectable so tests leave no timers running.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const OPEN_MIN = 9 * 60 + 15;   // 09:15 IST
const CLOSE_MIN = 15 * 60 + 30; // 15:30 IST
const OPEN_INTERVAL_MS = 60 * 1000;
const CLOSED_INTERVAL_MS = 15 * 60 * 1000;
const IDLE_RECHECK_MS = 60 * 1000;

const TOP_N = 10;          // gainers / losers
const ACTIVE_N = 20;       // most active / trending
const STOCKS_N = 30;       // `stocks` (ticker, trending card): most traded
const HEATMAP_N = 60;
const MIN_TURNOVER_RANKED = 1e6;      // INR; keeps untraded/illiquid noise out of rankings
const MIN_TURNOVER_TRENDING = 1e7;    // INR 1 crore

/** IST wall-clock view of a timestamp. */
function istParts(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  return { day: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), seconds: d.getUTCSeconds() };
}

/** NSE cash market hours: Monday-Friday, 09:15 inclusive to 15:30 exclusive, IST. */
function isMarketOpen(ms) {
  const { day, minutes } = istParts(ms);
  return day >= 1 && day <= 5 && minutes >= OPEN_MIN && minutes < CLOSE_MIN;
}

/** Milliseconds until the next 09:15 IST on a weekday (0 if it is that instant). */
function msUntilNextOpen(ms) {
  for (let add = 0; add <= 4 * 24 * 60 * 60 * 1000; add += 60 * 1000) {
    // Walk minute by minute: clear, cheap (<= 5760 iterations) and DST-free in IST.
    if (isMarketOpen(ms + add) && !isMarketOpen(ms + add - 60 * 1000)) return add;
  }
  return CLOSED_INTERVAL_MS;
}

const toListItem = (q) => ({
  symbol: q.symbol,
  name: q.longName || q.shortName || q.symbol,
  current_price: q.regularMarketPrice || 0,
  change: q.regularMarketChange || 0,
  change_percent: q.regularMarketChangePercent || 0,
  currency: q.currency || 'INR',
  market_cap: q.marketCap || 0,
  volume: q.regularMarketVolume || 0,
  exchange: q.exchange,
});

class MarketSnapshotService {
  /**
   * @param {object} opts
   * @param {() => object|null} opts.getProvider   returns the DhanProvider (late-bound)
   * @param {() => number} [opts.now]
   * @param {{setTimeout:Function, clearTimeout:Function}} [opts.timers]
   */
  constructor({ getProvider, now, timers } = {}) {
    this.getProvider = getProvider || (() => null);
    this.now = now || Date.now;
    this.timers = timers || { setTimeout, clearTimeout };
    this.snapshot = null;   // { at, open, quotes: Map(symbol -> quote), indices: [], views }
    this.timer = null;
    this.running = false;
    this.refreshing = null;
    this.lastError = null;
    this.universeSize = 0;
  }

  // ----- reading (never calls Dhan) ---------------------------------------

  /** Refresh cadence for the given instant. */
  intervalFor(ms) {
    return isMarketOpen(ms) ? OPEN_INTERVAL_MS : CLOSED_INTERVAL_MS;
  }

  /** A snapshot older than ~2.5 intervals (and at least 3 min) is stale. */
  staleAfterMs() {
    return Math.max(3 * 60 * 1000, 2.5 * this.intervalFor(this.now()));
  }

  isStale() {
    return !this.snapshot || this.now() - this.snapshot.at > this.staleAfterMs();
  }

  /** The Yahoo-shaped quote for one symbol from a non-stale snapshot, or undefined. */
  getQuote(symbol) {
    if (!this.snapshot || this.isStale()) return undefined;
    return this.snapshot.quotes.get(String(symbol).toUpperCase());
  }

  /** True when there is a snapshot worth serving. */
  hasData() {
    return Boolean(this.snapshot) && this.snapshot.quotes.size > 0;
  }

  /** Summary for the admin panel. */
  getInfo() {
    return {
      universe_size: this.universeSize,
      quotes_in_snapshot: this.snapshot ? this.snapshot.quotes.size : 0,
      snapshot_at: this.snapshot ? new Date(this.snapshot.at).toISOString() : null,
      stale: this.snapshot ? this.isStale() : null,
      market_open: isMarketOpen(this.now()),
      last_error: this.lastError,
    };
  }

  /** Dashboard payload parts. Lists use the same field names as the existing quote shape. */
  getViews() {
    if (!this.hasData()) return null;
    return { ...this.snapshot.views, indices: this.snapshot.indices };
  }

  // ----- computing ---------------------------------------------------------

  static buildViews(quotes) {
    const eq = [];
    for (const q of quotes.values()) {
      if (q.series !== 'EQ' && q.series !== undefined) continue; // BE etc. stay out of rankings
      if (q.symbol.startsWith('^')) continue;
      if (!(q.regularMarketPrice > 0)) continue;
      eq.push({ q, turnover: q.regularMarketPrice * (q.regularMarketVolume || 0) });
    }
    const ranked = eq.filter((e) => e.turnover >= MIN_TURNOVER_RANKED);
    const byChange = [...ranked].sort((a, b) => b.q.regularMarketChangePercent - a.q.regularMarketChangePercent);
    const byTurnover = [...eq].sort((a, b) => b.turnover - a.turnover);
    const byVolume = [...eq].sort((a, b) => (b.q.regularMarketVolume || 0) - (a.q.regularMarketVolume || 0));

    let trending = byTurnover.filter((e) => e.turnover >= MIN_TURNOVER_TRENDING && Math.abs(e.q.regularMarketChangePercent) >= 1);
    if (trending.length < 10) trending = byTurnover;

    const list = (arr, n) => arr.slice(0, n).map((e) => toListItem(e.q));
    return {
      stocks: list(byTurnover, STOCKS_N),
      gainers: list(byChange.filter((e) => e.q.regularMarketChangePercent > 0), TOP_N),
      losers: list([...byChange].reverse().filter((e) => e.q.regularMarketChangePercent < 0), TOP_N),
      most_active: list(byVolume, ACTIVE_N),
      trending: list(trending, ACTIVE_N),
      heatmap: list(byTurnover, HEATMAP_N),
    };
  }

  // ----- refreshing --------------------------------------------------------

  /** One refresh of the whole universe. Single flight; resolves true if a snapshot was stored. */
  refresh() {
    if (!this.refreshing) {
      this.refreshing = this._refresh().finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  async _refresh() {
    const dhan = this.getProvider();
    if (!dhan || !dhan.isActive()) return false; // lapsed / unconfigured: do not touch Dhan

    const startedAt = this.now();
    const open = isMarketOpen(startedAt);
    await dhan.master.ensureLoaded();
    const universe = dhan.master.universe();
    this.universeSize = universe.length;
    if (universe.length === 0) return false;

    const previous = this.snapshot ? this.snapshot.quotes : new Map();
    const { quotes, failed, aborted } = await dhan.getQuotesForEntries(universe);

    if (quotes.length === 0) {
      this.lastError = aborted && aborted.message === 'Dhan auth failed'
        ? 'Dhan rejected the credentials'
        : 'No quotes received from Dhan';
      return false;
    }

    const seriesBySymbol = new Map(universe.map((u) => [u.symbol, u.entry.series]));
    const next = new Map();
    for (const q of quotes) next.set(q.symbol, { ...q, series: seriesBySymbol.get(q.symbol) });
    // A failed batch must not blank its symbols: keep their previous values.
    for (const item of failed) {
      const old = previous.get(item.symbol);
      if (old && !next.has(item.symbol)) next.set(item.symbol, old);
    }

    const labels = { '^NSEI': 'NIFTY 50', '^NSEBANK': 'BANK NIFTY', '^BSESN': 'SENSEX', '^CNXIT': 'NIFTY IT', '^CNXAUTO': 'NIFTY AUTO' };
    const indices = Object.keys(labels)
      .map((sym) => next.get(sym))
      .filter(Boolean)
      .map((q) => ({ ...toListItem(q), label: labels[q.symbol] }));

    this.snapshot = {
      at: this.now(),
      open,
      quotes: next,
      indices,
      views: MarketSnapshotService.buildViews(next),
    };
    this.lastError = failed.length ? `${failed.length} instruments could not be refreshed` : null;
    return true;
  }

  /** Is a refresh due right now? */
  isDue() {
    const t = this.now();
    if (!this.snapshot) return true;
    const age = t - this.snapshot.at;
    // The market just closed since the last capture: take the closing snapshot.
    if (this.snapshot.open && !isMarketOpen(t)) return true;
    // The market just opened and the last snapshot is from the closed session.
    if (!this.snapshot.open && isMarketOpen(t)) return true;
    return age >= this.intervalFor(t) - 1000;
  }

  /** One scheduler step: refresh if due. Never throws. */
  async tick() {
    try {
      const dhan = this.getProvider();
      if (!dhan || !dhan.isActive()) return;
      if (this.isDue()) await this.refresh();
    } catch (e) {
      this.lastError = 'Refresh failed';
      console.error('[MarketSnapshot] refresh failed:', e && e.name);
    }
  }

  /** Delay before the next tick. */
  nextDelay() {
    const dhan = this.getProvider();
    if (!dhan || !dhan.isActive()) return IDLE_RECHECK_MS;
    const t = this.now();
    if (isMarketOpen(t)) return OPEN_INTERVAL_MS;
    // Closed: normally every 15 min, but never sleep through the next open or
    // the first minutes after the close.
    return Math.max(1000, Math.min(CLOSED_INTERVAL_MS, msUntilNextOpen(t)));
  }

  start({ initialDelayMs = 3000 } = {}) {
    if (this.running) return;
    this.running = true;
    const schedule = (delay) => {
      const handle = this.timers.setTimeout(async () => {
        await this.tick();
        if (this.running) schedule(this.nextDelay());
      }, delay);
      if (handle && typeof handle.unref === 'function') handle.unref();
      this.timer = handle;
    };
    schedule(initialDelayMs);
  }

  stop() {
    this.running = false;
    if (this.timer) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }
}

module.exports = { MarketSnapshotService, isMarketOpen, msUntilNextOpen, istParts, OPEN_INTERVAL_MS, CLOSED_INTERVAL_MS };
