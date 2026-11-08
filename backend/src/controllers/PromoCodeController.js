/**
 * Admin CRUD for subscription promo codes (promo_codes table).
 *
 * Replaces the generic CRUD controller, which wrote req.body straight into the
 * model. Writable fields are whitelisted and validated here; usage counters
 * (`uses_count`) and `created_by` are server-controlled.
 *
 * The response uses the real column names, which are also what the admin form
 * reads and writes:
 *   code, discount_percent | discount_amount, max_uses, uses_count,
 *   expires_at, is_active, applicable_to, min_order_amount,
 *   one_time_per_user, applies_to_renewal
 */
const db = require('../models');

const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

const isBlank = (v) => v === undefined || v === null || v === '';

/** Parses a number field. Returns { value } (null when blank) or { error }. */
function num(body, key, { min, max, integer = false } = {}) {
    const raw = body[key];
    if (isBlank(raw)) return { value: null };
    const n = Number(raw);
    if (!Number.isFinite(n)) return { error: `${key} must be a number` };
    if (integer && !Number.isInteger(n)) return { error: `${key} must be a whole number` };
    if (min !== undefined && n < min) return { error: `${key} must be at least ${min}` };
    if (max !== undefined && n > max) return { error: `${key} must be at most ${max}` };
    return { value: n };
}

/**
 * Validates and normalises a create/update payload.
 * With `partial` true only the keys present are checked and returned.
 * Returns { data } or { error }.
 */
function parsePayload(body, { partial = false } = {}) {
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
    const data = {};

    if (!partial || has('code')) {
        const code = String(body.code || '').trim().toUpperCase();
        if (!CODE_RE.test(code)) return { error: 'Code must be 3-32 characters: letters, numbers, - or _' };
        data.code = code;
    }

    if (!partial || has('discount_percent') || has('discount_amount')) {
        const pct = num(body, 'discount_percent', { min: 1, max: 100, integer: true });
        const flat = num(body, 'discount_amount', { min: 0.01, max: 1000000 });
        if (pct.error) return { error: pct.error };
        if (flat.error) return { error: flat.error };
        if (pct.value && flat.value) return { error: 'Set either a percentage or a flat amount, not both' };
        if (!pct.value && !flat.value) return { error: 'Set a percentage (1-100) or a flat amount' };
        data.discount_percent = pct.value || null;
        data.discount_amount = flat.value || null;
    }

    for (const [key, opts] of [
        ['max_uses', { min: 1, integer: true }],
        ['min_order_amount', { min: 0 }],
    ]) {
        if (!partial || has(key)) {
            const r = num(body, key, opts);
            if (r.error) return { error: r.error };
            data[key] = r.value;
        }
    }

    if (!partial || has('expires_at')) {
        if (isBlank(body.expires_at)) {
            data.expires_at = null;
        } else {
            const d = new Date(body.expires_at);
            if (Number.isNaN(d.getTime())) return { error: 'expires_at is not a valid date' };
            data.expires_at = d;
        }
    }

    for (const key of ['is_active', 'one_time_per_user', 'applies_to_renewal']) {
        if (has(key)) {
            if (typeof body[key] !== 'boolean') return { error: `${key} must be true or false` };
            data[key] = body[key];
        }
    }

    if (has('applicable_to')) {
        const a = body.applicable_to;
        if (a === 'all' || isBlank(a) || (Array.isArray(a) && a.length === 0)) {
            data.applicable_to = 'all';
        } else if (Array.isArray(a) && a.every((id) => typeof id === 'string' && id.length <= 64)) {
            data.applicable_to = [...new Set(a)];
        } else {
            return { error: 'applicable_to must be "all" or a list of plan ids' };
        }
    }

    return { data };
}

/**
 * A 100% code gives a plan away. Without a ceiling it is unlimited free premium for anyone
 * who can register throwaway accounts, so it must be capped overall (max_uses), capped per
 * customer (one_time_per_user), or both. `state` is the code as it will be stored.
 */
