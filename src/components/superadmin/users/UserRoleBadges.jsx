import { Badge } from '@/components/ui/badge';

const ROLE_STYLES = {
  super_admin: 'bg-primary/10 text-primary border-primary/30',
  admin: 'bg-primary/10 text-primary border-primary/30',
  sub_admin: 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light',
  advisor: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
  portfolio_manager: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
  finfluencer: 'bg-hold-muted text-hold-muted-foreground border-hold/30',
};

const LABELS = {
  user: 'User',
  advisor: 'Advisor',
  finfluencer: 'Finfluencer',
  portfolio_manager: 'Portfolio Manager',
  sub_admin: 'Sub Admin',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

/**
 * The user's effective role (app_role || role) and, for staff, their custom
 * role. A render helper (the codebase's no-propTypes style).
 */
export function renderUserRoleBadges(user) {
  const role = user?.effective_role || user?.app_role || user?.role || null;
  if (!role) {
    return <Badge variant="outline" className="text-xs">No role</Badge>;
  }
  const label = user?.role_label || LABELS[role] || String(role).replace(/_/g, ' ');
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="outline" className={`text-xs font-medium ${ROLE_STYLES[role] || 'bg-surface-2 text-foreground border-border'}`}>
        {label}
      </Badge>
      {user?.custom_role && (
        <Badge variant="outline" className="text-xs font-medium bg-surface-2 text-foreground border-border" title="Custom role">
          {user.custom_role.name}
        </Badge>
      )}
    </div>
  );
}
