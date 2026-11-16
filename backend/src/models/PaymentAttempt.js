const { DataTypes } = require('sequelize');

/**
 * One checkout attempt per Razorpay order (migration 021).
 *
 * subscription_transactions only ever holds money that was captured (and the
 * refunds against it), so before this table an order that was opened and never
 * paid, or a payment the bank declined, left no trace in the admin Financials.
 *
 *   status  pending  order created, nothing captured yet
 *           success  payment captured and the plan fulfilled (the money row is
 *                    the subscription_transactions row with the same payment id)
 *           failed   Razorpay reported payment.failed for the order
 *
 * Rows are written only by the server (createOrder, verify, webhooks); there is
 * no API that creates or edits them. Amounts are what the order was created
 * for, not what any client said.
 */
module.exports = (sequelize) => sequelize.define(
  'PaymentAttempt',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_id: { type: DataTypes.STRING(64), allowNull: false, unique: 'uq_payment_attempts_order' },
    user_id: { type: DataTypes.UUID, allowNull: true },
    plan_id: { type: DataTypes.UUID, allowNull: true },
    kind: { type: DataTypes.STRING(16), allowNull: true }, // platform | advisor
    cycle: { type: DataTypes.STRING(16), allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'INR' },
    coupon_code: { type: DataTypes.STRING(64), allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
    payment_id: { type: DataTypes.STRING(64), allowNull: true },
    error_code: { type: DataTypes.STRING(100), allowNull: true },
    error_description: { type: DataTypes.STRING(500), allowNull: true },
    succeeded_at: { type: DataTypes.DATE, allowNull: true },
    failed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'payment_attempts', timestamps: false }
);
