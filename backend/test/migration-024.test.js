const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Static checks: 024 only drops duplicate single-column UNIQUE indexes, keeps
// one per column, never touches PRIMARY or data, and can be re-run.
const sql = fs.readFileSync(path.join(__dirname, '../src/migrations/024_drop_duplicate_unique_indexes.sql'), 'utf8');
const body = sql.split(/^-- ={5,}\s*\n-- ROLLBACK/m)[0];
const statements = body.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');

test('touches no data', () => {
  assert.doesNotMatch(statements, /\b(DELETE|UPDATE|TRUNCATE|INSERT|DROP\s+TABLE|DROP\s+COLUMN)\b/i);
});

test('every drop is generated from duplicates of a kept index, never PRIMARY', () => {
  for (const [table, column] of [['users', 'email'], ['stocks', 'symbol'], ['feature_configs', 'feature_key']]) {
    const keep = new RegExp(`SET @keep = \\(SELECT MIN\\(INDEX_NAME\\)[\\s\\S]*?TABLE_NAME = '${table}' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'[\\s\\S]*?MAX\\(COLUMN_NAME\\) = '${column}'`);
    assert.match(statements, keep, `${table}.${column} keeper`);
    const drop = new RegExp(`ALTER TABLE \`${table}\` [\\s\\S]*?TABLE_NAME = '${table}' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'[\\s\\S]*?COUNT\\(\\*\\) = 1 AND MAX\\(COLUMN_NAME\\) = '${column}'[\\s\\S]*?WHERE INDEX_NAME <> @keep`);
    assert.match(statements, drop, `${table}.${column} drops exclude the keeper`);
  }
});

test('no-op when there is nothing to drop, and long index lists are not truncated', () => {
  assert.equal((statements.match(/IF\(COUNT\(\*\) = 0, 'DO 0'/g) || []).length, 3);
  assert.match(statements, /SET SESSION group_concat_max_len = 1000000;/);
});
