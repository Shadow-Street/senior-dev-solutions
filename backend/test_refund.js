const db = require('./src/models');
const SubscriptionService = require('./src/services/SubscriptionService');
const mock = require('mock-require');

// Mock Razorpay
class MockRazorpay {
    constructor(options) { }
    get payments() {
        return {
            refund: async (transactionId, options) => {
                console.log(`[MockRazorpay] Refunding ${transactionId} amount: ${options.amount}`);
                return { id: 'rfnd_mock_123456', status: 'processed' };
            }
        };
    }
}
mock('razorpay', MockRazorpay);

async function testRefundFlow() {
    try {
        console.log('🚀 Starting Refund Flow Validation...');

        // 1. Setup Data
        const user = await db.User.create({
            name: 'Refund User',
            email: `refund_${Date.now()}@test.com`,
            password: 'password123',
            role: 'client'
        });

        const plan = await db.SubscriptionPlan.findOne();

        const subscription = await db.Subscription.create({
            user_id: user.id,
            plan_id: plan.id,
            status: 'active',
            type: 'standard',
            plan_type: plan.name,
            start_date: new Date(),
            end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
            auto_renew: true
        });

        // Create initial transaction
        const transaction = await db.SubscriptionTransaction.create({
            subscription_id: subscription.id,
            user_id: user.id,
            amount: 1000.00,
            status: 'completed',
            payment_method: 'razorpay',
            transaction_id: 'pay_mock_123456',
            transaction_type: 'charge',
            date: new Date(),
            discount_applied: 0 // No coupon
        });

        console.log('✅ Setup Complete. Subscription ID:', subscription.id);

        // 2. Run Refund/Cancel
        // We need to re-require Service to pick up the mock? 
        // Node generic require cache might be tricky. 
        // Let's assume mock-require works if called early. 
        // Actually, SubscriptionService requires razorpay inside the method, so it should be fine if we mock before call.

        console.log('🔄 Initiating Refund...');
        const result = await SubscriptionService.initiateRefund(subscription.id, 'Test Cancellation');

        console.log('📝 Result:', result);

        // 3. Verification
        if (!result.success || !result.refundId) {
            throw new Error('Refund failed or returned unexpected format');
        }

        const updatedSub = await db.Subscription.findByPk(subscription.id);
        if (updatedSub.status !== 'cancelled') {
            throw new Error('Subscription status not updated to cancelled');
        }

        const refundTx = await db.SubscriptionTransaction.findOne({
            where: {
                subscription_id: subscription.id,
                transaction_type: 'refund'
            }
        });

        if (!refundTx) throw new Error('Refund transaction log missing');
        if (parseFloat(refundTx.amount) >= 0) throw new Error('Refund amount should be negative');

        console.log('✅ Refund Flow Verified Successfully!');

        // Cleanup
        await transaction.destroy();
        await refundTx.destroy();
        await subscription.destroy();
        await user.destroy();

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        process.exit(0);
    }
}

testRefundFlow();
