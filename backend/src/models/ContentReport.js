const { DataTypes } = require('sequelize');

/**
 * Reported or automatically flagged content (migration 019), the Content
 * Moderation queue.
 *
 *   target_type  message | advisor_post | user | blocked_message
 *                (blocked_message: the client-side filter refused to send it,
 *                so there is no row to point at and target_id is NULL)
 *   source       user (a member reported it) | auto (the message filter)
 *   status       pending | escalated | resolved | dismissed
 *   decision     approved | rejected | removed | warned | suspended | banned |
 *                escalated (NULL until an admin acts)
 *
 * One reporter can report one target once (uq_content_reports_reporter_target);
 * repeats are collapsed onto the existing row. The reporter's identity is only
 * ever returned to admins.
 */
module.exports = (sequelize) => sequelize.define(
  'ContentReport',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    target_type: { type: DataTypes.STRING(20), allowNull: false },
    target_id: { type: DataTypes.UUID, allowNull: true },
    target_user_id: { type: DataTypes.UUID, allowNull: true },
    reporter_id: { type: DataTypes.UUID, allowNull: true },
    source: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'user' },
    reason: { type: DataTypes.STRING(30), allowNull: false },
    note: { type: DataTypes.STRING(1000), allowNull: true },
    content_snapshot: { type: DataTypes.TEXT, allowNull: true },
    context: { type: DataTypes.JSON, allowNull: true },
    severity: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'medium' },
    status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'pending' },
    decision: { type: DataTypes.STRING(20), allowNull: true },
    decision_note: { type: DataTypes.STRING(1000), allowNull: true },
    decided_by: { type: DataTypes.UUID, allowNull: true },
    decided_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'content_reports',
    timestamps: false,
    indexes: [
      { name: 'uq_content_reports_reporter_target', unique: true, fields: ['reporter_id', 'target_type', 'target_id'] },
      { name: 'idx_content_reports_status', fields: ['status', 'created_at'] },
      { name: 'idx_content_reports_target', fields: ['target_type', 'target_id'] },
      { name: 'idx_content_reports_target_user', fields: ['target_user_id', 'created_at'] },
    ],
  }
);
