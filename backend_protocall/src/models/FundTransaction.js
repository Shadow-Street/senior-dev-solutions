const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FundTransaction = sequelize.define(
    "FundTransaction",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      investor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      transaction_type: {
        type: DataTypes.ENUM('purchase', 'redemption', 'transfer'),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
      },
      units: {
        type: DataTypes.DECIMAL(20, 4),
      },
      transaction_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
        defaultValue: 'pending',
      },
    },
    {
      tableName: "fund_transactions",
      timestamps: true,
      underscored: true,
    }
  );

  return FundTransaction;
};
