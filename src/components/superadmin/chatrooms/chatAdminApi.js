import apiClient from '@/lib/apiClient';

/**
 * Super Admin > Chat Room Management API (backend/src/routes/chat_management.routes.js).
 * Every call is admin-only on the server; nothing here is trusted for access.
 */
const base = '/chat-management';
const data = (p) => p.then((r) => r.data);

export const chatAdminApi = {
  overview: () => data(apiClient.get(`${base}/overview`)),
  live: () => data(apiClient.get(`${base}/live`)),
  analytics: (days) => data(apiClient.get(`${base}/analytics`, { params: { days } })),

  createRoom: (room) => data(apiClient.post(`${base}/rooms`, room)),
  updateRoom: (id, room) => data(apiClient.put(`${base}/rooms/${id}`, room)),
  archiveRoom: (id) => data(apiClient.post(`${base}/rooms/${id}/archive`)),
  restoreRoom: (id) => data(apiClient.post(`${base}/rooms/${id}/restore`)),
  lockRoom: (id, reason) => data(apiClient.post(`${base}/rooms/${id}/lock`, { reason })),
  unlockRoom: (id) => data(apiClient.post(`${base}/rooms/${id}/unlock`)),
  deleteRoom: (id, confirm) => data(apiClient.delete(`${base}/rooms/${id}`, { data: { confirm } })),
  bulk: (payload) => data(apiClient.post(`${base}/rooms/bulk`, payload)),

  participants: (roomId) => data(apiClient.get(`${base}/rooms/${roomId}/participants`)),
  addParticipant: (roomId, userId, role) => data(apiClient.post(`${base}/rooms/${roomId}/participants`, { user_id: userId, role })),
  updateParticipant: (roomId, userId, patch) => data(apiClient.patch(`${base}/rooms/${roomId}/participants/${userId}`, patch)),
  removeParticipant: (roomId, userId) => data(apiClient.delete(`${base}/rooms/${roomId}/participants/${userId}`)),
  ban: (roomId, userId, reason) => data(apiClient.post(`${base}/rooms/${roomId}/bans`, { user_id: userId, reason })),
  unban: (roomId, userId) => data(apiClient.delete(`${base}/rooms/${roomId}/bans/${userId}`)),

  messages: (roomId, params) => data(apiClient.get(`${base}/rooms/${roomId}/messages`, { params })),
  deleteMessage: (id) => data(apiClient.delete(`${base}/messages/${id}`)),
  pinMessage: (id, pinned) => data(apiClient.post(`${base}/messages/${id}/${pinned ? 'pin' : 'unpin'}`)),

  roomSubscriptions: (roomId) => data(apiClient.get(`${base}/room-subscriptions`, { params: roomId ? { room_id: roomId } : {} })),
  grantAccess: (roomId, userId, days) => data(apiClient.post(`${base}/rooms/${roomId}/subscriptions`, { user_id: userId, days })),
  revokeSubscription: (id) => data(apiClient.post(`${base}/room-subscriptions/${id}/revoke`)),

  invites: () => data(apiClient.get(`${base}/invites`)),
  createInvite: (invite) => data(apiClient.post(`${base}/invites`, invite)),
  revokeInvite: (id) => data(apiClient.post(`${base}/invites/${id}/revoke`)),
  deleteInvite: (id) => data(apiClient.delete(`${base}/invites/${id}`)),

  rules: () => data(apiClient.get(`${base}/rules`)),
  createRule: (rule) => data(apiClient.post(`${base}/rules`, rule)),
  updateRule: (id, rule) => data(apiClient.put(`${base}/rules/${id}`, rule)),
  deleteRule: (id) => data(apiClient.delete(`${base}/rules/${id}`)),

  automations: () => data(apiClient.get(`${base}/automations`)),
  createAutomation: (a) => data(apiClient.post(`${base}/automations`, a)),
  updateAutomation: (id, a) => data(apiClient.put(`${base}/automations/${id}`, a)),
  deleteAutomation: (id) => data(apiClient.delete(`${base}/automations/${id}`)),

  /** Admin user search for the add-participant / grant-access pickers. */
  searchUsers: (search) => data(apiClient.get(`${base}/users`, { params: { search } })),
};

export default chatAdminApi;
