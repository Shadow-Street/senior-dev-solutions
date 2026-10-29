#!/usr/bin/env node
/**
 * Built-in engineering tracker.
 *
 * Reads the items table in docs/engineering/TRACKER.md (between the
 * tracker:items markers) and prints summaries, the next items to work on,
 * filtered lists, or validation errors. The markdown file stays the single
 * source of truth; this script never writes to it.
 *
 *   node scripts/tracker.mjs summary [--brief]
 *   node scripts/tracker.mjs next [n]
 *   node scripts/tracker.mjs list [todo|doing|blocked|done] [--area AREA]
 *   node scripts/tracker.mjs check
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TRACKER = resolve(ROOT, 'docs/engineering/TRACKER.md');

const STATUSES = ['todo', 'doing', 'blocked', 'done'];
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const COLUMNS = ['id', 'priority', 'status', 'area', 'title', 'owner', 'evidence'];

export function parseTracker(markdown) {
  const start = markdown.indexOf('<!-- tracker:items:start -->');
  const end = markdown.indexOf('<!-- tracker:items:end -->');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('TRACKER.md is missing the tracker:items markers');
  }
  return markdown
    .slice(start, end)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((cells) => cells[0] && cells[0] !== 'ID')
    .map((cells) => Object.fromEntries(COLUMNS.map((key, i) => [key, cells[i] ?? ''])));
}

export function validate(items) {
  const errors = [];
  const seen = new Set();
  for (const item of items) {
    if (!/^[A-Z]+-\d+$/.test(item.id)) errors.push(`${item.id || '(blank)'}: invalid ID`);
    if (seen.has(item.id)) errors.push(`${item.id}: duplicate ID`);
    seen.add(item.id);
    if (!PRIORITIES.includes(item.priority)) errors.push(`${item.id}: invalid priority "${item.priority}"`);
    if (!STATUSES.includes(item.status)) errors.push(`${item.id}: invalid status "${item.status}"`);
    if (!item.title) errors.push(`${item.id}: missing title`);
    if (item.status === 'done' && (!item.evidence || item.evidence === '-')) {
      errors.push(`${item.id}: done without evidence`);
    }
    if (item.status === 'blocked' && (!item.evidence || item.evidence === '-')) {
      errors.push(`${item.id}: blocked without a recorded blocker`);
    }
  }
  return errors;
}

const rank = (item) =>
  PRIORITIES.indexOf(item.priority) * 10 + (item.status === 'doing' ? 0 : item.status === 'todo' ? 1 : 2);

function bar(done, total, width = 24) {
  const filled = total ? Math.round((done / total) * width) : 0;
  return `[${'#'.repeat(filled)}${'.'.repeat(width - filled)}] ${done}/${total}`;
}

function row(item) {
  return `${item.id.padEnd(7)} ${item.priority} ${item.status.padEnd(7)} ${item.area.padEnd(9)} ${item.title}`;
}

function main(argv) {
  const [command = 'summary', ...rest] = argv;
  const items = parseTracker(readFileSync(TRACKER, 'utf8'));

  if (command === 'check') {
    const errors = validate(items);
    if (errors.length) {
      console.error(errors.join('\n'));
      return 1;
    }
    console.log(`TRACKER.md OK (${items.length} items)`);
    return 0;
  }

  if (command === 'summary') {
    const count = (key, value) => items.filter((i) => i[key] === value).length;
    const done = count('status', 'done');
    const openP0 = items.filter((i) => i.priority === 'P0' && i.status !== 'done');
    if (rest.includes('--brief')) {
      console.log(
        `Engineering tracker ${bar(done, items.length)} | doing ${count('status', 'doing')}, ` +
          `blocked ${count('status', 'blocked')}, open P0 ${openP0.length}` +
          (openP0.length ? ` (${openP0.map((i) => i.id).join(', ')})` : '') +
          ' — docs/engineering/TRACKER.md'
      );
      return 0;
    }
    console.log(`Progress ${bar(done, items.length)}`);
    console.log(STATUSES.map((s) => `${s}: ${count('status', s)}`).join('  '));
    for (const p of PRIORITIES) {
      const all = items.filter((i) => i.priority === p);
      if (all.length) console.log(`${p}  ${bar(all.filter((i) => i.status === 'done').length, all.length, 12)}`);
    }
    const areas = [...new Set(items.map((i) => i.area))];
    console.log('\nBy area:');
    for (const a of areas) {
      const all = items.filter((i) => i.area === a);
      console.log(`  ${a.padEnd(9)} ${bar(all.filter((i) => i.status === 'done').length, all.length, 12)}`);
    }
    return 0;
  }

  if (command === 'next') {
    const n = Number(rest[0]) || 5;
    items
      .filter((i) => i.status === 'todo' || i.status === 'doing')
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, n)
      .forEach((i) => console.log(row(i)));
    return 0;
  }

  if (command === 'list') {
    const status = rest.find((r) => STATUSES.includes(r));
    const areaIdx = rest.indexOf('--area');
    const area = areaIdx !== -1 ? rest[areaIdx + 1] : undefined;
    items
      .filter((i) => (!status || i.status === status) && (!area || i.area === area))
      .sort((a, b) => rank(a) - rank(b))
      .forEach((i) => console.log(row(i)));
    return 0;
  }

  console.error(`Unknown command "${command}". Use summary | next | list | check.`);
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
