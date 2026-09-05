const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PledgeSession = sequelize.define(
    "PledgeSession",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      stock_symbol: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      session_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      session_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
        defaultValue: 'pending',
      },
      execution_rule: {
        type: DataTypes.ENUM('session_end', 'manual'),
        defaultValue: 'session_end',
      },
      last_executed_at: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "pledge_sessions",
      timestamps: true,
      underscored: true,
    }
  );

  return PledgeSession;
};
