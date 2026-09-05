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
        allowNull: true,
      },
      transaction_type: {
        type: DataTypes.ENUM(
          'purchase',
          'redemption',
          'transfer',
          'payment'
        ),
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
      payment_intent_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      fund_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'INR',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
