const { DataTypes } = require('sequelize');

/**
 * Moderation history (migration 019): one row per admin decision, append-only.
 *
 *   action   approve | reject | escalate | remove_content | warn | suspend | ban
 *   outcome  the report status the action left behind
 *   details  { days, ends_at, sanction_id, removed, bulk, closed_reports }
 *
 * Mirrored into audit_logs (action `moderation_<action>`) for the platform-wide
 * audit trail.
 */
module.exports = (sequelize) => sequelize.define(
  'ModerationAction',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    moderator_id: { type: DataTypes.UUID, allowNull: false },
    report_id: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING(20), allowNull: false },
    target_type: { type: DataTypes.STRING(20), allowNull: true },
    target_id: { type: DataTypes.UUID, allowNull: true },
    target_user_id: { type: DataTypes.UUID, allowNull: true },
    outcome: { type: DataTypes.STRING(20), allowNull: true },
    note: { type: DataTypes.STRING(1000), allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'moderation_actions',
    timestamps: false,
    indexes: [
      { name: 'idx_moderation_actions_created', fields: ['created_at'] },
      { name: 'idx_moderation_actions_report', fields: ['report_id'] },
      { name: 'idx_moderation_actions_target_user', fields: ['target_user_id', 'created_at'] },
      { name: 'idx_moderation_actions_moderator', fields: ['moderator_id', 'created_at'] },
    ],
  }
);
