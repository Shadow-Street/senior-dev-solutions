import apiClient from '@/lib/apiClient';
import { apiErrorMessage } from '@/lib/withdrawalsApi';

/**
 * Super Admin > Financials API (backend/src/routes/financial.routes.js).
 * Every figure is computed on the server from recorded payments; the browser
 * only chooses the period and filters.
 *
 * Ranges are { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } in India time; either may be empty.
 */

export { apiErrorMessage };

/** Query params from a range + filters, dropping empty values and 'all'. */
export function toParams(...parts) {
  const out = {};
  for (const part of parts) {
    for (const [k, v] of Object.entries(part || {})) {
      if (v === undefined || v === null || v === '' || v === 'all') continue;
      out[k] = v;
    }
  }
  return out;
}

const get = (path, params) => apiClient.get(`/financials${path}`, { params }).then((r) => r.data);
const post = (path, body) => apiClient.post(`/financials${path}`, body).then((r) => r.data);

/** Downloads a server-generated CSV (auth header included) as a file. */
export async function downloadCsv(path, params, fallbackName) {
  const res = await apiClient.get(`/financials${path}`, { params, responseType: 'blob' });
  const disposition = res.headers?.['content-disposition'] || '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const name = match ? match[1] : fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { truncated: res.headers?.['x-export-truncated'] || null };
}

export const financialsApi = {
  overview: (range) => get('/overview', toParams(range)),
  subscriptionRevenue: (range) => get('/subscription-revenue', toParams(range)),
  advisorRevenue: (range) => get('/advisor-revenue', toParams(range)),
  analytics: (range) => get('/analytics', toParams(range)),
  transactions: (range, filters, page) => get('/transactions', toParams(range, filters, page)),
  exportTransactions: (range, filters) => downloadCsv('/transactions/export.csv', toParams(range, filters), 'transactions.csv'),
  exportMonthlyReport: (range) => downloadCsv('/reports/monthly.csv', toParams(range), 'financial-report.csv'),

  refunds: (filters, page) => get('/refunds', toParams(filters, page)),
  refund: (id) => get(`/refunds/${id}`),
  approveRefund: (id, body) => post(`/refunds/${id}/approve`, body),
  rejectRefund: (id, reason) => post(`/refunds/${id}/reject`, { reason }),
  syncRefund: (id) => post(`/refunds/${id}/sync`, {}),

  reconcile: (range) => post('/reconciliation', range),
  auditLogs: (params) => get('/audit-logs', toParams(params)),
};

// ---------------------------------------------------------------------------
// Date ranges (India time)
// ---------------------------------------------------------------------------

const IST_OFFSET_MS = 330 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** Today's date parts in India time. */
function istToday(now = new Date()) {
  const d = new Date(now.getTime() + IST_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Preset ranges for the period picker. */
export function presetRange(preset, now = new Date()) {
  const { y, m, d } = istToday(now);
  switch (preset) {
    case 'this_month':
      return { from: ymd(y, m, 1), to: ymd(y, m, d) };
    case 'last_month': {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      return { from: ymd(py, pm, 1), to: ymd(py, pm, lastDay(py, pm)) };
    }
    case 'last_3_months': {
      const start = new Date(Date.UTC(y, m - 3, 1));
      return { from: ymd(start.getUTCFullYear(), start.getUTCMonth() + 1, 1), to: ymd(y, m, d) };
    }
    case 'last_30_days': {
      const start = new Date(Date.UTC(y, m - 1, d - 29));
      return { from: ymd(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()), to: ymd(y, m, d) };
    }
    case 'this_year':
      return { from: ymd(y, 1, 1), to: ymd(y, m, d) };
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

export const RANGE_PRESETS = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'this_year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

/** '2026-10' -> 'Oct 2026'. */
export function monthLabel(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  if (!m) return String(key || '');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const TIER_LABELS = { basic: 'Basic', premium: 'Premium', vip: 'VIP', other: 'Other platform plans' };
export const STATUS_LABELS = {
  success: 'Success', pending: 'Pending', abandoned: 'Abandoned', failed: 'Failed', refunded: 'Refunded', partially_refunded: 'Partly refunded',
  processing: 'Processing', processed: 'Processed', rejected: 'Rejected',
};
