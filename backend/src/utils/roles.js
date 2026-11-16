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
 * The roles an administrator can pick in User Management, lowest first.
 * `sub_admin` is the staff role whose admin-panel access is limited to the
 * permissions granted in Roles & Permissions (directly, or through a custom
 * role assigned on top of it).
 */
const ASSIGNABLE_ROLES = ['user', 'advisor', 'finfluencer', 'portfolio_manager', 'sub_admin', 'admin', 'super_admin'];

const ROLE_LABELS = {
  user: 'User',
  advisor: 'Advisor',
  finfluencer: 'Finfluencer',
  portfolio_manager: 'Portfolio Manager',
  sub_admin: 'Sub Admin',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

/** 0 = not staff, 1 = sub_admin, 2 = admin, 3 = super_admin. */
function staffRank(user) {
  const role = effectiveRole(user);
  if (role === 'super_admin') return 3;
  if (role === 'admin') return 2;
  if (role === 'sub_admin') return 1;
  return 0;
}

/**
 * Validates a role change requested by `caller` on `target`.
 * Returns `{ status, error }` when it must be refused, otherwise null.
 *
 * Rules (no caller is exempt from the first two):
 *   - neither role column may be blanked;
 *   - nobody changes their own role;
 *   - only a super admin grants or removes admin / super_admin.
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

  if (caller && target && String(caller.id) === String(target.id)) {
    return { status: 403, error: 'You cannot change your own role' };
  }

  if (isSuperAdmin(caller)) return null;

  const resulting = {
    app_role: Object.prototype.hasOwnProperty.call(updates, 'app_role') ? updates.app_role : target.app_role,
    role: Object.prototype.hasOwnProperty.call(updates, 'role') ? updates.role : target.role,
  };
  if (isSuperAdmin(resulting) || resulting.role === 'super_admin') {
    return { status: 403, error: 'Only a super admin can assign that role' };
  }

  // Granting or removing admin is a super-admin decision, whichever column
  // carries it: a latent role='admin' would win the moment app_role changed.
  const before = effectiveRole(target);
  const after = effectiveRole(resulting);
  const writesAdminColumn = ['app_role', 'role'].some(
    (k) => Object.prototype.hasOwnProperty.call(updates, k) && ADMIN_ROLES.includes(updates[k])
  );
  if (writesAdminColumn || (before !== after && (ADMIN_ROLES.includes(before) || ADMIN_ROLES.includes(after)))) {
    return { status: 403, error: 'Only a super admin can grant or remove the admin role' };
  }
  return null;
}

/**
 * Validates `caller` assigning `newRole` to `target` through User Management.
 * Returns `{ status, error }` when refused, otherwise null.
 *
 *   - newRole must be one of ASSIGNABLE_ROLES;
 *   - nobody changes their own role;
 *   - a super admin's role is changed only by a super admin;
 *   - only a super admin grants or removes admin / super_admin;
 *   - only an admin or super admin grants or removes sub_admin (a sub-admin
 *     with the role permission may hand out non-staff roles only, so nobody
 *     can create a peer with more access than they have).
 */
function checkRoleAssignment(caller, target, newRole) {
  if (!ASSIGNABLE_ROLES.includes(newRole)) return { status: 400, error: 'Unknown role' };
  if (!caller || !target) return { status: 400, error: 'Invalid request' };
  if (String(caller.id) === String(target.id)) return { status: 403, error: 'You cannot change your own role' };

  const callerRank = staffRank(caller);
  const current = effectiveRole(target);
  if (callerRank === 3) return null;

  if (current === 'super_admin' || newRole === 'super_admin' || ADMIN_ROLES.includes(current) || ADMIN_ROLES.includes(newRole)) {
    return { status: 403, error: 'Only a super admin can grant or remove the admin role' };
  }
  if ((current === 'sub_admin' || newRole === 'sub_admin') && callerRank < 2) {
    return { status: 403, error: 'Only an admin can grant or remove the sub admin role' };
  }
  return null;
}

module.exports = {
  effectiveRole,
  isSuperAdmin,
  checkRoleChange,
  checkRoleAssignment,
  staffRank,
  ADMIN_ROLES,
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
};
