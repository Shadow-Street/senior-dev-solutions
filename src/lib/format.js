/**
 * Safe formatters for money and dates.
 *
 * API fields arrive as DECIMAL strings, numbers, null or simply absent (a Free
 * subscription has no end date and no price; an older row may lack a field a newer
 * response has). Calling `.toLocaleString()` or `format(new Date(x))` directly on
 * those crashed whole pages ("Cannot read properties of undefined"). These never
 * throw and never print NaN / Invalid Date: they return a placeholder instead.
 */

export const PLACEHOLDER = '—';

/** A finite number, or null. Accepts numbers and numeric strings ("999.00"). */
export function toNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null; // not {}, [], booleans, null
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Rupee text: ₹1,499 (whole amounts) or ₹499.50. Missing or non-numeric -> placeholder.
 * `currency` other than INR uses the Intl currency formatter.
 */
export function formatINR(value, { placeholder = PLACEHOLDER, currency = 'INR', alwaysDecimals = false } = {}) {
  const n = toNumber(value);
  if (n === null) return placeholder;
  const decimals = alwaysDecimals || !Number.isInteger(n) ? 2 : 0;
  if (currency !== 'INR') {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: 2 }).format(n);
    } catch {
      /* unknown currency code: fall through to rupees */
    }
  }
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
}

/** A plain number with Indian digit grouping (credits, counts). */
export function formatNumber(value, { placeholder = PLACEHOLDER } = {}) {
  const n = toNumber(value);
  return n === null ? placeholder : n.toLocaleString('en-IN');
}

/** A valid Date, or null. */
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 5 Nov 2026. Missing or invalid -> placeholder. */
export function formatDate(value, { placeholder = PLACEHOLDER } = {}) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder;
}

/** 5 Nov 2026, 3:42 pm. */
export function formatDateTime(value, { placeholder = PLACEHOLDER } = {}) {
  const d = toDate(value);
  return d
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : placeholder;
}

/** Whole days from now until `value` (negative once past); null when unknown. */
export function daysUntil(value, now = new Date()) {
  const d = toDate(value);
  return d ? Math.ceil((d.getTime() - now.getTime()) / 86400000) : null;
}
