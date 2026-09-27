const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Stock = sequelize.define(
    "Stock",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      symbol: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: 'stocks_symbol_uk',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      sector: {
        type: DataTypes.STRING(100),
      },
      current_price: {
        type: DataTypes.DECIMAL(15, 2),
      },
      // Persisted so a cached quote still reports the day's move. Without
      // these, every DB-served quote read back as 0.00%.
      change: {
        type: DataTypes.DECIMAL(15, 4),
      },
      change_percent: {
        type: DataTypes.DECIMAL(10, 4),
      },
      market_cap: {
        type: DataTypes.DECIMAL(20, 2),
      },
      listed_on: {
        type: DataTypes.STRING(50),
      },
      exchange: {
        type: DataTypes.STRING(50),
      },
      currency: {
        type: DataTypes.STRING(10),
      },
      volume: {
        type: DataTypes.BIGINT,
      },
    },
    {
      tableName: "stocks",
      timestamps: true,
      underscored: true,
    }
  );

  return Stock;
};
