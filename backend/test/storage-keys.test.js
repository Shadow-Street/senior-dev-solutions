const { test } = require('node:test');
const assert = require('node:assert/strict');
const { certificateKeyRe } = require('../src/utils/storageKeys');

const uid = '11111111-1111-4111-8111-111111111111';

test('certificate keys must name a file, never a dot path', () => {
  const re = certificateKeyRe(uid);
  assert.ok(re.test(`private/${uid}/sebi-certificates/cert-2026.pdf`));
  for (const name of ['..', '.', '...', 'a..b.pdf', '../x.pdf']) {
    assert.equal(re.test(`private/${uid}/sebi-certificates/${name}`), false, name);
  }
});
