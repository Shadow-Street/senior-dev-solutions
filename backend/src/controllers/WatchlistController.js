const db = require("../models");
const { FinDataService } = require("../services/FinDataService");

exports.getWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        let watchlist = await db.Watchlist.findOne({ where: { user_id: userId, is_default: true } });

        if (!watchlist) {
            watchlist = await db.Watchlist.create({
                user_id: userId,
                name: 'My Watchlist',
                stocks: [], // JSON array of symbols
                is_default: true
            });
        }

        const symbols = watchlist.stocks || [];
        if (symbols.length === 0) {
            return res.json({ ...watchlist.toJSON(), stocks: [] });
        }

        // Fetch live data
        const liveDataMap = await FinDataService.getBulkQuotes(symbols);

        // Transform simple symbol list into rich objects
        const enrichedStocks = symbols.map(symbol => {
            const data = liveDataMap[symbol] || {};
            return {
                symbol,
                name: data.name || symbol,
                current_price: data.current_price || 0,
                change: data.change || 0,
                change_percent: data.change_percent || 0,
                market_cap: data.market_cap,
                volume: data.volume
            };
        });

        res.json({ ...watchlist.toJSON(), stocks: enrichedStocks });

    } catch (error) {
        console.error("Error fetching watchlist:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.addToWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: "Symbol is required" });
        }

        let watchlist = await db.Watchlist.findOne({ where: { user_id: userId, is_default: true } });
        if (!watchlist) {
            watchlist = await db.Watchlist.create({
                user_id: userId,
                name: 'My Watchlist',
                stocks: [],
                is_default: true
            });
        }

        let stocks = watchlist.stocks || [];
        if (!stocks.includes(symbol)) {
            stocks = [...stocks, symbol]; // Create new array to ensure Sequelize detects change

            // Update DB
            await db.Watchlist.update(
                { stocks: stocks },
                { where: { id: watchlist.id } }
            );
        }

        res.json({ message: "Stock added to watchlist", stocks });

    } catch (error) {
        console.error("Error adding to watchlist:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.removeFromWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;

        const watchlist = await db.Watchlist.findOne({ where: { user_id: userId, is_default: true } });
        if (!watchlist) {
            return res.status(404).json({ error: "Watchlist not found" });
        }

        let stocks = watchlist.stocks || [];
        const newStocks = stocks.filter(s => s !== symbol);

        if (newStocks.length !== stocks.length) {
            await db.Watchlist.update(
                { stocks: newStocks },
                { where: { id: watchlist.id } }
            );
        }

        res.json({ message: "Stock removed from watchlist", stocks: newStocks });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
