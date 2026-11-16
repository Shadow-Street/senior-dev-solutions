require('./helpers');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const EmailService = require('../src/services/EmailService');

const saved = { app: process.env.PUBLIC_APP_URL, fe: process.env.FRONTEND_URL, env: process.env.NODE_ENV };
afterEach(() => {
  process.env.PUBLIC_APP_URL = saved.app;
  if (saved.fe === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = saved.fe;
  process.env.NODE_ENV = saved.env;
});

test('appLink builds from PUBLIC_APP_URL, trimming a trailing slash', () => {
  process.env.PUBLIC_APP_URL = 'http://98.87.150.151/';
  assert.equal(EmailService.appLink('/AdvisorDashboard'), 'http://98.87.150.151/AdvisorDashboard');
});

test('appLink falls back to FRONTEND_URL, then the dev server outside production', () => {
  process.env.PUBLIC_APP_URL = '';
  process.env.FRONTEND_URL = 'https://protocall.in';
  assert.equal(EmailService.appLink('/AdvisorDashboard'), 'https://protocall.in/AdvisorDashboard');
  delete process.env.FRONTEND_URL;
  assert.equal(EmailService.appLink('/x'), 'http://localhost:5173/x');
});

test('appLink gives no link in production when nothing is configured, or for a non-web scheme', () => {
  process.env.PUBLIC_APP_URL = '';
  delete process.env.FRONTEND_URL;
  process.env.NODE_ENV = 'production';
  assert.equal(EmailService.appLink('/x'), null);
  process.env.PUBLIC_APP_URL = 'javascript:alert(1)';
  assert.equal(EmailService.appLink('/x'), null);
});

test('approval without a configured link tells the advisor where to go instead', () => {
  process.env.PUBLIC_APP_URL = '';
  delete process.env.FRONTEND_URL;
  process.env.NODE_ENV = 'production';
  const html = EmailService.getAdvisorReviewTemplate('approve', 'Armaan');
  assert.ok(!html.includes('href='));
  assert.match(html, /Advisor Dashboard/);
});
