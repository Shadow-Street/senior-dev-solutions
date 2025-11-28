const { Sequelize } = require("sequelize");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "my_database",
  process.env.DB_USER || "root",
  process.env.DB_PASS || null,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  }
);

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Load models manually
db.User = require("./User")(sequelize);
db.OauthToken = require("./Auth/OauthToken")(sequelize);
db.Stock = require("./Stock")(sequelize);
db.Pledge = require("./Pledge")(sequelize);
db.PledgeSession = require("./PledgeSession")(sequelize);
db.PledgeExecutionRecord = require("./PledgeExecutionRecord")(sequelize);
db.PledgeAccessRequest = require("./PledgeAccessRequest")(sequelize);
db.FundTransaction = require("./FundTransaction")(sequelize);
db.FeatureConfig = require("./FeatureConfig")(sequelize);

module.exports = db;
