const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OauthToken = sequelize.define(
    "OauthToken",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "oauth_tokens",
      timestamps: true,
      underscored: true,
    }
  );

  return OauthToken;
};
