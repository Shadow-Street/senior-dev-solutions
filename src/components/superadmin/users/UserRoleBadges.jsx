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
    super_admin: 'bg-red-100 text-red-800 border-red-200',
    admin: 'bg-orange-100 text-orange-800 border-orange-200',
    advisor: 'bg-purple-100 text-purple-800 border-purple-200',
    finfluencer: 'bg-pink-100 text-pink-800 border-pink-200',
    educator: 'bg-blue-100 text-blue-800 border-blue-200',
    organizer: 'bg-green-100 text-green-800 border-green-200',
    vendor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    trader: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {uniqueRoles.length > 0 ? (
          uniqueRoles.map((role, index) => {
            const colorClass = roleColors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
            
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
          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800">
            No Role
          </Badge>
        )}
      </div>
      {user.app_role && (
        <div className="text-xs text-gray-400 mt-1">
          Primary: {user.app_role.replace('_', ' ')}
        </div>
      )}
    </div>
  );
}