import { useEffect } from 'react';
import { User } from '@/api/entities';

/**
 * This component ensures SuperAdmin users have all roles in their roles array
 * Run once on mount
 */
export default function EnsureSuperAdminRoles() {
  useEffect(() => {
    const ensureSuperAdminRoles = async () => {
      try {
        const currentUser = await User.me();
        
        // Only for super_admin users
        if (currentUser && currentUser.app_role === 'super_admin') {
          const allRoles = ['super_admin', 'admin', 'trader', 'advisor', 'finfluencer', 'educator', 'organizer'];
          
          // Check if roles array exists and has all roles
          const existingRoles = currentUser.roles || [];
          const missingRoles = allRoles.filter(role => !existingRoles.includes(role));
          
          if (missingRoles.length > 0) {
            console.log('✅ Adding missing roles to SuperAdmin:', missingRoles);
            
            // Update user with all roles
            await User.update(currentUser.id, {
              roles: allRoles
            });
            
            console.log('✅ SuperAdmin roles updated successfully!');
          }
        }
      } catch (error) {
        console.error('Error ensuring SuperAdmin roles:', error);
      }
    };
    
    ensureSuperAdminRoles();
  }, []);
  
  return null; // This component doesn't render anything
}