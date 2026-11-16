/**
 * The admin-panel permission catalogue.
 *
 * One entry per thing a staff member can be allowed to do in the admin panel.
 * `section` is the Super Admin sidebar tab the permission opens, so the panel
 * can show a sub-admin exactly the sections they were given.
 *
 * Who holds what:
 *   super_admin  every permission, plus the super-admin-only actions below
 *   admin        every permission (admin routes accept admins everywhere)
 *   sub_admin    only what Roles & Permissions grants: the permissions of the
 *                custom role assigned to them, else those of the "sub_admin"
 *                role row
 *   anyone else  none
 *
 * Super-admin-only, never grantable: deleting users, granting or removing the
 * admin roles, and editing roles / permissions themselves (a grantable
 * "manage permissions" would let its holder grant themselves everything).
 *
 * Only permissions the API actually enforces are listed (each one has a
 * requirePermission() check on its routes). The other admin sections stay
 * admin / super-admin only on the server, so they are listed separately in
 * ADMIN_ONLY_SECTIONS and shown as "Admin only" in the matrix rather than as
 * toggles that would do nothing. To make one grantable: add its key here AND
 * put requirePermission('<key>') on every route of that section.
 *
 * `aliases` are descriptions used by the old client-side seed, which wrote
 * rows without a name or module (the matrix then grouped them under a
 * category literally called "undefined"). Matching rows are adopted so the
 * toggles saved against them survive.
 */
const PERMISSION_CATALOGUE = [
  // User Management
  { key: 'users.view', module: 'User Management', section: 'users', label: 'View users', description: 'Open User Management and see user accounts', aliases: ['View user profiles and basic information'] },
  { key: 'users.edit', module: 'User Management', section: 'users', label: 'Edit user details', description: 'Change a user\'s name and display name', aliases: ['Edit user profiles and settings'] },
  { key: 'users.roles', module: 'User Management', section: 'users', label: 'Assign roles', description: 'Assign, change and revoke non-admin roles', aliases: ['Assign and manage user roles'] },
  { key: 'users.status', module: 'User Management', section: 'users', label: 'Deactivate and reactivate users', description: 'Deactivate accounts and restore deactivated, suspended or blocked ones' },
  { key: 'users.trust', module: 'User Management', section: 'users', label: 'Adjust trust scores', description: 'Raise or lower a user\'s trust score with a logged reason' },

];

/** Super Admin sections only admins and super admins can use (not grantable yet). */
const ADMIN_ONLY_SECTIONS = [
  { section: 'dashboard', label: 'Dashboard' },
  { section: 'Advisor', label: 'Stock advisors' },
  { section: 'pms', label: 'Portfolio managers' },
  { section: 'FinInfluencer', label: 'Finfluencers' },
  { section: 'chatrooms', label: 'Chat rooms' },
  { section: 'content', label: 'Content moderation' },
  { section: 'polls', label: 'Polls' },
  { section: 'pledge-management', label: 'Pledges' },
  { section: 'ad-management', label: 'Ad campaigns' },
  { section: 'events', label: 'Events' },
  { section: 'announcements', label: 'Announcements' },
  { section: 'lifecycle', label: 'Product lifecycle' },
  { section: 'feature-hub', label: 'Feature Hub content' },
  { section: 'financials', label: 'Financials' },
  { section: 'subscriptions', label: 'Subscriptions' },
  { section: 'refunds', label: 'Refunds' },
  { section: 'alerts', label: 'System alerts' },
  { section: 'activity-logs', label: 'Activity logs' },
  { section: 'feedback', label: 'Feedback and support' },
  { section: 'settings', label: 'Platform settings' },
];

const PERMISSION_KEYS = PERMISSION_CATALOGUE.map((p) => p.key);
const PERMISSION_BY_KEY = new Map(PERMISSION_CATALOGUE.map((p) => [p.key, p]));

/** Catalogue grouped by module, in catalogue order. */
function groupedCatalogue() {
  const groups = [];
  const index = new Map();
  for (const p of PERMISSION_CATALOGUE) {
    if (!index.has(p.module)) {
      index.set(p.module, groups.length);
      groups.push({ name: p.module, permissions: [] });
    }
    groups[index.get(p.module)].permissions.push({ key: p.key, label: p.label, description: p.description, section: p.section });
  }
  return groups;
}

module.exports = { PERMISSION_CATALOGUE, PERMISSION_KEYS, PERMISSION_BY_KEY, ADMIN_ONLY_SECTIONS, groupedCatalogue };
