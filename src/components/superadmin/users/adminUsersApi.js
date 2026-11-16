import apiClient from '@/lib/apiClient';

/**
 * Super Admin › User Management and Roles & Permissions API
 * (backend/src/routes/admin.routes.js). Every rule is enforced server-side;
 * the screens only reflect what the server says the caller may do.
 */
const data = (p) => p.then((r) => r.data);

export const adminUsersApi = {
  myAccess: () => data(apiClient.get('/admin/access/me')),

  listUsers: (params) => data(apiClient.get('/admin/users', { params })),
  editUser: (id, body) => data(apiClient.patch(`/admin/users/${id}`, body)),
  setRole: (id, body) => data(apiClient.put(`/admin/users/${id}/role`, body)),
  setTrustScore: (id, body) => data(apiClient.put(`/admin/users/${id}/trust-score`, body)),
  setStatus: (id, body) => data(apiClient.post(`/admin/users/${id}/status`, body)),
  deleteUser: (id, confirm) => data(apiClient.delete(`/admin/users/${id}`, { data: { confirm } })),

  assignableRoles: () => data(apiClient.get('/admin/access/assignable-roles')),
  matrix: () => data(apiClient.get('/admin/access/matrix')),
  setRolePermission: (roleId, key, granted) => data(apiClient.put(`/admin/access/roles/${roleId}/permissions/${encodeURIComponent(key)}`, { granted })),
  createRole: (body) => data(apiClient.post('/admin/access/roles', body)),
  updateRole: (roleId, body) => data(apiClient.patch(`/admin/access/roles/${roleId}`, body)),
  deleteRole: (roleId) => data(apiClient.delete(`/admin/access/roles/${roleId}`)),

  listTemplates: () => data(apiClient.get('/admin/access/templates')),
  createTemplate: (body) => data(apiClient.post('/admin/access/templates', body)),
  updateTemplate: (id, body) => data(apiClient.patch(`/admin/access/templates/${id}`, body)),
  deleteTemplate: (id) => data(apiClient.delete(`/admin/access/templates/${id}`)),

  auditLog: (params) => data(apiClient.get('/admin/access/audit', { params })),
};

/** The server's message for a failed call, else `fallback`. */
export function adminErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

/** Quotes one CSV cell (RFC 4180) and defuses spreadsheet formulas. */
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
