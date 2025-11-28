const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FeatureConfig = sequelize.define(
    "FeatureConfig",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      feature_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      feature_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      access_level: {
        type: DataTypes.ENUM('free', 'premium', 'vip'),
        defaultValue: 'free',
      },
      description: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: "feature_configs",
      timestamps: true,
      underscored: true,
    }
  );

  return FeatureConfig;
};
