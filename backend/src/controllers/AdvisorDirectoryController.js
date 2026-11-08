/**
 * Read side of advisor profiles: the public directory and a single profile.
 *
 * The raw advisors table holds things only the owner and staff may see (the
 * private SEBI certificate URL, the rejection reason, lifetime earnings, the
 * owning user id) and rows that must not be public at all (pending, rejected
 * and suspended applicants). Both the old `GET /api/advisors` and the generic
 * `GET /api/users/advisors[/:id]` returned all of it to anonymous callers, so
 * every applicant's documents and review outcome were world-readable.
 *
 *   staff       -> any status, full row
 *   the owner   -> their own row, any status, full row
 *   everyone    -> approved advisors only, public fields + derived figures
 */
const { Op, fn, col } = require('sequelize');
const db = require('../models');
const { ownHosts, certificateKey } = require('../utils/storageKeys');

const STAFF = ['admin', 'super_admin', 'sub_admin'];
const isStaff = (user) => STAFF.includes(user?.app_role || user?.role);

const PUBLIC_FIELDS = [
  'id', 'display_name', 'name', 'bio', 'avatar_url', 'profile_image_url', 'specialization',
  'status', 'verified', 'sebi_registration_number', 'rating', 'total_clients',
  'follower_count', 'success_rate', 'created_at', 'updated_at',
];
const SORTS = { follower_count: 'follower_count', rating: 'rating', created_at: 'created_at', display_name: 'display_name' };

const plain = (row) => (row && typeof row.toJSON === 'function' ? row.toJSON() : { ...row });

function toPublic(row, extra = {}) {
  const r = plain(row);
  const out = {};
  for (const k of PUBLIC_FIELDS) if (r[k] !== undefined) out[k] = r[k];
  out.created_date = r.created_at;
  out.updated_date = r.updated_at;
  return { ...out, ...extra };
}

/** Escapes LIKE wildcards so a search for "100%" is literal. */
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Derived figures for a page of advisors, from two bounded queries:
 *   starting_price / plan_interval  cheapest active plan
 *   avg_rating / review_count       approved reviews
 */
async function derivedFor(ids) {
  const out = new Map(ids.map((id) => [id, { starting_price: null, plan_interval: null, avg_rating: 0, review_count: 0 }]));
  if (ids.length === 0) return out;
  try {
    const plans = await db.SubscriptionPlan.findAll({
      where: { advisor_id: { [Op.in]: ids }, is_active: true },
      attributes: ['advisor_id', 'price', 'interval'],
    });
    for (const p of plans) {
      const d = out.get(p.advisor_id);
      const price = Number(p.price);
      if (d && Number.isFinite(price) && (d.starting_price === null || price < d.starting_price)) {
        d.starting_price = price;
        d.plan_interval = p.interval || 'month';
      }
    }
  } catch (e) {
    console.error('[advisor directory] plan lookup failed:', e.message);
  }
  try {
    const rows = await db.Review.findAll({
      where: { entity_type: 'advisor', entity_id: { [Op.in]: ids }, status: 'approved' },
      attributes: ['entity_id', [fn('AVG', col('rating')), 'avg_rating'], [fn('COUNT', col('id')), 'review_count']],
      group: ['entity_id'],
      raw: true,
    });
    for (const r of rows) {
      const d = out.get(r.entity_id);
      if (d) {
        d.avg_rating = Math.round(Number(r.avg_rating || 0) * 10) / 10;
        d.review_count = Number(r.review_count || 0);
      }
    }
  } catch (e) {
    console.error('[advisor directory] review lookup failed:', e.message);
  }
  return out;
}

async function list(req, res) {
  try {
    const q = req.query || {};
    const staff = isStaff(req.user);
    const limit = Math.min(Math.max(Number.parseInt(q.limit, 10) || 50, 1), staff ? 200 : 100);
    const offset = Math.max(Number.parseInt(q.offset, 10) || 0, 0);
    const where = {};

    const ownLookup = req.user?.id && typeof q.user_id === 'string' && q.user_id === String(req.user.id);
    if (staff) {
      if (typeof q.status === 'string' && q.status && q.status !== 'all') where.status = q.status;
      if (typeof q.user_id === 'string' && q.user_id) where.user_id = q.user_id;
    } else if (ownLookup) {
      // The applicant checking their own application, whatever its status.
      where.user_id = String(req.user.id);
    } else {
      where.status = 'approved';
    }

    const and = [];
    if (typeof q.q === 'string' && q.q.trim()) {
      const term = `%${likeEscape(q.q.trim().slice(0, 80))}%`;
      and.push({ [Op.or]: [{ display_name: { [Op.like]: term } }, { bio: { [Op.like]: term } }] });
    }
    if (typeof q.specialization === 'string' && q.specialization.trim() && q.specialization !== 'all') {
      and.push({ specialization: { [Op.like]: `%${likeEscape(q.specialization.trim().slice(0, 40))}%` } });
    }
    if (and.length) where[Op.and] = and;

    // The public directory ranks by popularity; the admin / own-application views
    // are newest first by default, so a fresh applicant is never pushed off the
    // first page by older, more-followed advisors.
    const privileged = staff || ownLookup;
    const requested = String(q.sort || '').replace(/^[-+]/, '');
    const sortKey = SORTS[requested] || (privileged ? 'created_at' : 'follower_count');
    const direction = String(q.sort || '').startsWith('+') || q.order === 'asc' ? 'ASC' : 'DESC';

    const rows = await db.Advisor.findAll({ where, order: [[sortKey, direction], ['created_at', 'DESC']], limit, offset });

    if (staff || ownLookup) {
      const hosts = ownHosts(req);
      return res.json(rows.map(plain).map((r) => withDates(r, hosts)));
    }

    const derived = await derivedFor(rows.map((r) => r.id));
    return res.json(rows.map((r) => toPublic(r, derived.get(r.id))));
  } catch (error) {
    console.error('[advisor directory] list failed:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Staff and the owner also get the storage key of the certificate (null when
// the stored value is not one of the owner's own uploads on this host).
const withDates = (r, hosts = new Set()) => ({
  ...r,
  sebi_document_key: certificateKey(r.sebi_document_url, r.user_id, hosts),
  created_date: r.created_at,
  updated_date: r.updated_at,
});

async function get(req, res) {
  try {
    const row = await db.Advisor.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Advisor not found' });

    const owner = req.user?.id && String(row.user_id) === String(req.user.id);
    if (isStaff(req.user) || owner) return res.json(withDates(plain(row), ownHosts(req)));

    // Not approved is indistinguishable from not existing.
    if (row.status !== 'approved') return res.status(404).json({ error: 'Advisor not found' });
    const derived = await derivedFor([row.id]);
    return res.json(toPublic(row, derived.get(row.id)));
  } catch (error) {
    console.error('[advisor directory] get failed:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { list, get, toPublic, isStaff, STAFF };
