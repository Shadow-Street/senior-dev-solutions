require("dotenv").config();
const { sequelize } = require("../src/models");

async function reset() {
  console.log("Resetting database schema...");
  try {
    await sequelize.authenticate();

    // Disable FK checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Get all tables
    const [results] = await sequelize.query("SHOW TABLES");
    const tables = results.map(row => Object.values(row)[0]);

    if (tables.length > 0) {
      console.log(`Dropping ${tables.length} tables...`);
      const dropQueries = tables.map(table => `DROP TABLE IF EXISTS \`${table}\``);
      for (const query of dropQueries) {
        await sequelize.query(query);
      }
    }

    // Re-enable FK checks (temporarily disabled for sync too, just in case)
    // Actually, leave it disabled for sync, then enable? 
    // No, sync needs to create valid FKs.

    await sequelize.sync({ force: true });

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log("Database schema reset successfully (ALL DATA CLEARED).");
  } catch (error) {
    console.error("Failed to reset schema:", error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

reset();
