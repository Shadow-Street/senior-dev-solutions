const { DataTypes } = require('sequelize');

/**
 * Market-data provider credentials (migration 015). One row per provider; today
 * only 'dhan'. The access token is stored AES-256-GCM encrypted
 * (utils/marketDataCrypto.js) and is never serialised by any API.
 */
module.exports = (sequelize) => sequelize.define(
  'ProviderCredential',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    provider: { type: DataTypes.STRING(32), allowNull: false, unique: 'uq_provider_credentials_provider' },
    client_id: { type: DataTypes.STRING(64), allowNull: false },
    access_token_encrypted: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    last_renewed_at: { type: DataTypes.DATE, allowNull: true },
    last_error: { type: DataTypes.STRING(255), allowNull: true },
    last_error_at: { type: DataTypes.DATE, allowNull: true },
    lapsed_notified_at: { type: DataTypes.DATE, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'provider_credentials', timestamps: false }
);
