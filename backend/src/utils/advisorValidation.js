/**
 * Input validation for the advisor journey (applications, profile, plans,
 * posts, recommendations).
 *
 * Every validator returns `{ error }` for a client mistake or `{ value }` with
 * a fresh object holding ONLY the whitelisted, normalised fields. Callers write
 * `value`, never `req.body`, so a field that is not named here cannot reach the
 * database (status, verified, advisor_id, user_id, counters, ratings ...).
 */

// SEBI registration numbers are "IN" + a category letter + nine digits
// (INA = investment adviser, INH = research analyst, INZ = stock broker, ...).
const { certificateKey, publicImageKey } = require('./storageKeys');

const SEBI_RE = /^IN[A-Z]\d{9}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ADVISOR_STATUSES = ['pending_approval', 'approved', 'rejected', 'suspended'];
const POST_VISIBILITY = ['public', 'subscribers'];
const POST_STATUSES = ['draft', 'published'];
const POST_TYPES = ['recommendation', 'analysis', 'update', 'educational'];
const RECOMMENDATION_TYPES = ['buy', 'sell', 'hold'];
const PLAN_INTERVALS = { monthly: 'month', quarterly: 'quarter', yearly: 'year', month: 'month', quarter: 'quarter', year: 'year' };

const MAX_PLANS_PER_ADVISOR = 3;
const MIN_PLAN_PRICE = 1;
const MAX_PLAN_PRICE = 1000000;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trimmed string without control characters, or null when it is not a string. */
const cleanText = (v) => (typeof v === 'string' ? v.replace(CONTROL_CHARS, '').trim() : null);

/** Reads an optional text field. Returns { skip } when absent, { error } or { value }. */
function text(body, key, label, { min = 0, max, required = false } = {}) {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (required) return { error: `${label} is required` };
    // Absent -> leave alone; explicit null / empty string -> clear the field.
    return raw === undefined ? { skip: true } : { value: null };
  }
  const v = cleanText(raw);
  if (v === null) return { error: `${label} must be text` };
  if (v.length < min) return { error: `${label} must be at least ${min} characters` };
  if (v.length > max) return { error: `${label} must be at most ${max} characters` };
  if (required && v.length === 0) return { error: `${label} is required` };
  return { value: v };
}

/** Runs a list of [key, label, opts, transform?] specs into `out`; returns the first error. */
function collect(body, specs, out) {
  for (const [key, label, opts, transform] of specs) {
    const r = text(body, key, label, opts);
    if (r.error) return r.error;
    if (!r.skip) out[key] = r.value !== null && transform ? transform(r.value) : r.value;
  }
  return null;
}

/** Up to eight short labels; accepts an array or a comma separated string. */
function specialization(raw) {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null;
  if (!list) return { error: 'Expertise must be a list' };
  const out = [];
  for (const item of list) {
    const v = cleanText(item);
    if (v === null) return { error: 'Expertise must be a list of text values' };
    if (!v) continue;
    if (v.length > 40) return { error: 'Each expertise entry must be at most 40 characters' };
    if (!out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  if (out.length > 8) return { error: 'Choose at most 8 areas of expertise' };
  return { value: out };
}

/** Application (create, or re-apply after rejection). */
function validateApplication(body, userId, hosts = new Set()) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  const err = collect(b, [
    ['display_name', 'Name', { min: 2, max: 100, required: true }],
    ['bio', 'Bio', { min: 10, max: 2000, required: true }],
  ], out);
  if (err) return { error: err };

  const sebi = text(b, 'sebi_registration_number', 'SEBI registration number', { required: true, max: 20 });
  if (sebi.error) return { error: sebi.error };
  const sebiValue = sebi.value.replace(/\s+/g, '').toUpperCase();
  if (!SEBI_RE.test(sebiValue)) {
    return { error: 'SEBI registration number must look like INA000012345 (IN, a letter, then 9 digits)' };
  }
  out.sebi_registration_number = sebiValue;

  // A storage key (preferred) or, for older clients, the upload URL. Either is
  // reduced to the key of one of the applicant's own certificate uploads.
  const rawDoc = b.sebi_document_key !== undefined ? b.sebi_document_key : b.sebi_document_url;
  if (rawDoc === undefined || rawDoc === null || rawDoc === '') return { error: 'SEBI certificate is required' };
  const key = certificateKey(cleanText(rawDoc), userId, hosts);
  if (!key) return { error: 'Upload your SEBI certificate again - the file must be one you uploaded yourself' };
  // Stored in the existing sebi_document_url column, as a key.
  out.sebi_document_url = key;

  if (b.specialization !== undefined) {
    const s = specialization(b.specialization);
    if (s.error) return { error: s.error };
    out.specialization = s.value;
  }
  return { value: out };
}

/**
 * Self-service profile edit. The SEBI number and certificate are NOT editable
 * once approved (they are what the admin verified); status/verified/ratings are
 * never editable here.
 */
function validateProfileUpdate(body, advisor, hosts = new Set()) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  const err = collect(b, [
    ['display_name', 'Name', { min: 2, max: 100 }],
    ['bio', 'Bio', { min: 10, max: 2000 }],
  ], out);
  if (err) return { error: err };
  if (b.display_name === '') return { error: 'Name is required' };

  if (b.specialization !== undefined) {
    const s = specialization(b.specialization);
    if (s.error) return { error: s.error };
    out.specialization = s.value;
  }

  // Photos must be our own public uploads (stored as keys; the route turns them
  // into URLs). Anything else would be rendered in the admin panel.
  for (const field of ['profile_image_url', 'avatar_url']) {
    if (b[field] === undefined) continue;
    if (b[field] === null || b[field] === '') { out[field] = null; continue; }
    const k = publicImageKey(cleanText(b[field]), hosts);
    if (!k) return { error: 'Profile image must be an image uploaded through the site' };
    out[field] = k;
  }

  if (b.sebi_registration_number !== undefined) {
    const locked = advisor && advisor.status === 'approved';
    const v = cleanText(b.sebi_registration_number);
    const next = v ? v.replace(/\s+/g, '').toUpperCase() : '';
    if (locked) {
      if (next !== String(advisor.sebi_registration_number || '').toUpperCase()) {
        return { error: 'Your SEBI registration number cannot be changed after approval. Contact support.' };
      }
    } else {
      if (!SEBI_RE.test(next)) return { error: 'SEBI registration number must look like INA000012345' };
      out.sebi_registration_number = next;
    }
  }
  if (Object.keys(out).length === 0) return { error: 'Nothing to update' };
  return { value: out };
}

