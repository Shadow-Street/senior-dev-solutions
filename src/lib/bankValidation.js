import { z } from 'zod';

/** Mirrors backend/src/utils/bankValidation.js; the server is still the authority. */
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_NUMBER_RE = /^\d{9,18}$/;

const holder = z
  .string()
  .trim()
  .min(2, 'Enter the account holder name')
  .max(100, 'Name is too long')
  .regex(/^[A-Za-z][A-Za-z .'&-]*$/, "Use letters, spaces and . ' & - only");

const bankName = z.string().trim().min(2, 'Enter the bank name').max(100, 'Bank name is too long');

const ifsc = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => IFSC_RE.test(v), 'IFSC must be 11 characters, e.g. HDFC0001234');

const accountNumber = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => ACCOUNT_NUMBER_RE.test(v), 'Account number must be 9 to 18 digits');

const accountType = z.enum(['savings', 'current'], { errorMap: () => ({ message: 'Choose savings or current' }) });

/** Add form: every field required, and the number must be re-confirmed. */
export const addBankAccountSchema = z
  .object({
    account_holder_name: holder,
    bank_name: bankName,
    account_number: accountNumber,
    confirm_account_number: z.string(),
    ifsc,
    account_type: accountType,
  })
  .refine((v) => v.confirm_account_number.replace(/[\s-]/g, '') === v.account_number, {
    message: 'Account numbers do not match',
    path: ['confirm_account_number'],
  });

/** Edit form: the stored number is never shown, so replacing it is optional. */
export const editBankAccountSchema = z
  .object({
    account_holder_name: holder,
    bank_name: bankName,
    account_number: z.string().transform((v) => v.replace(/[\s-]/g, '')).refine((v) => v === '' || ACCOUNT_NUMBER_RE.test(v), 'Account number must be 9 to 18 digits'),
    confirm_account_number: z.string(),
    ifsc,
    account_type: accountType,
  })
  .refine((v) => v.account_number === '' || v.confirm_account_number.replace(/[\s-]/g, '') === v.account_number, {
    message: 'Account numbers do not match',
    path: ['confirm_account_number'],
  });

/** Parses a rupee string to paise; returns null when it is not a valid positive amount. */
export function parseRupeesToPaise(input) {
  const s = String(input ?? '').trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) return null;
  const paise = Math.round(Number(s) * 100);
  return paise > 0 ? paise : null;
}

/** Validates a withdrawal amount against the available balance (rupees). Returns an error string or ''. */
export function validateWithdrawalAmount(input, available) {
  const paise = parseRupeesToPaise(input);
  if (paise === null) return 'Enter an amount greater than 0 with at most 2 decimals';
  if (paise > Math.round(Number(available || 0) * 100)) return 'Amount exceeds your available balance';
  return '';
}
