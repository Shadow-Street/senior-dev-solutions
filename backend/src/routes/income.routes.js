const { financeEntryRouter } = require("../utils/financeEntryRoutes");

// Manually recorded income ("other" revenue in Financials > Overview). Admin /
// super_admin only, field whitelist, server-side audit trail: see
// utils/financeEntryRoutes.js. Status 'void' excludes an entry from the totals.
module.exports = financeEntryRouter({
  model: 'Income',
  entityType: 'income',
  textFields: { source: 100, description: 2000 },
  requiredText: ['source'],
  dateField: 'income_date',
  enums: { status: ['recorded', 'void'] },
});
