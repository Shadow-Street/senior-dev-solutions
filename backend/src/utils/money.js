/**
 * Money helpers for reporting. Every total the Financials screens show is
 * summed in integer paise, never by adding rupee floats.
 *
 * DECIMAL columns arrive from mysql2 as strings ("999.00"); a decimal string
 * is converted exactly (no float multiplication), numbers are rounded to the
 * nearest paisa.
 */

const DECIMAL_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

/** Integer paise for a DECIMAL string / number; 0 for null, '' or junk. */
function toPaise(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) : 0;
  const m = DECIMAL_RE.exec(String(value).trim());
  if (!m) return 0;
  const [, neg, whole, frac = ''] = m;
  const padded = (frac + '000').slice(0, 3);
  let paise = Number(whole) * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) paise += 1; // half away from zero on the third decimal
  return neg ? -paise : paise;
}

/** Rupees as a number with at most 2 decimals, from integer paise. */
const fromPaise = (paise) => Math.round(Number(paise) || 0) / 100;

/** "1499.00" / "-25.50": exact two-decimal text, for CSV. */
function paiseToText(paise) {
  const p = Math.round(Number(paise) || 0);
  const sign = p < 0 ? '-' : '';
  const abs = Math.abs(p);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Sum of integer paise. */
const sumPaise = (values) => values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);

module.exports = { toPaise, fromPaise, paiseToText, sumPaise };
