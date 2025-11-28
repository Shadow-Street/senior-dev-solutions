
import React, { useState } from 'react';
import { User } from '@/api/entities';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditAction, AuditActions } from '@/components/utils/auditLogger';

export default function CreateUserModal({ isOpen, onClose, onUserCreated }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('trader');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!email || !displayName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = {
        email,
        display_name: displayName,
        app_role: role,
        mobile_number: mobileNumber || undefined, // Only include if not empty
        registration_method: 'direct_admin_creation',
      };

      const newUser = await User.create(userData);
      
      // Get current admin user for audit log
      const currentAdmin = await User.me().catch(() => null);
      
      // Log audit action
      await logAuditAction(
        currentAdmin,
        AuditActions.USER_CREATED_DIRECTLY,
        'User',
        newUser.id,
        `Directly created user ${displayName} (${email}) with role ${role}`
      );

      toast.success(`User ${displayName} created successfully`);

      // Reset form
      setEmail('');
      setDisplayName('');
      setRole('trader');
      setMobileNumber('');

      if (onUserCreated) {
        onUserCreated(newUser);
      }

      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setDisplayName('');
    setRole('trader');
    setMobileNumber('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Create New User Account
          </DialogTitle>
          <DialogDescription>
            Create a new user account directly. An invitation email will be sent to the user to set their password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name *</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="User's display name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_number">Mobile Number</Label>
            <Input
              id="mobile_number"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+1 123 456 7890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="app_role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trader">Trader</SelectItem>
                <SelectItem value="premium_trader">Premium Trader</SelectItem>
                <SelectItem value="advisor">Advisor</SelectItem>
                <SelectItem value="finfluencer">Finfluencer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating User...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
