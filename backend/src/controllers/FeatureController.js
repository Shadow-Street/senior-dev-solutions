const { FeatureConfig } = require("../models");

const TIERS = ['basic', 'premium', 'vip'];
// feature_configs keeps two parallel columns: the legacy access_level
// (free|premium|vip) and tier (basic|premium|vip). They must move together.
// Writing the tier into access_level verbatim ('basic' is not a valid
// access_level) is what made "Add New Feature" fail for the default tier.
const ACCESS_LEVEL_FOR_TIER = { basic: 'free', premium: 'premium', vip: 'vip' };
const KEY_RE = /^[a-z][a-z0-9_]{1,99}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whitelists and validates a feature payload. Returns { data } or { error }. */
function parseFeaturePayload(body, { partial = false } = {}) {
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const data = {};

  if (!partial) {
    const key = typeof body.feature_key === 'string' ? body.feature_key.trim() : '';
    if (!KEY_RE.test(key)) {
      return { error: 'Feature key must be lowercase letters, numbers and underscores, starting with a letter' };
    }
    data.feature_key = key;
  }

  if (!partial || has('feature_name')) {
    const name = typeof body.feature_name === 'string' ? body.feature_name.trim() : '';
    if (!name || name.length > 255) return { error: 'Feature name is required (max 255 characters)' };
    data.feature_name = name;
  }

  if (has('description')) {
    if (body.description !== null && typeof body.description !== 'string') return { error: 'Description must be text' };
    data.description = body.description ? body.description.slice(0, 2000) : null;
  }

  if (!partial || has('tier')) {
    const tier = body.tier === undefined || body.tier === null || body.tier === '' ? 'basic' : body.tier;
    if (!TIERS.includes(tier)) return { error: 'Tier must be basic, premium or vip' };
    data.tier = tier;
    data.access_level = ACCESS_LEVEL_FOR_TIER[tier];
  }

  if (has('is_enabled')) {
    if (typeof body.is_enabled !== 'boolean') return { error: 'is_enabled must be true or false' };
    data.is_enabled = body.is_enabled;
  }

  return { data };
}

/** Finds a feature by its key, or by row id when `ref` looks like a UUID. */
async function findByKeyOrId(ref) {
  const byKey = await FeatureConfig.findOne({ where: { feature_key: ref } });
  if (byKey || !UUID_RE.test(String(ref))) return byKey;
  return FeatureConfig.findByPk(ref);
}

class FeatureController {
  static async listFeatures(req, res) {
    try {
      const { is_enabled, access_level, tier, feature_key } = req.query;
      const where = {};

      if (is_enabled !== undefined) where.is_enabled = is_enabled === 'true';
      if (typeof access_level === 'string' && access_level) where.access_level = access_level;
      if (typeof tier === 'string' && TIERS.includes(tier)) where.tier = tier;
      // Honoured so "does this key exist?" checks get an answer about that key,
      // not the whole table (the admin form relied on this to detect duplicates).
      if (typeof feature_key === 'string' && feature_key) where.feature_key = feature_key;

      const features = await FeatureConfig.findAll({
        where,
        order: [['feature_name', 'ASC']]
      });

      return res.status(200).json(features);
    } catch (error) {
      console.error("List features error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFeature(req, res) {
    try {
      const { key } = req.params;

      const feature = await FeatureConfig.findOne({
        where: { feature_key: key }
      });

      if (!feature) {
        return res.status(404).json({ error: "Feature not found" });
      }

      return res.status(200).json(feature);
    } catch (error) {
      console.error("Get feature error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a feature. `:key` may be the feature_key or the row id (the admin
   * UI addresses rows by id). Only descriptive fields, the tier and the enabled
   * flag can change; feature_key is the identifier plans refer to and is
   * immutable.
   */
  static async updateFeature(req, res) {
    try {
      const { key } = req.params;
      const { data, error } = parseFeaturePayload(req.body || {}, { partial: true });
      if (error) return res.status(400).json({ error });

      const existing = await findByKeyOrId(key);
      if (!existing) {
        return res.status(404).json({ error: "Feature not found" });
      }

      await existing.update(data);
      return res.status(200).json(existing);
    } catch (error) {
      console.error("Update feature error:", error);
      return res.status(500).json({ error: 'Could not update the feature' });
    }
  }

  /**
   * Create a feature. Body: { feature_key, feature_name, description?, tier?, is_enabled? }.
   * tier is basic | premium | vip; access_level is derived from it.
   */
  static async createFeature(req, res) {
    try {
      const { data, error } = parseFeaturePayload(req.body || {});
      if (error) return res.status(400).json({ error });

      const existing = await FeatureConfig.findOne({ where: { feature_key: data.feature_key } });
      if (existing) {
        return res.status(409).json({ error: "A feature with this key already exists" });
      }

      const feature = await FeatureConfig.create(data);
      return res.status(201).json(feature);
    } catch (error) {
      if (error && error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: "A feature with this key already exists" });
      }
      console.error("Create feature error:", error);
      return res.status(500).json({ error: 'Could not create the feature' });
    }
  }

  static async deleteFeature(req, res) {
    try {
      const { id } = req.params;

      const deleted = await FeatureConfig.destroy({
        where: { id }
      });

      if (!deleted) {
        return res.status(404).json({ error: "Feature not found" });
      }

      return res.status(200).json({ message: "Feature deleted successfully" });
    } catch (error) {
      console.error("Delete feature error:", error);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = FeatureController;

module.exports.parseFeaturePayload = parseFeaturePayload;
