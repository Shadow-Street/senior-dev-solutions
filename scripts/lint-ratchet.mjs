#!/usr/bin/env node
/**
 * ESLint ratchet.
 *
 * The frontend carries thousands of legacy ESLint errors, so a plain
 * `eslint src` gate would always fail. This gate fails only when things get
 * worse: a file's error count rises above .eslint-baseline.json, or a file not
 * in the baseline has errors. Counts may only go down.
 *
 *   node scripts/lint-ratchet.mjs           # check (CI)
 *   node scripts/lint-ratchet.mjs --update  # rewrite the baseline; refuses to raise any count
 *   node scripts/lint-ratchet.mjs --update --allow-increase   # reviewer-approved exception only
 */
import { ESLint } from 'eslint';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = resolve(ROOT, '.eslint-baseline.json');
const args = new Set(process.argv.slice(2));

const eslint = new ESLint({ cwd: ROOT });
const results = await eslint.lintFiles(['src']);

const current = {};
for (const r of results) {
  if (r.errorCount > 0) current[relative(ROOT, r.filePath)] = r.errorCount;
}
const total = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).files ?? {} : {};

const regressions = Object.entries(current)
  .filter(([file, count]) => count > (baseline[file] ?? 0))
  .map(([file, count]) => `  ${file}: ${baseline[file] ?? 0} → ${count}`);

if (args.has('--update')) {
  // The very first run has nothing to compare against and simply records today.
  if (existsSync(BASELINE) && regressions.length && !args.has('--allow-increase')) {
    console.error(`Refusing to raise the baseline:\n${regressions.join('\n')}`);
    process.exit(1);
  }
  const files = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, `${JSON.stringify({ total: total(files), files }, null, 2)}\n`);
  console.log(`Baseline written: ${total(files)} errors in ${Object.keys(files).length} files (was ${total(baseline)}).`);
  process.exit(0);
}

if (regressions.length) {
  console.error(`ESLint errors increased in ${regressions.length} file(s):\n${regressions.join('\n')}`);
  console.error('Fix the new errors (run `npx eslint <file>`), do not raise the baseline.');
  process.exit(1);
}

const improved = total(baseline) - total(current);
console.log(
  `Lint ratchet OK: ${total(current)} errors (baseline ${total(baseline)}).` +
    (improved > 0 ? ` ${improved} fewer — run with --update to lock in the improvement.` : '')
);
