const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Static checks on migration 012. There is no database in tests, so these
// guard the properties that made the first draft unsafe to re-run.
const sql = fs.readFileSync(path.join(__dirname, '../src/migrations/012_advisor_bank_accounts_and_withdrawals.sql'), 'utf8');
const live = sql.split('-- ===========================================================================\n-- ROLLBACK')[0];
const statements = live.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));

test('there is a rollback section, fully commented out', () => {
  assert.match(sql, /ROLLBACK/);
  const rollback = sql.slice(sql.indexOf('-- ROLLBACK'));
  assert.ok(rollback.split('\n').filter((l) => l.trim()).every((l) => l.trim().startsWith('--')));
});

test('every ADD COLUMN / ADD INDEX / ADD CONSTRAINT is guarded by an information_schema check', () => {
  const bareAdds = statements.filter((l) => /^ALTER TABLE .* ADD /i.test(l.trim()));
  assert.deepEqual(bareAdds, [], 'unguarded ADD statements would abort `mysql < file` on a re-run');
  const guarded = statements.filter((l) => /ADD (COLUMN|INDEX|UNIQUE INDEX|CONSTRAINT)/i.test(l));
  assert.ok(guarded.length >= 20);
  for (const l of guarded) {
    // The ALTER is either a literal or CONCAT(...) around @idcoll.
    assert.match(l, /^SET @sql = \(SELECT IF\(COUNT\(\*\) = 0, (CONCAT\('.*'\)|'.*'), 'DO 0'\) FROM information_schema\./, l.slice(0, 80));
    assert.match(l, /TABLE_SCHEMA = DATABASE\(\)/);
  }
});

test('each guarded statement is executed through PREPARE / EXECUTE / DEALLOCATE', () => {
  const sets = statements.filter((l) => l.startsWith('SET @sql')).length;
  const execs = statements.filter((l) => l === 'PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;').length;
  assert.equal(sets, execs);
  assert.ok(!/DELIMITER|CREATE PROCEDURE/i.test(statements.join('\n')), 'no DELIMITER/procedures: must run under any statement splitter');
});

test('NULL statuses are repaired before the NOT NULL widening, and legacy values are remapped after', () => {
  const nullFix = live.indexOf("UPDATE payout_requests SET status = 'pending' WHERE status IS NULL;");
  const modify = live.indexOf('ALTER TABLE payout_requests MODIFY COLUMN status VARCHAR(20) NOT NULL');
  const remap = live.indexOf("UPDATE payout_requests SET status = 'paid'");
  assert.ok(nullFix > -1 && modify > nullFix && remap > modify);
});

test('key columns follow users.id collation, aligned before the foreign keys', () => {
  // Regression: the local DB has users.id in utf8mb4_bin (sync-created); a
  // hard-coded utf8mb4_unicode_ci failed with ER_FK_INCOMPATIBLE_COLUMNS.
  const probe = live.indexOf("SET @idcoll = COALESCE((SELECT COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id')");
  const alignId = live.indexOf("MODIFY COLUMN `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE ', @idcoll");
  const alignUser = live.indexOf("MODIFY COLUMN `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE ', @idcoll");
  const fkUser = live.indexOf('ADD CONSTRAINT `fk_abank_user`');
  const fkPayout = live.indexOf('ADD CONSTRAINT `fk_payout_bank_account`');
  assert.ok(probe > -1, 'collation probed from users.id');
  assert.ok(probe < alignId && alignId < fkUser && alignUser < fkUser, 'key columns aligned before fk_abank_user');
  assert.ok(alignId < fkPayout, 'advisor_bank_accounts.id aligned before the payout FK');
  assert.match(live, /ADD COLUMN `bank_account_id` CHAR\(36\) CHARACTER SET utf8mb4 COLLATE ', @idcoll/);
  assert.ok(!/CONSTRAINT fk_abank_user FOREIGN KEY/.test(live.slice(0, fkUser)), 'no inline FK in CREATE TABLE (it would fail before alignment)');
});

test('re-running is safe: the table-wide CONVERT skips once fk_abank_user exists', () => {
  // Regression: a second run converted user_id back to unicode_ci under its FK
  // (ER_FK_INCOMPATIBLE_COLUMNS).
  const convert = live.split('\n').find((l) => l.includes('CONVERT TO CHARACTER SET'));
  assert.match(convert, /CONSTRAINT_NAME = 'fk_abank_user'\) = 0/);
  assert.match(convert, /COLUMN_NAME NOT IN \('id', 'user_id'\)/);
});

test('the columns the code relies on are all created', () => {
  for (const col of ['destination_changed_at', 'bank_snapshot', 'bank_account_id', 'reference_id', 'entity_type', 'entity_id', 'paid_at', 'rejection_reason']) {
    assert.ok(live.includes(`\`${col}\``) || live.includes(`${col} `), col);
  }
  assert.match(live, /uq_commission_reference/);
});
