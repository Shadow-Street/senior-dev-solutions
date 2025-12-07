const express = require("express");
const router = express.Router();
const db = require("../models");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Export data to CSV
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { entity, format = 'csv', filters = {} } = req.body;
    
    // Get the model
    const Model = db[entity];
    if (!Model) {
      return res.status(400).json({ error: `Unknown entity: ${entity}` });
    }

    // Build query
    const whereClause = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        whereClause[key] = value;
      }
    });

    const data = await Model.findAll({
      where: whereClause,
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
            value = String(value).replace(/"/g, '""');
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
    res.status(500).json({ error: error.message });
  }
});

// Get export history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    // For now, return empty array - implement if needed
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
