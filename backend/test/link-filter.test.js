const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');
const { linkHosts } = require('../src/services/ChatModerationService');

const UNREADABLE = '\u0000unreadable';

// Security re-review N-1: after the ReDoS fix, explicit links in these shapes
// were silently ignored by the link filter.
test('explicit links are found whatever surrounds them', () => {
  assert.deepEqual(linkHosts('https://user@evil.com'), ['evil.com']);
  assert.deepEqual(linkHosts('http://10.0.0.1/x'), ['10.0.0.1']);
  assert.deepEqual(linkHosts('x,https://evil.com'), ['evil.com']);
  assert.deepEqual(linkHosts('go->https://evil.com'), ['evil.com']);
  assert.deepEqual(linkHosts('https://a.b.c.d.e.f.g.h.i.j.k.l.evil.com'), ['a.b.c.d.e.f.g.h.i.j.k.l.evil.com']);
  assert.deepEqual(linkHosts('https://xn--80ak6aa92e.xn--p1ai'), ['xn--80ak6aa92e.xn--p1ai']);
  assert.deepEqual(linkHosts('https://evil.com​'), ['evil.com']);
  assert.deepEqual(linkHosts('ftp://files.evil.com'), ['files.evil.com']);
  assert.deepEqual(linkHosts('www.evil.com/path'), ['evil.com']);
});

test('an explicit link whose host cannot be read counts as a link (fail closed)', () => {
  assert.deepEqual(linkHosts('https://'), [UNREADABLE]);
  assert.deepEqual(linkHosts('http://%%%'), [UNREADABLE]);
});

test('ordinary text is not treated as links', () => {
  assert.deepEqual(linkHosts('see (https://www.NSEindia.com/x), t.me/pump, evil.xyz. e.g. file.txt'), ['nseindia.com', 't.me', 'evil.xyz']);
  assert.deepEqual(linkHosts('Visit nseindia.com today!'), ['nseindia.com']);
  assert.deepEqual(linkHosts('Target 2,450.50 by Q3; P/E 22.5'), []);
});

test('stays linear on adversarial input (ReDoS regression)', () => {
  const inputs = ['a-'.repeat(5000), 'a.'.repeat(5000), 'a:'.repeat(5000), `http://${'a.'.repeat(4900)}`, 'www.'.repeat(2500)];
  for (const input of inputs) {
    const t = process.hrtime.bigint();
    linkHosts(input);
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    assert.ok(ms < 50, `${input.slice(0, 12)}… took ${ms.toFixed(1)} ms`);
  }
});
