const { FeatureConfig } = require("../models");

class FeatureController {
  static async listFeatures(req, res) {
    try {
      const { is_enabled, access_level } = req.query;
      const where = {};

      if (is_enabled !== undefined) where.is_enabled = is_enabled === 'true';
      if (access_level) where.access_level = access_level;

      const features = await FeatureConfig.findAll({
        where,
        order: [['feature_name', 'ASC']]
      });

      return res.status(200).json(features);
    } catch (error) {
      console.error("List features error:", error);
      return res.status(500).json({ error: error.message });
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
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateFeature(req, res) {
    try {
      const { key } = req.params;
      const updates = req.body;

      const [updated] = await FeatureConfig.update(updates, {
        where: { feature_key: key }
      });

      if (!updated) {
        return res.status(404).json({ error: "Feature not found" });
      }

      const feature = await FeatureConfig.findOne({
        where: { feature_key: key }
      });

      return res.status(200).json(feature);
    } catch (error) {
      console.error("Update feature error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async createFeature(req, res) {
    try {
      const { feature_key, feature_name, description, tier, is_enabled } = req.body;

      if (!feature_key || !feature_name) {
        return res.status(400).json({ error: "feature_key and feature_name are required" });
      }

      // Check if feature already exists
      const existing = await FeatureConfig.findOne({
        where: { feature_key }
      });

      if (existing) {
        return res.status(409).json({ error: "Feature with this key already exists" });
      }

      const feature = await FeatureConfig.create({
        feature_key,
        feature_name,
        description,
        tier: tier || 'basic',
        is_enabled: is_enabled !== undefined ? is_enabled : true,
        access_level: tier || 'free'
      });

      return res.status(201).json(feature);
    } catch (error) {
      console.error("Create feature error:", error);
      return res.status(400).json({ error: error.message });
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
