const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/models');
const crypto = require('crypto');

// Correct Route Prefix: /api/payments
const BASE_URL = 'http://localhost:5000/api';
const SECRET = process.env.RAZORPAY_KEY_SECRET;

async function testSubscriptionFlow() {
    try {
        console.log('🚀 Starting Subscription Flow Test...');

        const email = `testuser_${Date.now()}@example.com`;
        const password = 'password123';
        console.log(`👤 Creating test user: ${email}`);

        await db.sequelize.authenticate();
        let user = await db.User.create({
            name: 'Test Flow User',
            email: email,
            password: password,
            app_role: 'user',
            is_verified: true
        });

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user.id, email: user.email, app_role: user.app_role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1h' }
        );

        const headers = { Authorization: `Bearer ${token}` };
        console.log('🔑 Authenticated.');

        // 2. Fetch Plans
        console.log('📋 Fetching plans...');
        const plansRes = await axios.get(`${BASE_URL}/subscriptions/plans`);
        const plans = plansRes.data;

        const targetPlan = plans.find(p => p.name === 'Ultimate Dev Plan');

        if (!targetPlan) {
            throw new Error('Target plan not found! Run create_test_plan.js first.');
        }
        console.log(`✅ Found plan: ${targetPlan.name} (₹${targetPlan.price}/mo)`);

        // 3. Create Subscription Order
        console.log('💳 Creating subscription order...');
        const orderRes = await axios.post(`${BASE_URL}/payments/create-order`, {
            planId: targetPlan.id,
            billingCycle: 'monthly',
            amount: targetPlan.price // Passing basic price, backend should validate
        }, { headers });

        const { orderId, amount, currency } = orderRes.data;
        console.log(`✅ Order created: ${orderId} for ${currency} ${amount}`);

        // 4. Verify Payment (Simulation)
        console.log('🔄 Verifying payment...');

        const paymentId = `pay_${Date.now()}`;
        const hmac = crypto.createHmac('sha256', SECRET || 'test_secret');
        hmac.update(orderId + "|" + paymentId);
        const signature = hmac.digest('hex');

        const verifyRes = await axios.post(`${BASE_URL}/payments/verify`, {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
            planId: targetPlan.id,
            billingCycle: 'monthly'
        }, { headers });

        console.log('✅ Payment verified:', verifyRes.data);

        // 5. Check Subscription Status
        console.log('🔍 Checking user subscription status...');
        const activeSub = await db.Subscription.findOne({
            where: {
                user_id: user.id,
                status: 'active'
            }
        });

        if (activeSub) {
            console.log('🎉 SUCCESS: Subscription record exists and is active.');
        } else {
            throw new Error('Subscription verification failed.');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

testSubscriptionFlow();
