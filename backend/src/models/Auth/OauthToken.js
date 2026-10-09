const { DataTypes } = require("sequelize");

/**
 * Refresh-token records.
 *
 * Only a SHA-256 hash of each refresh token is stored. The raw token exists in
 * the client's hands and nowhere else, so a dump of this table yields nothing an
 * attacker can present — the previous version kept the full JWT in a TEXT
 * column, which made the table itself a set of live credentials.
 *
 * Rotation is tracked rather than implied: refreshing revokes the row it came
 * from and records the hash that replaced it. That chain is what makes reuse
 * detectable — a token presented after it was already rotated means the value
 * leaked, and every token in that user's family is revoked.
 */
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
        type: DataTypes.UUID,
        allowNull: false,
      },
      // SHA-256 of the refresh token, hex encoded.
      token_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      // Legacy column: raw tokens used to be written here. Kept nullable so
      // existing rows still load, but nothing writes to it any more.
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      // Set when the token is rotated or the session is logged out.
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // The hash this token was rotated into, for following the chain.
      replaced_by_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      // Coarse client fingerprint, for showing a user their active sessions.
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
    },
    {
      tableName: "oauth_tokens",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["token_hash"] },
        { fields: ["user_id"] },
      ],
    }
  );

  return OauthToken;
};
