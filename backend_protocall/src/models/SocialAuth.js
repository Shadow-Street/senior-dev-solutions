const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SocialAuth = sequelize.define(
    "SocialAuth",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      provider: {
        type: DataTypes.ENUM('google', 'facebook'),
        allowNull: false,
      },
      provider_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      access_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "social_auth",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['provider', 'provider_id'],
        },
      ],
    }
  );

  return SocialAuth;
};
