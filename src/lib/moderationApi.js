import apiClient from '@/lib/apiClient';

/**
 * Content Moderation (backend: routes/moderation.routes.js, routes/report.routes.js,
 * services/ModerationService.js).
 *
 * Members: report a chat message, an advisor post or a user; the chat filter
 * records messages it blocked. Admins: the queue, one report's detail, decisions
 * (single and bulk) and the moderation history.
 */
export const moderationApi = {
  // Members
  report: ({ targetType, targetId, reason, note }) =>
    apiClient.post('/reports/content', { target_type: targetType, target_id: targetId, reason, note }).then((r) => r.data),
  flagBlockedMessage: ({ chatRoomId, content, violationType, severity }) =>
    apiClient.post('/moderation/flags', { chat_room_id: chatRoomId, content, violation_type: violationType, severity }).then((r) => r.data),

  // Admins
  list: (params = {}) => apiClient.get('/moderation/reports', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/moderation/reports/${encodeURIComponent(id)}`).then((r) => r.data),
  decide: (id, { action, reason, days, alsoRemove }) =>
    apiClient.post(`/moderation/reports/${encodeURIComponent(id)}/decision`, {
      action, reason, days, also_remove: Boolean(alsoRemove),
    }).then((r) => r.data),
  bulk: ({ ids, action, reason }) => apiClient.post('/moderation/reports/bulk', { ids, action, reason }).then((r) => r.data),
  history: (params = {}) => apiClient.get('/moderation/history', { params }).then((r) => r.data),
};

/** Best message from an API error; never echoes request data. */
export function moderationErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.status === 429) return error.response.data?.error || 'Too many requests. Please try again later.';
  return error?.response?.data?.error || fallback;
}

/** True when the API says migration 019 has not been applied yet. */
export const isMigrationPending = (error) => error?.response?.data?.code === 'MIGRATION_PENDING';
