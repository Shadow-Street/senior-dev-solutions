const { FinDataService } = require("../services/FinDataService");
const { parseSearchQuery } = require("../utils/searchQuery");

/**
 * Symbol universe for the dashboard.
 *
 * Configurable so the deployment can point at whatever its Finnhub plan
 * covers. Finnhub's free tier serves US equities; Indian exchanges (NSE/BSE)
 * require a paid plan, so the defaults below are US symbols.
 *
 *   MARKET_SYMBOLS=AAPL,MSFT,...   watchlist used for gainers/losers
 *   MARKET_INDICES=SPY,DIA,QQQ     index tiles beside the chart
 *
 * Indian markets: when DHAN_CLIENT_ID + DHAN_ACCESS_TOKEN are set, symbols in
 * Yahoo style (RELIANCE.NS, TCS.NS, INFY.BO, indices ^NSEI / ^NSEBANK / ^BSESN)
 * are quoted by DhanHQ first. Point these two variables at such symbols to put
 * the dashboard on NSE/BSE data; US symbols keep using the Finnhub/Yahoo chain.
 */
const parseSymbols = (value, fallback) => {
    const list = (value || '')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
    return list.length ? list : fallback;
};

const MARKET_SYMBOLS = parseSymbols(process.env.MARKET_SYMBOLS, [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
    'META', 'TSLA', 'JPM', 'V', 'WMT',
]);

const MARKET_INDICES = parseSymbols(process.env.MARKET_INDICES, ['SPY', 'DIA', 'QQQ']);

const INDEX_LABELS = { SPY: 'S&P 500', DIA: 'DOW 30', QQQ: 'NASDAQ 100' };

exports.getMarketData = async (req, res) => {
    try {
        // Dhan active and a snapshot of the NSE universe exists: answer from the
        // shared in-memory snapshot (no provider call per request). Same shape
        // as below; `meta` gains universe_size, snapshot_at and stale.
        const dhanView = FinDataService.getDhanMarketView();
        if (dhanView) {
            const { views, info } = dhanView;
            return res.json({
                stocks: views.stocks,
                gainers: views.gainers,
                losers: views.losers,
                indices: views.indices,
                most_active: views.most_active,
                trending: views.trending,
                heatmap: views.heatmap,
                meta: {
                    provider: 'DhanProvider',
                    symbol_count: views.stocks.length,
                    fetched_at: info.snapshot_at,
                    universe_size: info.universe_size,
                    snapshot_at: info.snapshot_at,
                    stale: Boolean(info.stale),
                    market_open: info.market_open,
                },
            });
        }

        const [watchlist, indexQuotes] = await Promise.all([
            FinDataService.getBulkQuotes(MARKET_SYMBOLS),
            FinDataService.getBulkQuotes(MARKET_INDICES),
        ]);

        // getBulkQuotes resolves to a map keyed by symbol, already in the
        // service's normalised shape (current_price / change_percent / ...).
        const toList = (map) => Object.values(map || {}).filter(Boolean);

        const stocks = toList(watchlist).filter(s => Number(s.current_price) > 0);
        const byChangeDesc = [...stocks].sort(
            (a, b) => Number(b.change_percent || 0) - Number(a.change_percent || 0)
        );

        res.json({
            stocks,
            gainers: byChangeDesc.filter(s => Number(s.change_percent) > 0),
            losers: byChangeDesc.filter(s => Number(s.change_percent) < 0).reverse(),
            indices: toList(indexQuotes)
                .filter(s => Number(s.current_price) > 0)
                .map(s => ({ ...s, label: INDEX_LABELS[s.symbol] || s.name || s.symbol })),
            meta: {
                provider: FinDataService.activeProvider?.constructor?.name || 'unknown',
                symbol_count: stocks.length,
                fetched_at: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error fetching market data:', error.message);
        res.status(502).json({ error: 'Failed to fetch market data' });
    }
};

/** Intraday OHLC series for the Market Overview chart. */
exports.getCandles = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { resolution = '5', from, to } = req.query;

        if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
        if (!/^[A-Za-z0-9^][A-Za-z0-9.&_^-]{0,29}$/.test(symbol)) {
            return res.status(400).json({ error: 'Invalid symbol' });
        }
        if (!/^(1|5|15|25|30|60|D|W|M)$/i.test(String(resolution))) {
            return res.status(400).json({ error: 'Invalid resolution' });
        }
        if ((from !== undefined && !/^\d{1,12}$/.test(String(from))) || (to !== undefined && !/^\d{1,12}$/.test(String(to)))) {
            return res.status(400).json({ error: 'Invalid time range' });
        }

        const series = await FinDataService.getCandles(
            symbol.toUpperCase(),
            String(resolution).toUpperCase(),
            from ? Number(from) : undefined,
            to ? Number(to) : undefined,
        );
        res.json({ symbol: symbol.toUpperCase(), resolution, series });
    } catch (error) {
        console.error('Error fetching candles:', error.message);
        res.status(502).json({ error: 'Failed to fetch candles' });
    }
};

exports.getStockPrice = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ error: "Symbol is required" });
        }
        const data = await FinDataService.getStockPrice(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        if (error.message === 'Stock not found') {
            return res.status(404).json({ error: "Stock not found" });
        }
        console.error('[MarketController.js] request failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.search = async (req, res) => {
    try {
        const q = parseSearchQuery(req.query.q);
        if (q === null) {
            return res.status(400).json({ error: 'q must be 1-50 characters: letters, digits, space, & . -' });
        }
        const results = await FinDataService.searchStocks(q);
        res.json(results);
    } catch (error) {
        console.error('[MarketController.js] request failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
