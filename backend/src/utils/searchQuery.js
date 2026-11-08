/**
 * Validation for public stock-search input.
 *
 * `q` feeds SQL LIKE patterns and external provider searches on routes anyone
 * can call, so it is restricted to a short, plain alphabet: letters, digits,
 * space, "&", "." and "-" (enough for "M&M", "BAJAJ-AUTO", "TCS.NS", "tata
 * consultancy"). That also excludes the LIKE wildcards (% and _), so a caller
 * cannot turn a search into a table scan with a bare "%".
 *
 * Returns the trimmed query, or null when it is missing, repeated (q=a&q=b),
 * empty, longer than 50 characters or uses other characters.
 */
const MAX_LENGTH = 50;
const ALLOWED = /^[A-Za-z0-9 &.-]+$/;

function parseSearchQuery(value) {
  if (typeof value !== 'string') return null;
  const q = value.trim();
  if (q.length < 1 || q.length > MAX_LENGTH) return null;
  return ALLOWED.test(q) ? q : null;
}

module.exports = { parseSearchQuery, MAX_SEARCH_QUERY_LENGTH: MAX_LENGTH };