const FREE_CODE_NEEDS_LIMIT = 'A 100% code gives the plan away, so it needs a usage limit or must be once per user';
function freeCodeProblem(state) {
    if (Number(state.discount_percent) !== 100) return null;
    const hasMax = Number(state.max_uses) > 0;
    return hasMax || state.one_time_per_user === true ? null : FREE_CODE_NEEDS_LIMIT;
}

class PromoCodeController {
    static async list(req, res) {
        try {
            const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
            const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
            const rows = await db.PromoCode.findAll({ order: [['created_at', 'DESC']], limit, offset });
            res.json(rows);
        } catch (error) {
            console.error('Promo list failed:', error.message);
            res.status(500).json({ error: 'Could not load promo codes' });
        }
    }

    static async get(req, res) {
        try {
            const row = await db.PromoCode.findByPk(req.params.id);
            if (!row) return res.status(404).json({ error: 'Promo code not found' });
            res.json(row);
        } catch (error) {
            console.error('Promo get failed:', error.message);
            res.status(500).json({ error: 'Could not load the promo code' });
        }
    }

    static async create(req, res) {
        try {
            const { data, error } = parsePayload(req.body || {});
            if (error) return res.status(400).json({ error });

            if (await db.PromoCode.findOne({ where: { code: data.code } })) {
                return res.status(409).json({ error: `A promo code "${data.code}" already exists` });
            }
            const problem = freeCodeProblem({ one_time_per_user: false, ...data });
            if (problem) return res.status(400).json({ error: problem });
            const row = await db.PromoCode.create({
                applicable_to: 'all',
                is_active: true,
                ...data,
                uses_count: 0,
                created_by: req.user.id,
            });
            res.status(201).json(row);
        } catch (e) {
            if (e && e.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'A promo code with that code already exists' });
            }
            console.error('Promo create failed:', e.message);
            res.status(500).json({ error: 'Could not save the promo code' });
        }
    }

    static async update(req, res) {
        try {
            const row = await db.PromoCode.findByPk(req.params.id);
            if (!row) return res.status(404).json({ error: 'Promo code not found' });

            const { data, error } = parsePayload(req.body || {}, { partial: true });
            if (error) return res.status(400).json({ error });

            if (data.code && data.code !== row.code) {
                if (await db.PromoCode.findOne({ where: { code: data.code } })) {
                    return res.status(409).json({ error: `A promo code "${data.code}" already exists` });
                }
            }
            // A max below what has already been redeemed would instantly exhaust the code silently.
            if (data.max_uses && data.max_uses < Number(row.uses_count || 0)) {
                return res.status(400).json({ error: `max_uses cannot be below the ${row.uses_count} redemptions already made` });
            }
            // Judge the code as it will be after this update, not just the fields sent.
            const problem = freeCodeProblem({
                discount_percent: row.discount_percent, max_uses: row.max_uses, one_time_per_user: row.one_time_per_user,
                ...data,
            });
            if (problem) return res.status(400).json({ error: problem });
            await row.update(data);
            res.json(row);
        } catch (e) {
            if (e && e.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'A promo code with that code already exists' });
            }
            console.error('Promo update failed:', e.message);
            res.status(500).json({ error: 'Could not save the promo code' });
        }
    }

    static async remove(req, res) {
        try {
            const row = await db.PromoCode.findByPk(req.params.id);
            if (!row) return res.status(404).json({ error: 'Promo code not found' });
            await row.destroy();
            res.json({ success: true });
        } catch (e) {
            console.error('Promo delete failed:', e.message);
            res.status(500).json({ error: 'Could not delete the promo code' });
        }
    }
}

PromoCodeController.parsePayload = parsePayload;
PromoCodeController.freeCodeProblem = freeCodeProblem;
module.exports = PromoCodeController;
