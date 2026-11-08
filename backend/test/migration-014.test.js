const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Static checks on migration 014 (no database in tests): it must be re-runnable
// and its columns must match the AdvisorPost model the API selects.
const sql = fs.readFileSync(path.join(__dirname, '../src/migrations/014_advisor_posts_content_columns.sql'), 'utf8');
const live = sql.split('-- ROLLBACK')[0];
const statements = live.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));

test('every ADD is guarded by an information_schema check and run through PREPARE/EXECUTE', () => {
  const bare = statements.filter((l) => /^ALTER TABLE .* ADD /i.test(l.trim()));
  assert.deepEqual(bare, []);
  const adds = statements.filter((l) => /ADD (COLUMN|INDEX|UNIQUE INDEX)/i.test(l));
  assert.ok(adds.length >= 10);
  for (const l of adds) {
    assert.match(l, /^SET @sql = \(SELECT IF\(COUNT\(\*\) = 0, '.*', 'DO 0'\) FROM information_schema\./);
    assert.match(l, /TABLE_SCHEMA = DATABASE\(\)/);
  }
  assert.equal(statements.filter((l) => l.startsWith('PREPARE')).length, adds.length);
});

/**
 * Reads the first SQL string literal at `from` ('' is an escaped quote).
 * Returns { value, end } or null when the literal never closes.
 */
function readLiteral(text, from) {
  if (text[from] !== "'") return null;
  let value = '';
  for (let i = from + 1; i < text.length; i += 1) {
    if (text[i] === "'") {
      if (text[i + 1] === "'") { value += "'"; i += 1; continue; }
      return { value, end: i + 1 };
    }
    value += text[i];
  }
  return null;
}

test('every guarded SET has balanced quotes: the inner literal round-trips and is followed by , \'DO 0\'', () => {
  const sets = statements.filter((l) => l.startsWith('SET @sql'));
  assert.ok(sets.length >= 10);
  for (const l of sets) {
    const head = "SET @sql = (SELECT IF(COUNT(*) = 0, ";
    assert.ok(l.startsWith(head), l.slice(0, 60));
    const lit = readLiteral(l, head.length);
    assert.ok(lit, `unterminated literal in: ${l.slice(0, 90)}`);
    assert.ok(l.slice(lit.end).startsWith(", 'DO 0') FROM information_schema."), `literal ends early: ${l.slice(0, 120)}`);
    assert.match(lit.value, /^ALTER TABLE `\w+` ADD (COLUMN|INDEX|UNIQUE INDEX) `\w+`/);
    // After the guard the statement has no stray quotes of its own.
    const rest = l.slice(lit.end).replace(/'DO 0'/, '');
    assert.equal((rest.match(/'/g) || []).length % 2, 0, `odd number of quotes after the literal: ${rest}`);
  }
});

test('the visibility default survives as a quoted string inside the ALTER', () => {
  const l = statements.find((s) => s.includes('`visibility`'));
  const lit = readLiteral(l, "SET @sql = (SELECT IF(COUNT(*) = 0, ".length);
  assert.equal(lit.value, "ALTER TABLE `advisor_posts` ADD COLUMN `visibility` VARCHAR(16) NOT NULL DEFAULT 'subscribers'");
});

test('the rollback section is fully commented out', () => {
  const rollback = sql.slice(sql.indexOf('-- ROLLBACK'));
  assert.ok(rollback.split('\n').filter((l) => l.trim()).every((l) => l.trim().startsWith('--')));
});

test('existing rows become subscribers-only, never public', () => {
  assert.match(sql, /`visibility` VARCHAR\(16\) NOT NULL DEFAULT ''subscribers'''/);
});

test('adds exactly the columns the AdvisorPost model declares beyond the originals', () => {
  const { db } = require('./helpers');
  const attrs = Object.keys(db.AdvisorPost.rawAttributes);
  const added = [...sql.matchAll(/ADD COLUMN `(\w+)`/g)].map((m) => m[1]);
  for (const col of added) assert.ok(attrs.includes(col), `${col} missing from the model`);
  for (const col of ['title', 'stock_symbol', 'visibility', 'required_plan_id', 'target_price']) assert.ok(added.includes(col), `${col} missing from the migration`);
});
