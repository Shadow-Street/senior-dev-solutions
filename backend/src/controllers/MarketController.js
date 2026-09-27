const { FinDataService } = require("../services/FinDataService");

/**
 * Symbol universe for the dashboard.
 *
 * Configurable so the deployment can point at whatever its Finnhub plan
 * covers. Finnhub's free tier serves US equities; Indian exchanges (NSE/BSE)
 * require a paid plan, so the defaults below are US symbols.
 *
 *   MARKET_SYMBOLS=AAPL,MSFT,...   watchlist used for gainers/losers
 *   MARKET_INDICES=SPY,DIA,QQQ     index tiles beside the chart
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
        res.status(502).json({ error: 'Failed to fetch market data', detail: error.message });
    }
};

/** Intraday OHLC series for the Market Overview chart. */
exports.getCandles = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { resolution = '5', from, to } = req.query;

        if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

        const series = await FinDataService.getCandles(
            symbol.toUpperCase(),
            resolution,
            from ? Number(from) : undefined,
            to ? Number(to) : undefined,
        );
        res.json({ symbol: symbol.toUpperCase(), resolution, series });
    } catch (error) {
        console.error('Error fetching candles:', error.message);
        res.status(502).json({ error: 'Failed to fetch candles', detail: error.message });
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
        res.status(500).json({ error: error.message });
    }
};

exports.search = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json([]);
        }
        const results = await FinDataService.searchStocks(q);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
