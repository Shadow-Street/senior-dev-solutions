/**
 * Date handling for the Financials reports. Protocall reports in India time:
 * a "day" or "month" is an Asia/Kolkata (UTC+05:30, no DST) calendar day/month.
 *
 *   ?from=2026-10-01&to=2026-10-31  ->  [01 Oct 00:00 IST, 31 Oct 23:59:59.999 IST]
 */

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 3600 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

class RangeError400 extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

/** Start of the IST day named by 'YYYY-MM-DD', as a Date (or null when invalid). */
function istDayStart(text) {
  const m = DATE_RE.exec(String(text || ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = Date.UTC(y, mo - 1, d);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return new Date(utc - IST_OFFSET_MS);
}

/**
 * Parses ?from&to. Both optional; when given they must be valid dates and
 * from <= to. Throws RangeError400 with a safe message.
 */
function parseRange(query = {}, { required = false, maxDays = null } = {}) {
  const { from: fromText, to: toText } = query;
  if (required && (!fromText || !toText)) throw new RangeError400('Choose a start and end date');
  let from = null;
  let to = null;
  if (fromText) {
    from = istDayStart(fromText);
    if (!from) throw new RangeError400('Start date must be YYYY-MM-DD');
  }
  if (toText) {
    const start = istDayStart(toText);
    if (!start) throw new RangeError400('End date must be YYYY-MM-DD');
    to = new Date(start.getTime() + DAY_MS - 1);
  }
  if (from && to && from > to) throw new RangeError400('Start date must be on or before the end date');
  if (maxDays && from && to && (to - from) > maxDays * DAY_MS) {
    throw new RangeError400(`Choose a range of at most ${maxDays} days`);
  }
  return { from, to, fromText: fromText || null, toText: toText || null };
}

/** 'YYYY-MM' of a date in IST. */
function istMonthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 7);
}

/** Every 'YYYY-MM' from the month of `from` to the month of `to`, inclusive. */
function monthKeysBetween(from, to) {
  const start = istMonthKey(from);
  const end = istMonthKey(to);
  if (!start || !end) return [];
  const keys = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    if (keys.length > 240) break; // 20 years: a guard, not a limit anyone hits
  }
  return keys;
}

const inRange = (date, from, to) => {
  if (!from && !to) return true;
  if (!date) return false;
  const t = (date instanceof Date ? date : new Date(date)).getTime();
  if (Number.isNaN(t)) return false;
  return (!from || t >= from.getTime()) && (!to || t <= to.getTime());
};

module.exports = { istDayStart, parseRange, istMonthKey, monthKeysBetween, inRange, RangeError400, IST_OFFSET_MS, DAY_MS };
