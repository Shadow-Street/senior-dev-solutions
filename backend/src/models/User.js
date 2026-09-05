const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: 'users_email_uk', // Named constraint to prevent duplication
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "user",
      },
      verify_step: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      google_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      profile_image_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_premium: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      app_role: { // Differentiating from 'role' which might be db role
        type: DataTypes.STRING,
        defaultValue: 'user'
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'banned'),
        defaultValue: 'active'
      }
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
    }
  );

  return User;
};
