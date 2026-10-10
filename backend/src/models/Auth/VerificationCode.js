const { DataTypes } = require("sequelize");

/**
 * One-time codes: registration OTPs and password-reset tokens.
 *
 * Only a SHA-256 hash of the code is stored, for the same reason refresh
 * tokens are hashed in OauthToken — a dump of this table must not hand anyone
 * a working code. The raw value exists in the recipient's inbox and nowhere
 * else.
 *
 * `attempts` is what makes a six-digit OTP safe: without a ceiling, a million
 * guesses inside the ten-minute window is not a meaningful barrier. The code
 * is burned after a small number of wrong tries and the user asks for a new
 * one.
 */
module.exports = (sequelize) => {
  const VerificationCode = sequelize.define(
    "VerificationCode",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      // Kept alongside user_id so a reset can be matched before the account is
      // disclosed, and so the row survives an email change mid-flow.
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      // 'email_verification' | 'password_reset'
      purpose: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      code_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      consumed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      attempts: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "verification_codes",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["code_hash"] },
        { fields: ["user_id"] },
        { fields: ["email", "purpose"] },
      ],
    }
  );

  return VerificationCode;
};
