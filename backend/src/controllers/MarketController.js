const { FinDataService } = require("../services/FinDataService");

exports.getMarketData = async (req, res) => {
    try {
        // Return key indices. If Yahoo allows, fetch ^NSEI, ^BSESN, etc.
        // For now, let's fetch a few major indices or stocks as a "market view"
        const indices = ["^NSEI", "^BSESN", "RELIANCE.NS", "TCS.NS", "INFY.NS"];
        const marketData = await FinDataService.getBulkQuotes(indices);
        res.json(marketData);
    } catch (error) {
        console.error("Error fetching market data:", error);
        res.status(500).json({ error: "Failed to fetch market data" });
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
