const { financeEntryRouter } = require("../utils/financeEntryRoutes");

// Platform expenses (Financials > Expenses). Admin / super_admin only, field
// whitelist, server-side audit trail: see utils/financeEntryRoutes.js.
module.exports = financeEntryRouter({
  model: 'Expense',
  entityType: 'expense',
  textFields: { category: 100, description: 2000, vendor: 200 },
  requiredText: ['category', 'description'],
  dateField: 'expense_date',
  enums: { status: ['recorded', 'pending', 'approved', 'paid', 'rejected'] },
});