/** Money: a finite number with at most two decimals inside [min, max]. */
function money(raw, label, { min, max }) {
  if (raw === undefined || raw === null || raw === '' || typeof raw === 'boolean') return { error: `${label} is required` };
  if (typeof raw !== 'number' && typeof raw !== 'string') return { error: `${label} must be a number` };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { error: `${label} must be a number` };
  if (Math.round(n * 100) / 100 !== n) return { error: `${label} can have at most two decimal places` };
  if (n < min || n > max) return { error: `${label} must be between ${min} and ${max}` };
  return { value: n };
}

/** Plan create / update. `partial` skips required checks for PUT. */
function validatePlan(body, { partial = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  const err = collect(b, [
    ['name', 'Plan name', { min: 2, max: 60, required: !partial }],
    ['description', 'Description', { max: 500 }],
  ], out);
  if (err) return { error: err };
  if (out.name === null) return { error: 'Plan name is required' };

  if (!partial || b.price !== undefined) {
    const p = money(b.price, 'Price', { min: MIN_PLAN_PRICE, max: MAX_PLAN_PRICE });
    if (p.error) return { error: p.error };
    out.price = p.value;
    // The checkout reads price (advisor plans have one price); keep the mirror in step.
    out.price_monthly = p.value;
  }

  const rawInterval = b.interval !== undefined ? b.interval : b.billing_interval;
  if (rawInterval !== undefined) {
    const mapped = PLAN_INTERVALS[String(rawInterval).toLowerCase()];
    if (!mapped) return { error: 'Billing interval must be monthly, quarterly or yearly' };
    out.interval = mapped;
  } else if (!partial) {
    out.interval = 'month';
  }

  if (b.features !== undefined || !partial) {
    if (!Array.isArray(b.features)) return { error: 'Add at least one feature' };
    const feats = [];
    for (const f of b.features) {
      const v = cleanText(f);
      if (v === null) return { error: 'Features must be text' };
      if (!v) continue;
      if (v.length > 120) return { error: 'Each feature must be at most 120 characters' };
      feats.push(v);
    }
    if (feats.length === 0) return { error: 'Add at least one feature' };
    if (feats.length > 12) return { error: 'A plan can list at most 12 features' };
    out.features = feats;
  }

  if (b.is_active !== undefined) {
    if (typeof b.is_active !== 'boolean') return { error: 'is_active must be true or false' };
    out.is_active = b.is_active;
  }
  if (partial && Object.keys(out).length === 0) return { error: 'Nothing to update' };
  return { value: out };
}

/** Optional price level: number > 0 or empty. */
function level(raw, label) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { value: null };
  const m = money(raw, label, { min: 0.01, max: 100000000 });
  return m.error ? m : { value: m.value };
}

