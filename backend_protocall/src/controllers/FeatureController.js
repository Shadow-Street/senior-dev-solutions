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
}

module.exports = FeatureController;
