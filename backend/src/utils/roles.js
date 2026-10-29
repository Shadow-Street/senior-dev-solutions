/**
 * Role helpers shared by every privilege check.
 *
 * The app stores two role columns and every check reads them as
 * `app_role || role`. Guards that looked at only one of them could be stepped
 * around — clear `app_role`, then set `role` to super_admin — so anything that
 * decides on privilege goes through `effectiveRole`.
 */
const effectiveRole = (user) => (user ? user.app_role || user.role || null : null);

const isSuperAdmin = (user) => effectiveRole(user) === 'super_admin';

/** Roles allowed to use admin-only bulk tooling. */
const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Validates a role change requested by `caller` on `target`.
 * Returns `{ status, error }` when it must be refused, otherwise null.
 */
function checkRoleChange(caller, target, updates) {
  const touchesRole = ['app_role', 'role'].some((k) => Object.prototype.hasOwnProperty.call(updates, k));
  if (!touchesRole) return null;

  // Blanking a role column changes which column wins in app_role || role.
  for (const key of ['app_role', 'role']) {
    if (Object.prototype.hasOwnProperty.call(updates, key) && !updates[key]) {
      return { status: 400, error: `${key} cannot be empty` };
    }
  }

  if (isSuperAdmin(caller)) return null;

  const resulting = {
    app_role: Object.prototype.hasOwnProperty.call(updates, 'app_role') ? updates.app_role : target.app_role,
    role: Object.prototype.hasOwnProperty.call(updates, 'role') ? updates.role : target.role,
  };
  if (isSuperAdmin(resulting) || resulting.role === 'super_admin') {
    return { status: 403, error: 'Only a super admin can assign that role' };
  }
  return null;
}

module.exports = { effectiveRole, isSuperAdmin, checkRoleChange, ADMIN_ROLES };
