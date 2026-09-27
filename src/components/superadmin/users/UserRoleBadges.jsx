import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function UserRoleBadges({ user }) {
  // ✅ Get ALL roles - both from roles array and app_role
  const allRoles = [];
  
  // Add roles from roles array
  if (user.roles && Array.isArray(user.roles)) {
    allRoles.push(...user.roles);
  }
  
  // Add app_role if not already in the array
  if (user.app_role && !allRoles.includes(user.app_role)) {
    allRoles.push(user.app_role);
  }
  
  // Remove duplicates and sort
  const uniqueRoles = [...new Set(allRoles)].sort();
  
  // ✅ Role-specific colors
  const roleColors = {
    super_admin: 'bg-sell-muted text-sell-muted-foreground border-sell/30',
    admin: 'bg-hold-muted text-hold-muted-foreground border-hold/30',
    advisor: 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light',
    finfluencer: 'bg-premium-muted text-protocall-premium-text border-protocall-premium-light',
    educator: 'bg-premium-muted text-protocall-blue border-protocall-premium-light',
    organizer: 'bg-buy-muted text-buy-muted-foreground border-buy/30',
    vendor: 'bg-hold-muted text-hold-muted-foreground border-hold/30',
    trader: 'bg-surface-2 text-foreground border-border'
  };
  
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {uniqueRoles.length > 0 ? (
          uniqueRoles.map((role, index) => {
            const colorClass = roleColors[role] || 'bg-surface-2 text-foreground border-border';
            
            return (
              <Badge
                key={`${role}-${index}`}
                variant="outline"
                className={`text-xs font-medium ${colorClass}`}
              >
                {role.replace('_', ' ')}
              </Badge>
            );
          })
        ) : (
          <Badge variant="outline" className="text-xs bg-surface-2 text-foreground">
            No Role
          </Badge>
        )}
      </div>
      {user.app_role && (
        <div className="text-xs text-muted-foreground mt-1">
          Primary: {user.app_role.replace('_', ' ')}
        </div>
      )}
    </div>
  );
}