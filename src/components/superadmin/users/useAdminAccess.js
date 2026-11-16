import { createContext, useCallback, useEffect, useState } from 'react';
import { adminUsersApi } from './adminUsersApi';

/**
 * The caller's access for the screens under User Management, provided once by
 * superadmin/UserManagement.jsx (read through context, the codebase's
 * no-propTypes style).
 */
export const AdminAccessContext = createContext(null);

/**
 * The signed-in user's admin-panel access (GET /api/admin/access/me):
 * { role, is_super_admin, is_staff, permissions, sections, custom_role }.
 * Only decides what the panel shows; the API enforces every permission.
 */
export default function useAdminAccess(enabled = true) {
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccess(await adminUsersApi.myAccess());
    } catch (e) {
      setAccess(null);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
    else setLoading(false);
  }, [enabled, load]);

  const can = useCallback((key) => Boolean(access?.permissions?.includes(key)), [access]);
  return { access, loading, error, reload: load, can };
}
