const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Static checks on migration 017 (no database in tests): re-runnable, the
// columns it adds are the ones utils/userSchema.js looks for, and it never
// deletes data.
const sql = fs.readFileSync(path.join(__dirname, '../src/migrations/017_user_admin_columns.sql'), 'utf8');
const live = sql.split('-- ROLLBACK')[0];
const code = live.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join('\n');

/** Each guarded statement: SET @sql = (SELECT IF(<cond>, '<ddl>', 'DO 0') FROM information_schema.<T> WHERE ...); */
const guarded = [...code.matchAll(/SET @sql = \(SELECT IF\(COUNT\(\*\) = (\d),\s*'((?:[^']|'')*)',\s*'DO 0'\) FROM information_schema\.(\w+)\s*WHERE ([^;]*)\);\nPREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;/g)]
  .map((m) => ({ count: m[1], ddl: m[2].replace(/''/g, "'"), table: m[3], where: m[4] }));

test('every schema change is guarded by an information_schema check and run through PREPARE/EXECUTE', () => {
  assert.deepEqual(code.split('\n').filter((l) => /^ALTER TABLE/i.test(l.trim())), [], 'no unguarded ALTER');
  assert.equal(guarded.length, 5);
  assert.equal((code.match(/PREPARE stmt FROM @sql;/g) || []).length, guarded.length);
  for (const g of guarded) assert.match(g.where, /TABLE_SCHEMA = DATABASE\(\)/);
});

test('adds exactly the columns the API detects', () => {
  const { OPTIONAL_COLUMNS_017 } = require('../src/utils/userSchema');
  for (const column of OPTIONAL_COLUMNS_017) {
    assert.ok(guarded.some((g) => g.ddl.includes(`ADD COLUMN \`${column}\``) && g.where.includes(`COLUMN_NAME = '${column}'`)), column);
  }
});

test('app_role is widened from the 001 ENUM to a VARCHAR superset, only when it is still an ENUM', () => {
  const g = guarded.find((x) => /MODIFY COLUMN `app_role`/.test(x.ddl));
  assert.ok(g);
  assert.equal(g.count, '1');
  assert.match(g.where, /DATA_TYPE = 'enum'/);
  assert.match(g.ddl, /VARCHAR\(50\) NULL DEFAULT 'user'$/);
  const { ASSIGNABLE_ROLES } = require('../src/utils/roles');
  for (const role of ASSIGNABLE_ROLES) assert.ok(role.length <= 50);
});

test('permissions.name becomes unique without deleting duplicates', () => {
  const g = guarded.find((x) => /ADD UNIQUE INDEX `uk_permissions_name` \(`name`\)/.test(x.ddl));
  assert.ok(g);
  assert.match(g.where, /NON_UNIQUE = 0/);
  assert.match(code, /SELECT name, COUNT\(\*\) AS copies FROM permissions/);
  assert.doesNotMatch(code, /\b(DELETE|DROP|TRUNCATE)\b/i);
  assert.match(sql, /-- ROLLBACK/);
});

test('the User model does not declare the 017 columns (they would break every request before the migration)', () => {
  const { OPTIONAL_COLUMNS_017 } = require('../src/utils/userSchema');
  const model = fs.readFileSync(path.join(__dirname, '../src/models/User.js'), 'utf8');
  for (const column of OPTIONAL_COLUMNS_017) assert.doesNotMatch(model, new RegExp(`^\\s*${column}\\s*:`, 'm'));
});
