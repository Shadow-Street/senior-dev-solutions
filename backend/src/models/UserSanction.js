const { DataTypes } = require('sequelize');

/**
 * Account sanctions and their history (migration 016): warnings, suspensions,
 * blocks, admin deactivation and reactivation. One row per action, never
 * edited except to record when a suspension/block was lifted. The user's live
 * state is users.status; this table says why and until when.
 *
 *   action  warn | suspend | ban | deactivate | reactivate
 *   source  user_management | moderation | system
 */
module.exports = (sequelize) => sequelize.define(
  'UserSanction',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING(20), allowNull: false },
    reason: { type: DataTypes.STRING(500), allowNull: true },
    ends_at: { type: DataTypes.DATE, allowNull: true },
    lifted_at: { type: DataTypes.DATE, allowNull: true },
    lifted_by: { type: DataTypes.UUID, allowNull: true },
    actor_id: { type: DataTypes.UUID, allowNull: true },
    source: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'user_management' },
    report_id: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'user_sanctions', timestamps: false }
);
