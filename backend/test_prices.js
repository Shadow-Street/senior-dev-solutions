const { FinDataService, redisClient } = require('./src/services/FinDataService');
const db = require('./src/models');

async function test() {
    try {
        await db.sequelize.authenticate();
        console.log('DB Connected');

        if (!redisClient.isOpen) {
            await redisClient.connect();
        }

        const symbols = ['TCS.NS', 'AAPL', 'HDFCBANK.NS'];

        console.log('--- Testing getBulkQuotes ---');
        console.log(`Fetching quotes for: ${symbols.join(', ')}`);

        const results = await FinDataService.getBulkQuotes(symbols);

        console.log('--- Results ---');
        console.log(JSON.stringify(results, null, 2));

        // Analyze for zeros
        let hasZeros = false;
        for (const sym of symbols) {
            const data = results[sym];
            if (!data) {
                console.error(`MISSING data for ${sym}`);
                hasZeros = true;
            } else if (parseFloat(data.current_price) <= 0) {
                console.error(`ZERO PRICE for ${sym}: ${data.current_price}`);
                hasZeros = true;
            } else {
                console.log(`VALID PRICE for ${sym}: ${data.current_price}`);
            }
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await redisClient.quit();
        // await db.sequelize.close(); // problematic with some drivers, leaving open usually ok for script exit
        process.exit(0);
    }
}

test();
