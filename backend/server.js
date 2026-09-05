require("dotenv").config();
const { server } = require("./src/app");
const { sequelize } = require("./src/models");

const PORT = process.env.PORT || 5000;

const CronService = require('./src/services/CronService');

async function start() {
  try {
    // Start Cron Jobs
    CronService.start();

    await sequelize.authenticate();
    console.log("Database connection established");

    // await sequelize.sync({ alter: true });
    await sequelize.sync();

    console.log("Models synchronized");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();