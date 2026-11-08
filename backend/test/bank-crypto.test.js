const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');
const crypto = require('crypto');
const {
  encryptBankValue, decryptBankValue, isBankCryptoAvailable, BankCryptoUnavailableError, maskAccountNumber,
} = require('../src/utils/bankCrypto');
const { validateBankAccountInput, parseAmountToPaise } = require('../src/utils/bankValidation');

const KEY_B64 = crypto.randomBytes(32).toString('base64');
const saved = process.env.BANK_DATA_KEY;
beforeEach(() => { process.env.BANK_DATA_KEY = KEY_B64; });
afterEach(() => { if (saved === undefined) delete process.env.BANK_DATA_KEY; else process.env.BANK_DATA_KEY = saved; });

test('encryption round-trips and the ciphertext does not contain the plaintext', () => {
  const ct = encryptBankValue('123456789012', 'user-1');
  assert.ok(ct.startsWith('v1:'));
  assert.ok(!ct.includes('123456789012'));
  assert.equal(decryptBankValue(ct, 'user-1'), '123456789012');
});

test('every encryption uses a fresh IV', () => {
  assert.notEqual(encryptBankValue('123456789012', 'u'), encryptBankValue('123456789012', 'u'));
});

test('a ciphertext copied onto another user does not decrypt (AAD binding)', () => {
  const ct = encryptBankValue('123456789012', 'user-1');
  assert.throws(() => decryptBankValue(ct, 'user-2'));
});

test('tampered ciphertext is rejected', () => {
  const ct = encryptBankValue('123456789012', 'u');
  const buf = Buffer.from(ct.slice(3), 'base64');
  buf[buf.length - 1] ^= 1;
  assert.throws(() => decryptBankValue(`v1:${buf.toString('base64')}`, 'u'));
});

test('hex and base64 keys are both accepted, other lengths are not', () => {
  process.env.BANK_DATA_KEY = crypto.randomBytes(32).toString('hex');
  assert.equal(isBankCryptoAvailable(), true);
  process.env.BANK_DATA_KEY = crypto.randomBytes(16).toString('base64');
  assert.equal(isBankCryptoAvailable(), false);
  process.env.BANK_DATA_KEY = 'short';
  assert.equal(isBankCryptoAvailable(), false);
});

test('a missing key fails closed: encrypt and decrypt both throw, never fall back', () => {
  delete process.env.BANK_DATA_KEY;
  assert.equal(isBankCryptoAvailable(), false);
  assert.throws(() => encryptBankValue('123456789012', 'u'), BankCryptoUnavailableError);
  assert.throws(() => decryptBankValue('v1:AAAA', 'u'), BankCryptoUnavailableError);
});

test('mask exposes only the last four digits', () => {
  assert.equal(maskAccountNumber('6789'), 'XXXXXXXX6789');
});

const good = { account_holder_name: 'Asha Rao', bank_name: 'HDFC Bank', ifsc: 'hdfc0001234', account_type: 'savings', account_number: '1234 5678 9012' };

test('valid bank input is normalised (IFSC upper-cased, spaces stripped)', () => {
  const r = validateBankAccountInput(good);
  assert.equal(r.errors, undefined);
  assert.equal(r.value.ifsc, 'HDFC0001234');
  assert.equal(r.value.account_number, '123456789012');
});

for (const [label, patch, field] of [
  ['IFSC wrong fifth character', { ifsc: 'HDFC1001234' }, 'ifsc'],
  ['IFSC too short', { ifsc: 'HDFC000123' }, 'ifsc'],
  ['account number too short', { account_number: '12345678' }, 'account_number'],
  ['account number too long', { account_number: '1'.repeat(19) }, 'account_number'],
  ['account number with letters', { account_number: '12345678A' }, 'account_number'],
  ['numeric (not string) account number', { account_number: 123456789012 }, 'account_number'],
  ['bad account type', { account_type: 'joint' }, 'account_type'],
  ['empty holder', { account_holder_name: ' ' }, 'account_holder_name'],
  ['holder with digits', { account_holder_name: 'Asha 99' }, 'account_holder_name'],
  ['missing bank name', { bank_name: undefined }, 'bank_name'],
]) {
  test(`rejects ${label}`, () => {
    const r = validateBankAccountInput({ ...good, ...patch });
    assert.ok(r.errors && r.errors[field], JSON.stringify(r));
  });
}

test('partial validation only checks supplied fields', () => {
  assert.equal(validateBankAccountInput({ bank_name: 'ICICI Bank' }, { partial: true }).value.bank_name, 'ICICI Bank');
  assert.ok(validateBankAccountInput({ ifsc: 'bad' }, { partial: true }).errors.ifsc);
});

for (const bad of [0, -5, '0', '-1', 'abc', '', null, undefined, NaN, Infinity, '1.234', '1e3', 0.1 + 0.2, {}, [5], '12345678901234']) {
  test(`amount ${JSON.stringify(bad)} is rejected`, () => {
    assert.ok(parseAmountToPaise(bad).error);
  });
}
test('amounts parse to integer paise', () => {
  assert.equal(parseAmountToPaise('1500.50').paise, 150050);
  assert.equal(parseAmountToPaise(100).paise, 10000);
  assert.equal(parseAmountToPaise('0.01').paise, 1);
});
