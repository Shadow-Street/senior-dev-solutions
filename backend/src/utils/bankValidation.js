/**
 * Input validation for advisor bank accounts and withdrawal amounts.
 * Pure functions: each returns { value } or { errors: { field: message } }.
 */

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_RE = /^\d{9,18}$/;
const HOLDER_NAME_RE = /^[A-Za-z][A-Za-z .'&-]*$/;
const BANK_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 .,'&()/-]*$/;
const ACCOUNT_TYPES = ['savings', 'current'];

const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/**
 * `partial` (updates) validates only the keys present; account_number is
 * optional there because the stored number is never sent back to the client.
 */
function validateBankAccountInput(body, { partial = false } = {}) {
  const errors = {};
  const value = {};
  const src = body && typeof body === 'object' ? body : {};
  const has = (k) => Object.prototype.hasOwnProperty.call(src, k) && src[k] !== undefined;
  const need = (k) => !partial || has(k);

  if (need('account_holder_name')) {
    const name = clean(src.account_holder_name);
    if (name.length < 2 || name.length > 100) errors.account_holder_name = 'Account holder name must be 2 to 100 characters';
    else if (!HOLDER_NAME_RE.test(name)) errors.account_holder_name = 'Account holder name may contain letters, spaces and . \' & - only';
    else value.account_holder_name = name;
  }

  if (need('bank_name')) {
    const bank = clean(src.bank_name);
    if (bank.length < 2 || bank.length > 100) errors.bank_name = 'Bank name must be 2 to 100 characters';
    else if (!BANK_NAME_RE.test(bank)) errors.bank_name = 'Bank name contains invalid characters';
    else value.bank_name = bank;
  }

  if (need('ifsc')) {
    const ifsc = typeof src.ifsc === 'string' ? src.ifsc.trim().toUpperCase() : '';
    if (!IFSC_RE.test(ifsc)) errors.ifsc = 'IFSC must be 11 characters: 4 letters, a 0, then 6 letters or digits';
    else value.ifsc = ifsc;
  }

  if (need('account_type')) {
    const type = typeof src.account_type === 'string' ? src.account_type.trim().toLowerCase() : '';
    if (!ACCOUNT_TYPES.includes(type)) errors.account_type = 'Account type must be savings or current';
    else value.account_type = type;
  }

  // Digits only, 9-18 long. A number is accepted as a string or an integer-valued
  // number is NOT accepted: JSON numbers lose leading zeros.
  if (!partial || has('account_number')) {
    const raw = src.account_number;
    const num = typeof raw === 'string' ? raw.replace(/[\s-]/g, '') : '';
    if (!ACCOUNT_NUMBER_RE.test(num)) errors.account_number = 'Account number must be 9 to 18 digits';
    else value.account_number = num;
  }

  return Object.keys(errors).length ? { errors } : { value };
}

/**
 * Parses a rupee amount to integer paise. Accepts numbers or numeric strings
 * with at most two decimals; rejects NaN, Infinity, zero, negatives and
 * anything above `maxPaise`.
 */
function parseAmountToPaise(input, { maxPaise = 100000000000 } = {}) {
  const s = typeof input === 'number' ? String(input) : typeof input === 'string' ? input.trim() : '';
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) return { error: 'Amount must be a positive number with at most 2 decimals' };
  const paise = Math.round(Number(s) * 100);
  if (!Number.isSafeInteger(paise) || paise <= 0) return { error: 'Amount must be greater than zero' };
  if (paise > maxPaise) return { error: 'Amount is too large' };
  return { paise };
}

module.exports = { validateBankAccountInput, parseAmountToPaise, IFSC_RE, ACCOUNT_NUMBER_RE };
