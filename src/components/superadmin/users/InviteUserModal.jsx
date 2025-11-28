import React, { useState } from 'react';
import { UserInvite, Role, AuditLog } from '@/api/entities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { logAuditAction, AuditActions } from '@/components/utils/auditLogger';

export default function InviteUserModal({ isOpen, onClose, onInviteSent, currentAdmin, roles }) {
  const [email, setEmail] = useState('');
  const [roleToAssign, setRoleToAssign] = useState('trader');
  const [subscriptionPlan, setSubscriptionPlan] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const inviteData = {
        email,
        role_to_assign: roleToAssign,
        subscription_plan: subscriptionPlan,
        invited_by_admin_id: currentAdmin?.id,
        invited_by_admin_name: currentAdmin?.display_name || currentAdmin?.email,
        status: 'pending',
        token,
        expires_at: expiresAt.toISOString()
      };

      await UserInvite.create(inviteData);
      
      // Log audit action
      await logAuditAction(
        currentAdmin,
        AuditActions.USER_INVITED,
        'User',
        null,
        `Invited user ${email} with role: ${roleToAssign}, subscription plan: ${subscriptionPlan}`
      );

      toast.success(`Invitation sent to ${email}`);
      
      // Reset form
      setEmail('');
      setRoleToAssign('trader');
      setSubscriptionPlan('basic');
      
      if (onInviteSent) {
        onInviteSent();
      }
      
      onClose();
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Send an invitation email to a new user with a specific role and subscription plan.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Assign Role</Label>
            <Select value={roleToAssign} onValueChange={setRoleToAssign}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trader">Trader (Default)</SelectItem>
                <SelectItem value="advisor">Advisor</SelectItem>
                <SelectItem value="finfluencer">FinInfluencer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {currentAdmin?.app_role === 'super_admin' && (
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                )}
                {roles && roles.filter(r => !r.is_system_role).map(role => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="plan">Subscription Plan</Label>
            <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic (Free)</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}