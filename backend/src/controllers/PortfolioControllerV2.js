const db = require("../models");
const { FinDataService } = require("../services/FinDataService");

exports.getPortfolio = async (req, res) => {
    try {

        const userId = req.user.id;
        let portfolio = await db.Portfolio.findOne({
            where: { user_id: userId },
            include: [{ model: db.PortfolioHolding }]
        });

        if (!portfolio) {
            // Create default portfolio if not exists
            portfolio = await db.Portfolio.create({
                user_id: userId,
                name: 'My Portfolio',
                total_value: 0,
                total_profit_loss: 0
            });
            // Re-fetch to get holdings (empty array) correctly associated if needed
            // or just return empty structure
            return res.json({ ...portfolio.toJSON(), PortfolioHoldings: [] });
        }

        const holdings = portfolio.PortfolioHoldings || []; // Array of PortfolioHolding

        if (holdings.length === 0) {
            return res.json(portfolio);
        }

        // Fetch live prices
        // Fetch live prices
        const symbols = holdings.map(h => h.stock_symbol);
        console.log(`[Portfolio] Fetching prices for: ${symbols.join(', ')}`);

        const liveDataMap = await FinDataService.getBulkQuotes(symbols);
        console.log(`[Portfolio] Prices received:`, JSON.stringify(liveDataMap));

        // Enrich holdings and calculate totals
        let totalValue = 0;
        let totalInvested = 0;

        const enrichedHoldings = holdings.map(holding => {
            const liveData = liveDataMap[holding.stock_symbol] || {};
            const currentPrice = parseFloat(liveData.current_price || 0) > 0
                ? parseFloat(liveData.current_price)
                : parseFloat(holding.avg_buy_price);

            const currentValue = parseFloat(holding.quantity) * currentPrice;
            const investedValue = parseFloat(holding.quantity) * parseFloat(holding.avg_buy_price);

            const pnl = currentValue - investedValue;
            const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

            totalValue += currentValue;
            totalInvested += investedValue;

            return {
                ...holding.toJSON(),
                current_price: currentPrice,
                current_value: currentValue,
                profit_loss: pnl,
                profit_loss_percent: pnlPercent,
                name: liveData.name || holding.stock_symbol,
                change_percent: liveData.change_percent
            };
        });

        const totalPnL = totalValue - totalInvested;
        console.log(`[Portfolio] Calc: Value=${totalValue}, Invested=${totalInvested}, PnL=${totalPnL}`);

        res.json({
            id: portfolio.id,
            user_id: portfolio.user_id,
            name: portfolio.name,
            total_value: totalValue,
            total_invested: totalInvested,
            total_profit_loss: totalPnL,
            PortfolioHoldings: enrichedHoldings
        });

    } catch (error) {
        console.error("Error fetching portfolio:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.addToPortfolio = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol, quantity, price } = req.body;

        if (!symbol || !quantity || !price) {
            return res.status(400).json({ error: "Symbol, quantity, and price are required" });
        }

        let portfolio = await db.Portfolio.findOne({ where: { user_id: userId } });
        if (!portfolio) {
            portfolio = await db.Portfolio.create({ user_id: userId, name: 'My Portfolio' });
        }

        let holding = await db.PortfolioHolding.findOne({
            where: { portfolio_id: portfolio.id, stock_symbol: symbol }
        });

        if (holding) {
            // Average up/down
            const oldQty = parseFloat(holding.quantity);
            const oldAvg = parseFloat(holding.avg_buy_price);
            const newQty = parseFloat(quantity);
            const newPrice = parseFloat(price);

            const totalCost = (oldQty * oldAvg) + (newQty * newPrice);
            const totalQty = oldQty + newQty;
            const newAvg = totalCost / totalQty;

            await holding.update({
                quantity: totalQty,
                avg_buy_price: newAvg,
                cost_basis: totalCost
            });
        } else {
            await db.PortfolioHolding.create({
                portfolio_id: portfolio.id,
                stock_symbol: symbol,
                quantity: quantity,
                avg_buy_price: price,
                cost_basis: quantity * price,
                current_value: quantity * price, // Initial guess
                profit_loss: 0
            });
        }

        res.json({ message: "Stock added to portfolio" });

    } catch (error) {
        console.error("Error adding to portfolio:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.removeFromPortfolio = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;

        const portfolio = await db.Portfolio.findOne({ where: { user_id: userId } });
        if (!portfolio) {
            return res.status(404).json({ error: "Portfolio not found" });
        }

        const deleted = await db.PortfolioHolding.destroy({
            where: { portfolio_id: portfolio.id, stock_symbol: symbol }
        });

        if (deleted) {
            res.json({ message: "Stock removed from portfolio" });
        } else {
            res.status(404).json({ error: "Stock not found in portfolio" });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
