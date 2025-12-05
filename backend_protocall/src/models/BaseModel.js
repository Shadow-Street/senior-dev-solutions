const { DataTypes } = require("sequelize");

// Base model factory for creating standard entity models
const createBaseModel = (sequelize, modelName, additionalFields = {}) => {
  return sequelize.define(modelName, {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ...additionalFields,
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: modelName.toLowerCase() + 's',
    timestamps: false,
  });
};

module.exports = { createBaseModel, DataTypes };