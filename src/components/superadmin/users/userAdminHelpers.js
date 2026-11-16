/**
 * Pure helpers for Super Admin › User Management (kept separate so they can
 * be unit tested and reused by the sidebar).
 */

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Label and badge classes for a user's account status. */
export function statusInfo(user) {
  switch (user?.status) {
    case 'active':
      return { label: 'Active', className: 'bg-buy-muted text-buy-muted-foreground border-buy/30' };
    case 'inactive':
      return { label: 'Deactivated', className: 'bg-surface-2 text-muted-foreground border-border' };
    case 'suspended': {
      const until = user.suspended_until ? formatDate(user.suspended_until) : null;
      return { label: until ? `Suspended until ${until}` : 'Suspended', className: 'bg-hold-muted text-hold-muted-foreground border-hold/30' };
    }
    case 'banned':
      return { label: 'Blocked', className: 'bg-sell-muted text-sell-muted-foreground border-sell/30' };
    case 'pending':
      return { label: 'Pending', className: 'bg-surface-2 text-muted-foreground border-border' };
    default:
      return { label: 'Unknown', className: 'bg-surface-2 text-muted-foreground border-border' };
  }
}

/** True when the account is not active and Reactivate applies. */
export const isRestricted = (user) => ['inactive', 'suspended', 'banned', 'pending'].includes(user?.status);

export const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Deactivated' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Blocked' },
];

export const ROLE_FILTERS = [
  { value: 'all', label: 'All roles' },
  { value: 'user', label: 'User' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'finfluencer', label: 'Finfluencer' },
  { value: 'portfolio_manager', label: 'Portfolio Manager' },
  { value: 'sub_admin', label: 'Sub Admin' },
  { value: 'custom', label: 'Custom role' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

/** Whether a row menu has anything to offer. */
export const hasAnyAction = (actions) => Boolean(actions && Object.values(actions).some(Boolean));

/**
 * Which Super Admin sidebar sections `access` (GET /admin/access/me) opens.
 * Super admins and admins see everything; a sub-admin sees the sections their
 * permissions map to; anyone else sees nothing.
 */
export function visibleSections(access, allSections) {
  if (!access) return [];
  if (access.is_super_admin || access.role === 'admin') return allSections;
  const allowed = new Set(access.sections || []);
  return allSections.filter((s) => allowed.has(s));
}
