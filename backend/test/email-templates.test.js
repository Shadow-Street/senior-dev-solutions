const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');
const EmailService = require('../src/services/EmailService');

// PPT slide 5: a user who never subscribed received "Welcome to Premium!
// Thank you for subscribing to our Premium Plan" when their account was created.
test('the account welcome email does not claim a paid plan', () => {
  const html = EmailService.getWelcomeEmailTemplate('Armaan');
  assert.match(html, /Welcome to Protocall/);
  assert.match(html, /Free/);
  assert.doesNotMatch(html, /Premium Plan|Welcome to Premium|subscribing/i);
});

test('the plan-activated email names the actual plan', () => {
  const html = EmailService.getPlanActivatedTemplate('Armaan', 'VIP', { free: true });
  assert.match(html, /Your VIP plan is active/);
  assert.match(html, /nothing was charged/);
  assert.doesNotMatch(html, /Premium/);
});

test('names and plan titles are HTML-escaped', () => {
  const evil = '<img src=x onerror=alert(1)>';
  for (const html of [
    EmailService.getWelcomeEmailTemplate(evil),
    EmailService.getPlanActivatedTemplate(evil, evil),
    EmailService.getPaymentReceiptTemplate(evil, '199', evil, '<b>order</b>'),
  ]) {
    assert.doesNotMatch(html, /<img|<b>order/);
    assert.match(html, /&lt;img/);
  }
});

test('every template escapes the values it interpolates (review M-5)', () => {
  const evil = '<a href="https://evil.example">Verify here</a>';
  const html = [
    EmailService.getOtpTemplate ? EmailService.getOtpTemplate(evil, '123456', 10) : '',
    EmailService.getPasswordResetTemplate(evil, 'https://app.example.test/reset?t=1', 30),
    EmailService.getInvoiceEmailTemplate(evil, evil, '199', '/invoices/1.pdf'),
    EmailService.getAutopaySuccessTemplate ? EmailService.getAutopaySuccessTemplate(evil, '199', new Date()) : '',
    EmailService.getSubscriptionCancelledTemplate ? EmailService.getSubscriptionCancelledTemplate(evil, new Date(), evil) : '',
  ].join('\n');
  assert.doesNotMatch(html, /<a href="https:\/\/evil/);
  assert.match(html, /&lt;a href=&quot;https:\/\/evil/);
});
