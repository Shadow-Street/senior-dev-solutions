import apiClient from '@/lib/apiClient';

/**
 * Super Admin > Poll Management endpoints (backend/src/routes/poll.routes.js,
 * /api/polls/admin/*). admin / super_admin only; vote counts in every response
 * are reconciled from PollVote rows by the server.
 */
const BASE = '/polls/admin';
const data = (promise) => promise.then((r) => r.data);

/** The browser's offset so "today" and daily buckets follow the admin's calendar. */
const tz = () => new Date().getTimezoneOffset();

export const pollAdminApi = {
  summary: () => data(apiClient.get(`${BASE}/summary`)),
  list: (params) => data(apiClient.get(`${BASE}/polls`, { params: { ...params, tz: tz() } })),
  analytics: (params) => data(apiClient.get(`${BASE}/analytics`, { params: { ...params, tz: tz() } })),
  details: (id) => data(apiClient.get(`${BASE}/polls/${id}`)),
  create: (body) => data(apiClient.post(`${BASE}/polls`, body)),
  update: (id, body) => data(apiClient.patch(`${BASE}/polls/${id}`, body)),
  /** action: close | reopen | hide | unhide | feature | unfeature */
  action: (id, action, body = {}) => data(apiClient.post(`${BASE}/polls/${id}/${action}`, body)),
  remove: (id) => data(apiClient.delete(`${BASE}/polls/${id}`)),
  getTomorrowsPick: () => data(apiClient.get(`${BASE}/tomorrows-pick`)),
  saveTomorrowsPick: (body) => data(apiClient.put(`${BASE}/tomorrows-pick`, body)),
};

/** The server's message when it sent one (validation errors are written for people). */
export function errorMessage(error, fallback) {
  const status = error?.response?.status;
  const message = error?.response?.data?.error;
  if (status === 403) return 'You do not have permission to do that.';
  if (status && status < 500 && typeof message === 'string' && message) return message;
  return fallback;
}
