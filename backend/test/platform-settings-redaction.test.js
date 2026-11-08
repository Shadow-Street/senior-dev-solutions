const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isSecretKey } = require('../src/routes/platform.routes');

// Regression: platform settings are readable anonymously (footer, contact
// page) with secrets blanked by key name. The API Credentials screen stores
// *_api_key rows, which the pattern missed, so they would have been public.
test('API keys and secrets are redacted for non-staff; publishable values are not', () => {
  for (const k of ['stock_data_api_key', 'news_api_key', 'google_maps_api_key', 'razorpay_key_secret',
    'razorpay_webhook_secret', 'smtp_password', 'some_access_token', 'stripe_secret_key',
    // names a future credentials screen might use
    'twilio_auth_token', 'whatsapp_token', 'telegram_bot_token', 'slack_webhook_url', 'openai_key',
    'sendgrid_key', 'encryption_key', 'jwt_signing_key', 'aws_credentials', 'apiKey', 'openaiApiKey']) {
    assert.equal(isSecretKey(k), true, k);
  }
  for (const k of ['razorpay_key_id', 'stripe_publishable_key', 'site_name', 'contact_email', 'facebook_url',
    'social_link_instagram', 'ads_enabled', 'company_address', 'contact_phone']) {
    assert.equal(isSecretKey(k), false, k);
  }
});
