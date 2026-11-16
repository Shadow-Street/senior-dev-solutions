const { DataTypes } = require('sequelize');

/**
 * Ledger of published recommendations per plan (migration 025). A row is
 * written the first time a published recommendation reaches a plan and is
 * never deleted when the post is edited, unpublished or deleted, so deleting a
 * post does not hand allowance back. UNIQUE (post_id, plan_id).
 */
module.exports = (sequelize) => sequelize.define(
  'AdvisorPostUsage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    advisor_id: { type: DataTypes.UUID, allowNull: false },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    post_id: { type: DataTypes.UUID, allowNull: false },
    published_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'advisor_post_usage',
    timestamps: false,
    indexes: [
      { name: 'uq_post_usage_post_plan', unique: true, fields: ['post_id', 'plan_id'] },
      { name: 'idx_post_usage_plan_published', fields: ['plan_id', 'published_at'] },
      { name: 'idx_post_usage_advisor', fields: ['advisor_id'] },
    ],
  }
);
