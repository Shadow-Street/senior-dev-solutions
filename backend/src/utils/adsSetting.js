const db = require('../models');

/**
 * Global advertisement switch, stored as PlatformSetting key `ads_enabled`.
 *
 * Contract:
 *  - row missing / value null  -> enabled (the behaviour before the switch existed)
 *  - 'true' / '1' / true / 1   -> enabled
 *  - anything else (incl. junk) -> disabled. A malformed value is an admin
 *    trying to restrict ads, so it fails closed rather than showing ads.
 */
const ADS_ENABLED_KEY = 'ads_enabled';

function parseAdsEnabled(raw) {
  if (raw === undefined || raw === null) return true;
  if (raw === true || raw === 1) return true;
  const s = String(raw).trim().toLowerCase();
  if (s === '') return true;
  return s === 'true' || s === '1';
}

/** Strict parser for admin writes: accepts only a real boolean (or 'true'/'false'). */
function coerceBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

async function isAdsEnabled() {
  const row = await db.PlatformSetting.findOne({ where: { key: ADS_ENABLED_KEY } });
  return parseAdsEnabled(row ? row.value : null);
}

/**
 * Persists the switch. Find-then-write inside one transaction rather than an
 * upsert, so it stays correct whether or not platform_settings.key carries a
 * UNIQUE index: every existing row for the key is updated (a duplicate left
 * behind could otherwise be read back as the stale value).
 * Returns { previous, setting }.
 */
async function writeAdsEnabled(enabled, userId) {
  return db.sequelize.transaction(async (transaction) => {
    const rows = await db.PlatformSetting.findAll({
      where: { key: ADS_ENABLED_KEY },
      transaction,
      lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined
    });
    const previous = parseAdsEnabled(rows.length ? rows[0].value : null);
    const patch = { value: String(enabled), updated_by: userId, updated_at: new Date() };

    if (rows.length) {
      for (const row of rows) await row.update(patch, { transaction });
      return { previous, setting: rows[0] };
    }
    const setting = await db.PlatformSetting.create({
      key: ADS_ENABLED_KEY,
      ...patch,
      description: 'Global advertisement switch. When false no ads or sponsored content are served or rendered.'
    }, { transaction });
    return { previous, setting };
  });
}

module.exports = { ADS_ENABLED_KEY, parseAdsEnabled, coerceBoolean, isAdsEnabled, writeAdsEnabled };
