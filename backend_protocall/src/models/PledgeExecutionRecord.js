const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PledgeExecutionRecord = sequelize.define(
    "PledgeExecutionRecord",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      pledge_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      demat_account_id: {
        type: DataTypes.UUID,
      },
      stock_symbol: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      side: {
        type: DataTypes.ENUM('buy', 'sell'),
        allowNull: false,
      },
      pledged_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      executed_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      executed_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      total_execution_value: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
      },
      platform_commission: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      commission_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 2,
      },
      status: {
        type: DataTypes.ENUM('completed', 'failed', 'partial'),
        defaultValue: 'completed',
      },
      executed_at: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "pledge_execution_records",
      timestamps: true,
      underscored: true,
    }
  );

  return PledgeExecutionRecord;
};
