import apiClient from '@/lib/apiClient';

/**
 * Advisor bank accounts, advisor withdrawals and the admin review API (BE-11).
 * All calls go through the shared axios client. Account numbers are only ever
 * sent to the server (create / change); no endpoint returns one, apart from the
 * audited admin bank-details reveal.
 */

/** Best message from an API error: field details, then server message, then fallback. */
export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (data?.details && typeof data.details === 'object') {
    const first = Object.values(data.details).find((v) => typeof v === 'string');
    if (first) return first;
  }
  return data?.error || fallback;
}

export const bankAccountsApi = {
  list: () => apiClient.get('/advisors/bank-accounts').then((r) => r.data),
  create: (payload) => apiClient.post('/advisors/bank-accounts', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/advisors/bank-accounts/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/advisors/bank-accounts/${id}`).then((r) => r.data),
  setPrimary: (id) => apiClient.post(`/advisors/bank-accounts/${id}/primary`).then((r) => r.data),
};

export const withdrawalsApi = {
  summary: () => apiClient.get('/advisors/withdrawals/summary').then((r) => r.data),
  list: (params = {}) => apiClient.get('/advisors/withdrawals', { params }).then((r) => r.data),
  create: (payload) => apiClient.post('/advisors/withdrawals', payload).then((r) => r.data),
  cancel: (id) => apiClient.post(`/advisors/withdrawals/${id}/cancel`).then((r) => r.data),
};

export const adminWithdrawalsApi = {
  list: (params = {}) => apiClient.get('/admin/withdrawals', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/admin/withdrawals/${id}`).then((r) => r.data),
  approve: (id, payload = {}) => apiClient.post(`/admin/withdrawals/${id}/approve`, payload).then((r) => r.data),
  reject: (id, payload) => apiClient.post(`/admin/withdrawals/${id}/reject`, payload).then((r) => r.data),
  markPaid: (id, payload) => apiClient.post(`/admin/withdrawals/${id}/mark-paid`, payload).then((r) => r.data),
  balance: (id) => apiClient.get(`/admin/withdrawals/${id}/balance`).then((r) => r.data),
  bankDetails: (id) => apiClient.get(`/admin/withdrawals/${id}/bank-details`).then((r) => r.data),
};
