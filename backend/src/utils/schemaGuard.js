/**
 * Degrades cleanly when the database lags the code.
 *
 * Migration 014 adds columns to advisor_posts that the AdvisorPost model
 * selects on every query. If the API starts before the migration has run, every
 * posts request would be a 500 ("Unknown column"). The first posts request
 * instead reads the table's real columns (describeTable, once) and drops the
 * missing ones from the model. Reads then work with what exists; writes are
 * refused with 503 (saving a post without its title or audience would lose
 * data silently). The result is cached for the life of the process, so apply the
 * migration and restart; a failed lookup is retried after RETRY_MS.
 */
const db = require('../models');

const POST_COLUMNS_014 = [
  'title', 'stock_symbol', 'post_type', 'recommendation_type', 'target_price',
  'stop_loss', 'time_horizon', 'visibility', 'required_plan_id', 'notified_at',
];
const RETRY_MS = 30000;

let state = null; // { checked: true, missing: [] } | { checked: false, at }

async function checkAdvisorPosts() {
  if (state && (state.checked || Date.now() - state.at < RETRY_MS)) return state;
  try {
    const columns = await db.sequelize.getQueryInterface().describeTable('advisor_posts');
    const missing = POST_COLUMNS_014.filter((c) => !(c in columns));
    for (const column of missing) db.AdvisorPost.removeAttribute(column);
    if (missing.length) {
      console.warn(`[schemaGuard] advisor_posts is missing ${missing.join(', ')}; posts are read-only until migration 014 is applied and the API restarted`);
    }
    state = { checked: true, missing };
  } catch (e) {
    console.error('[schemaGuard] could not inspect advisor_posts:', e.message);
    state = { checked: false, at: Date.now(), missing: [] };
  }
  return state;
}

/** Express middleware: sets req.postsDegraded when migration 014 has not been applied. */
async function advisorPostsSchemaGuard(req, _res, next) {
  const st = await checkAdvisorPosts();
  req.postsDegraded = st.checked && st.missing.length > 0;
  next();
}

/** 503 for writes while degraded. */
function blockPostWritesWhenDegraded(req, res, next) {
  if (req.postsDegraded) {
    return res.status(503).json({ error: 'Posts are temporarily read-only while a database update is pending. Please try again later.' });
  }
  return next();
}

module.exports = { advisorPostsSchemaGuard, blockPostWritesWhenDegraded, POST_COLUMNS_014, _reset: () => { state = null; } };
