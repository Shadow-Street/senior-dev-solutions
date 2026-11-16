const { DataTypes } = require('sequelize');

/**
 * History of an advisor plan's recommendation limit (migration 025).
 * Insert-only: the limit in force is the latest row with effective_from <= now,
 * so editing a limit never rewrites what applied before it.
 *   limit_count   1..1000, NULL = unlimited
 *   limit_period  'week' | 'month'
 */
module.exports = (sequelize) => sequelize.define(
  'AdvisorPlanLimit',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    advisor_id: { type: DataTypes.UUID, allowNull: false },
    limit_count: { type: DataTypes.INTEGER, allowNull: true },
    limit_period: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'week' },
    effective_from: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    created_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'advisor_plan_limits',
    timestamps: false,
    indexes: [
      { name: 'idx_plan_limits_plan_effective', fields: ['plan_id', 'effective_from'] },
      { name: 'idx_plan_limits_advisor', fields: ['advisor_id'] },
    ],
  }
);
