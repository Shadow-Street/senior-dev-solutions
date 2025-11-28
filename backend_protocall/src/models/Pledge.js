const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Pledge = sequelize.define(
    "Pledge",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      session_id: {
        type: DataTypes.UUID,
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
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price_target: {
        type: DataTypes.DECIMAL(15, 2),
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'executed', 'cancelled'),
        defaultValue: 'pending',
      },
    },
    {
      tableName: "pledges",
      timestamps: true,
      underscored: true,
    }
  );

  return Pledge;
};
