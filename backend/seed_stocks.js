const db = require('./src/models');

const stocks = [
    // US Tech
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', current_price: 180.00 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', current_price: 400.00 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Technology', current_price: 140.00 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical', current_price: 170.00 },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical', current_price: 200.00 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology', current_price: 800.00 },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Technology', current_price: 480.00 },
    { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', sector: 'Communication Services', current_price: 600.00 },

    // Indian Stocks
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited', exchange: 'NSE', sector: 'Energy', current_price: 2900.00 },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'Technology', current_price: 4000.00 },
    { symbol: 'INFY.NS', name: 'Infosys Limited', exchange: 'NSE', sector: 'Technology', current_price: 1600.00 },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', exchange: 'NSE', sector: 'Financial Services', current_price: 1400.00 },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited', exchange: 'NSE', sector: 'Consumer Cyclical', current_price: 950.00 },
    { symbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', sector: 'Financial Services', current_price: 750.00 },
];

async function seedStocks() {
    try {
        console.log('Syncing database...');
        // Don't force sync, just ensure connection
        await db.sequelize.authenticate();

        console.log('Seeding stocks...');
        for (const stock of stocks) {
            const [record, created] = await db.Stock.findOrCreate({
                where: { symbol: stock.symbol },
                defaults: stock
            });
            console.log(`${stock.symbol}: ${created ? 'Created' : 'Already exists'}`);
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding stocks:', error);
        process.exit(1);
    }
}

seedStocks();
