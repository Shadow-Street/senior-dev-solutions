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
        unique: true,
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
      market_cap: {
        type: DataTypes.DECIMAL(20, 2),
      },
      listed_on: {
        type: DataTypes.STRING(50),
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
