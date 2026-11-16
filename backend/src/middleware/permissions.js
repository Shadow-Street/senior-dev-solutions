/**
 * Permission checks for admin-panel routes. Use after `authenticate`.
 *
 *   router.get('/users', authenticate, requirePermission('users.view'), handler)
 *
 * super_admin and admin pass every permission; a sub_admin passes only what
 * Roles & Permissions granted them (services/AccessControlService.js);
 * everyone else is refused. Lookups fail closed.
 */
const Access = require('../services/AccessControlService');
const { isSuperAdmin } = require('../utils/roles');
const { PERMISSION_BY_KEY } = require('../utils/permissions');

const denied = (res) => res.status(403).json({
  error: 'You do not have permission to perform this action',
  code: 'PERMISSION_DENIED',
});

async function loadPermissions(req) {
  if (!req.adminPermissions) req.adminPermissions = await Access.permissionsFor(req.user);
  return req.adminPermissions;
}

function requirePermission(key) {
  if (!PERMISSION_BY_KEY.has(key)) throw new Error(`requirePermission: unknown permission "${key}"`);
  return async function permissionGuard(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    try {
      const permissions = await loadPermissions(req);
      if (!permissions.has(key)) return denied(res);
      return next();
    } catch (e) {
      console.error('[permissions] check failed:', e.message);
      return denied(res);
    }
  };
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Only a super admin can perform this action', code: 'SUPER_ADMIN_ONLY' });
  }
  return next();
}

module.exports = { requirePermission, requireSuperAdmin, loadPermissions };
