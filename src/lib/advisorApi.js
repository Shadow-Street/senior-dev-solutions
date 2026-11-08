import apiClient from '@/lib/apiClient';

/**
 * Advisor journey endpoints (BE-16). Everything that decides who is an advisor
 * (apply, review, role) is server-side; these are thin wrappers.
 */
export const advisorApi = {
  /** The caller's own application/profile: { advisor: row | null }. */
  me: () => apiClient.get('/advisors/me').then((r) => r.data),
  /** Submit (or re-submit after rejection) an application. Status is decided by the server. */
  apply: (payload) => apiClient.post('/advisors/apply', payload).then((r) => r.data),
  /** Edit the public profile. SEBI number is read-only once approved. */
  updateMe: (payload) => apiClient.put('/advisors/me', payload).then((r) => r.data),
  /** Admin: action is 'approve' | 'reject' | 'suspend'; reject needs a reason. */
  review: (id, action, reason) => apiClient.post(`/advisors/${id}/review`, { action, reason }).then((r) => r.data),

  /** Admin: remove a profile that has no subscribers or financial history. */
  remove: (id) => apiClient.delete(`/advisors/${id}`).then((r) => r.data),

  earnings: (params = {}) => apiClient.get('/advisors/earnings', { params }).then((r) => r.data),
  refunds: () => apiClient.get('/advisors/refunds').then((r) => r.data),
  subscribers: (params = {}) => apiClient.get('/advisors/subscriptions/my-subscribers', { params }).then((r) => r.data),

  /** The advisor's own plans (active or not). */
  plans: () => apiClient.get('/advisors/plans/mine').then((r) => r.data),
  createPlan: (payload) => apiClient.post('/advisors/plans', payload).then((r) => r.data),
  updatePlan: (id, payload) => apiClient.put(`/advisors/plans/${id}`, payload).then((r) => r.data),
  deletePlan: (id) => apiClient.delete(`/advisors/plans/${id}`).then((r) => r.data),

  /** The advisor's own posts (all statuses). */
  posts: (params = {}) => apiClient.get('/advisors/posts', { params }).then((r) => r.data),
  createPost: (payload) => apiClient.post('/advisors/posts', payload).then((r) => r.data),
  updatePost: (id, payload) => apiClient.put(`/advisors/posts/${id}`, payload).then((r) => r.data),
  deletePost: (id) => apiClient.delete(`/advisors/posts/${id}`).then((r) => r.data),
  /** Published posts as the current viewer may see them (locked ones have no content). */
  feed: (advisorId, params = {}) => apiClient.get(`/advisors/posts/by-advisor/${advisorId}`, { params }).then((r) => r.data),

  /** Public tally of active advisor calls on a stock: { buy, sell, hold, total, latest }. */
  stockSummary: (symbol) => apiClient.get(`/advisors/recommendations/stock/${encodeURIComponent(symbol)}/summary`).then((r) => r.data),

  /** Directory of approved advisors. */
  directory: (params = {}) => apiClient.get('/advisors', { params }).then((r) => r.data),
};

/** Storage keys look like private/<user id>/sebi-certificates/<file>; nothing else is ever requested. */
const PRIVATE_KEY = /^private\/[\w-]+\/[\w-]+\/[\w.-]+$/;

/**
 * Opens a private file (a SEBI certificate) in a new tab using the caller's
 * session. It takes a storage KEY, never a URL: the only request made is
 * GET /files/view/<key> on our own API, so the bearer token cannot be sent to
 * another host or path. The file is shown from a blob URL; there is no
 * fallback that opens a raw URL.
 */
export async function openPrivateFile(key) {
  if (typeof key !== 'string' || !PRIVATE_KEY.test(key) || key.includes('..')) {
    throw new Error('Not a private file key');
  }
  const res = await apiClient.get(`/files/view/${key}`, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  window.open(blobUrl, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}