/** Post create / update. `planIds` is the advisor's own plan ids. */
function validatePost(body, planIds, { partial = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  const err = collect(b, [
    ['title', 'Title', { min: 3, max: 200, required: !partial }],
    ['content', 'Content', { min: 1, max: 10000, required: !partial }],
    ['stock_symbol', 'Stock symbol', { max: 32 }, (v) => v.toUpperCase()],
    ['time_horizon', 'Time horizon', { max: 64 }],
  ], out);
  if (err) return { error: err };
  if (out.title === null) return { error: 'Title is required' };
  if (out.content === null) return { error: 'Content is required' };
  if (out.stock_symbol && !/^[A-Z0-9&.\-_^]+$/.test(out.stock_symbol)) {
    return { error: 'Stock symbol contains invalid characters' };
  }

  if (b.post_type !== undefined) {
    if (!POST_TYPES.includes(b.post_type)) return { error: 'Unknown post type' };
    out.post_type = b.post_type;
  }
  if (b.recommendation_type !== undefined && b.recommendation_type !== '' && b.recommendation_type !== null) {
    const rt = String(b.recommendation_type).toLowerCase();
    if (!RECOMMENDATION_TYPES.includes(rt)) return { error: 'Recommendation must be buy, sell or hold' };
    out.recommendation_type = rt;
  } else if (b.recommendation_type !== undefined) {
    out.recommendation_type = null;
  }

  for (const [key, label] of [['target_price', 'Target price'], ['stop_loss', 'Stop loss']]) {
    const r = level(b[key], label);
    if (r.error) return { error: r.error };
    if (!r.skip) out[key] = r.value;
  }

  if (b.visibility !== undefined) {
    if (!POST_VISIBILITY.includes(b.visibility)) return { error: 'Visibility must be public or subscribers' };
    out.visibility = b.visibility;
  } else if (!partial) {
    out.visibility = 'subscribers';
  }

  if (b.required_plan_id !== undefined) {
    if (b.required_plan_id === null || b.required_plan_id === '') {
      out.required_plan_id = null;
    } else if (typeof b.required_plan_id !== 'string' || !UUID_RE.test(b.required_plan_id)
      || !planIds.includes(b.required_plan_id)) {
      return { error: 'Choose one of your own plans' };
    } else {
      out.required_plan_id = b.required_plan_id;
    }
  }
  if (b.status !== undefined) {
    if (!POST_STATUSES.includes(b.status)) return { error: 'Status must be draft or published' };
    out.status = b.status;
  } else if (!partial) {
    out.status = 'published';
  }

  // A public post has no tier: tying it to a plan would contradict "everyone".
  if (out.visibility === 'public') out.required_plan_id = null;

  if (partial && Object.keys(out).length === 0) return { error: 'Nothing to update' };
  return { value: out };
}

const REC_ACTIONS = ['buy', 'sell', 'hold'];

/** Stock recommendation create / update. */
function validateRecommendation(body, { partial = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  const err = collect(b, [
    ['stock_symbol', 'Stock symbol', { min: 1, max: 32, required: !partial }, (v) => v.toUpperCase()],
    ['reason', 'Reason', { max: 2000 }],
    ['timeframe', 'Timeframe', { max: 64 }],
  ], out);
  if (err) return { error: err };
  if (out.stock_symbol === null) return { error: 'Stock symbol is required' };
  if (out.stock_symbol && !/^[A-Z0-9&.\-_^]+$/.test(out.stock_symbol)) {
    return { error: 'Stock symbol contains invalid characters' };
  }
  if (b.action !== undefined || !partial) {
    const a = String(b.action || '').toLowerCase();
    if (!REC_ACTIONS.includes(a)) return { error: 'Action must be buy, sell or hold' };
    out.action = a;
  }
  for (const [key, label] of [['target_price', 'Target price'], ['stop_loss', 'Stop loss']]) {
    const r = level(b[key], label);
    if (r.error) return { error: r.error };
    if (!r.skip) out[key] = r.value;
  }
  if (b.confidence !== undefined && b.confidence !== null && b.confidence !== '') {
    const c = Number(b.confidence);
    if (!Number.isInteger(c) || c < 0 || c > 100) return { error: 'Confidence must be a whole number from 0 to 100' };
    out.confidence = c;
  }
  if (b.status !== undefined) {
    if (!['active', 'closed', 'target_hit', 'stop_loss_hit'].includes(b.status)) return { error: 'Unknown status' };
    out.status = b.status;
  } else if (!partial) {
    out.status = 'active';
  }
  if (partial && Object.keys(out).length === 0) return { error: 'Nothing to update' };
  return { value: out };
}

module.exports = {
  SEBI_RE,
  UUID_RE,
  ADVISOR_STATUSES,
  POST_VISIBILITY,
  MAX_PLANS_PER_ADVISOR,
  cleanText,
  validateApplication,
  validateProfileUpdate,
  validatePlan,
  validatePost,
  validateRecommendation,
};
