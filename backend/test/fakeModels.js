/**
 * A tiny in-memory stand-in for a Sequelize model, enough for route tests that
 * must prove WHICH rows a query touches (ownership), not just that a method
 * was called. Supports equality plus Op.in / Op.ne / Op.gte / Op.lte in where.
 */
const { Op } = require('sequelize');

function matches(row, where = {}) {
  // Top-level Op.or / Op.and groups, then the plain column conditions.
  const groups = Object.getOwnPropertySymbols(where || {});
  for (const g of groups) {
    if (g === Op.or && !where[g].some((w) => matches(row, w))) return false;
    if (g === Op.and && !where[g].every((w) => matches(row, w))) return false;
  }
  return Object.entries(where).every(([key, cond]) => {
    const val = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const syms = Object.getOwnPropertySymbols(cond);
      if (syms.length) {
        return syms.every((s) => {
          const arg = cond[s];
          if (s === Op.in) return arg.includes(val);
          if (s === Op.ne) return val !== arg;
          if (s === Op.gte) return val >= arg;
          if (s === Op.lte) return val <= arg;
          if (s === Op.gt) return val > arg;
          if (s === Op.lt) return val < arg;
          if (s === Op.notIn) return !arg.includes(val);
          throw new Error(`fakeModels: unsupported operator ${String(s)}`);
        });
      }
    }
    return val === cond;
  });
}

let seq = 0;
const nextId = () => `aaaaaaaa-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

function makeRow(table, data) {
  const row = {
    id: nextId(),
    created_at: new Date(Date.now() + seq),
    ...data,
  };
  Object.defineProperty(row, 'update', {
    enumerable: false,
    value: async (patch) => { table.updates.push({ id: row.id, patch }); Object.assign(row, patch); return row; },
  });
  Object.defineProperty(row, 'toJSON', { enumerable: false, value: () => ({ ...row }) });
  Object.defineProperty(row, 'destroy', {
    enumerable: false,
    value: async () => { table.calls.push(['destroy', row.id]); table.rows.splice(table.rows.indexOf(row), 1); },
  });
  return row;
}

/** Returns { rows, calls, install(model) } */
function fakeTable(initial = []) {
  const table = { rows: [], updates: [], calls: [] };
  table.add = (data) => { const r = makeRow(table, data); table.rows.push(r); return r; };
  initial.forEach(table.add);

  const sumOf = (rows) => {
    const vals = rows.map((r) => Number(r.amount)).filter(Number.isFinite);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };

  table.methods = {
    findOne: async (opts = {}) => { table.calls.push(['findOne', opts]); return table.rows.find((r) => matches(r, opts.where)) || null; },
    findByPk: async (id) => table.rows.find((r) => r.id === id) || null,
    findAll: async (opts = {}) => { table.calls.push(['findAll', opts]); return table.rows.filter((r) => matches(r, opts.where)).slice(0, opts.limit || undefined); },
    findAndCountAll: async (opts = {}) => {
      table.calls.push(['findAndCountAll', opts]);
      const all = table.rows.filter((r) => matches(r, opts.where));
      const off = opts.offset || 0;
      return { count: all.length, rows: all.slice(off, off + (opts.limit || all.length)) };
    },
    count: async (opts = {}) => table.rows.filter((r) => matches(r, opts.where)).length,
    sum: async (_field, opts = {}) => sumOf(table.rows.filter((r) => matches(r, opts.where))),
    create: async (data) => { table.calls.push(['create', data]); return table.add(data); },
    destroy: async (opts = {}) => {
      const hit = table.rows.filter((r) => matches(r, opts.where));
      hit.forEach((r) => table.rows.splice(table.rows.indexOf(r), 1));
      table.calls.push(['destroy-where', opts.where]);
      return hit.length;
    },
    update: async (patch, opts = {}) => {
      const hit = table.rows.filter((r) => matches(r, opts.where));
      for (const r of hit) await r.update(patch);
      return [hit.length];
    },
  };

  table.install = (mock, model) => {
    for (const [name, fn] of Object.entries(table.methods)) mock.method(model, name, fn);
    return table;
  };
  return table;
}

module.exports = { fakeTable };
