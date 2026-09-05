const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PledgeAccessRequest = sequelize.define(
    "PledgeAccessRequest",
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
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
      },
      reason: {
        type: DataTypes.TEXT,
      },
      created_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "pledge_access_requests",
      timestamps: true,
      underscored: true,
    }
  );

  return PledgeAccessRequest;
};
