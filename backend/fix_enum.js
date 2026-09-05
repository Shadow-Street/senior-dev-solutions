const db = require('./src/models');

async function fixTransactionType() {
    try {
        console.log('🔄 Checking fund_transactions table...');

        // Check current column type
        const [results] = await db.sequelize.query(
            "SHOW COLUMNS FROM fund_transactions LIKE 'transaction_type'"
        );
        console.log('Current Schema:', results);

        // Alter table to modify column to VARCHAR(50) to allow any string including 'refund'
        // This removes the ENUM constraint if it exists
        console.log('🛠 Altering transaction_type to VARCHAR(50)...');
        await db.sequelize.query(
            "ALTER TABLE fund_transactions MODIFY COLUMN transaction_type VARCHAR(50) NOT NULL"
        );

        console.log('✅ Column updated successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

fixTransactionType();
