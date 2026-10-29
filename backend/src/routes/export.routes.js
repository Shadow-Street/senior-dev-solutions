const express = require("express");
const router = express.Router();
const db = require("../models");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

/**
 * Entity export.
 *
 * This was reachable by any signed-in user and exported any model by name, so
 * `{"entity":"User"}` returned every bcrypt hash and `{"entity":"PlatformSetting"}`
 * the payment gateway secrets. It is now admin-only, refuses credential-bearing
 * models outright, and drops secret-looking columns from every other export.
 */
const BLOCKED_ENTITIES = new Set([
  'PlatformSetting',
  'OauthToken',
  'VerificationCode',
  'PasswordReset',
  'SocialAuth',
  'UserSession',
]);
const SECRET_COLUMN = /(password|token|secret|code_hash|api_key|private_key)/i;

// Spreadsheet apps execute cells starting with these characters as formulas.
// Plain numbers (including negative amounts) are left alone.
const neutraliseFormula = (value) =>
  /^[=+\-@\t\r]/.test(value) && !/^-?\d+(\.\d+)?$/.test(value) ? `'${value}` : value;

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { entity, format = 'csv', filters = {} } = req.body || {};

    // `db` also carries `sequelize`/`Sequelize`; only real models qualify.
    const Model = typeof entity === 'string' && Object.prototype.hasOwnProperty.call(db, entity) ? db[entity] : null;
    if (!Model || typeof Model.findAll !== 'function' || !Model.rawAttributes) {
      return res.status(400).json({ error: 'Unknown entity' });
    }
    if (BLOCKED_ENTITIES.has(entity)) {
      return res.status(403).json({ error: 'This entity cannot be exported' });
    }

    const columns = Object.keys(Model.rawAttributes).filter((c) => !SECRET_COLUMN.test(c));

    // Filters only on real, non-secret columns, with plain values (no operator objects).
    const whereClause = {};
    Object.entries(filters && typeof filters === 'object' ? filters : {}).forEach(([key, value]) => {
      if (!columns.includes(key)) return;
      if (value === undefined || value === null || value === '' || typeof value === 'object') return;
      whereClause[key] = value;
    });

    const data = await Model.findAll({
      where: whereClause,
      attributes: columns,
      limit: 10000,
      raw: true
    });

    if (format === 'csv') {
      // Generate CSV
      if (data.length === 0) {
        return res.status(404).json({ error: 'No data to export' });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') value = JSON.stringify(value);
            // Escape quotes and wrap in quotes if contains comma
            value = neutraliseFormula(String(value)).replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
              value = `"${value}"`;
            }
            return value;
          }).join(',')
        )
      ];

      const csv = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_export_${Date.now()}.csv"`);
      res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_export_${Date.now()}.json"`);
      res.json(data);
    } else {
      res.status(400).json({ error: 'Unsupported format. Use csv or json.' });
    }
  } catch (error) {
    console.error('[export.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get export history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array - implement if needed
    res.json([]);
  } catch (error) {
    console.error('[export.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
