const { Sequelize } = require('sequelize');
require("dotenv").config();

const sequelize = new Sequelize(
    process.env.DB_NAME || "stock_trading_db",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD || 123456,
    {
        host: process.env.DB_HOST || "127.0.0.1",
        dialect: process.env.DB_DIALECT || "mysql",
        logging: console.log,
    }
);

async function addColumn() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Check if column exists, if not add it
        const [results] = await sequelize.query(`
      SELECT count(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || "stock_trading_db"}' 
      AND TABLE_NAME = 'moderation_logs' 
      AND COLUMN_NAME = 'admin_reviewed'
    `);

        if (results[0].count > 0) {
            console.log("Column 'admin_reviewed' already exists.");
        } else {
            console.log("Adding column 'admin_reviewed'...");
            await sequelize.query(`
          ALTER TABLE moderation_logs
          ADD COLUMN admin_reviewed BOOLEAN DEFAULT false;
        `);
            console.log("Column added successfully.");
        }
    } catch (error) {
        console.error('Unable to connect to the database or execute query:', error);
    } finally {
        await sequelize.close();
    }
}

addColumn();
