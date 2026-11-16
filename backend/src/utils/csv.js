/**
 * CSV building for admin downloads.
 *
 * Spreadsheet apps execute a cell that starts with = + - @ TAB or CR as a
 * formula, so any such text cell is prefixed with an apostrophe. Numbers the
 * server produced itself (amounts, counts) are written as numbers.
 */

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

function cell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  let s = String(value);
  if (FORMULA_START.test(s) && !PLAIN_NUMBER.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** columns: [{ key, label }]; rows: objects. */
function toCsv(columns, rows) {
  const head = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(','));
  return [head, ...body].join('\r\n') + '\r\n';
}

/** Sends `csv` as a download. `name` must be a server-chosen file name. */
function sendCsv(res, name, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${String(name).replace(/[^A-Za-z0-9._-]/g, '_')}"`);
  res.setHeader('Cache-Control', 'no-store');
  // BOM so Excel opens UTF-8 (₹, names) correctly.
  res.send('﻿' + csv);
}

module.exports = { toCsv, sendCsv, cell };
