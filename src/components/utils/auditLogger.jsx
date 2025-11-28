import { AuditLog } from '@/api/entities';

/**
 * Centralized audit logging utility for tracking administrative actions
 * Usage: await logAuditAction(adminUser, 'USER_CREATED', 'User', userId, 'Created new user John Doe');
 */

export const logAuditAction = async (adminUser, action, entityType, entityId, details) => {
  try {
    if (!adminUser || !adminUser.id) {
      console.warn('Cannot log audit action: No admin user provided');
      return null;
    }

    const logEntry = {
      admin_id: adminUser.id,
      admin_name: adminUser.display_name || adminUser.email || 'Unknown Admin',
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details
    };

    const result = await AuditLog.create(logEntry);
    console.log('Audit log created:', logEntry);
    return result;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
};

// Pre-defined action types for consistency
export const AuditActions = {
  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_INVITED: 'USER_INVITED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_CREATED_DIRECTLY: 'USER_CREATED_DIRECTLY',

  // Poll Management
  POLL_CREATED: 'POLL_CREATED',
  POLL_UPDATED: 'POLL_UPDATED',
  POLL_DELETED: 'POLL_DELETED',
  POLL_SUSPENDED: 'POLL_SUSPENDED',
  POLL_REACTIVATED: 'POLL_REACTIVATED',
  POLL_PREMIUM_TOGGLED: 'POLL_PREMIUM_TOGGLED',

  // Chat Room Management
  CHATROOM_CREATED: 'CHATROOM_CREATED',
  CHATROOM_UPDATED: 'CHATROOM_UPDATED',
  CHATROOM_DELETED: 'CHATROOM_DELETED',
  CHATROOM_SUSPENDED: 'CHATROOM_SUSPENDED',

  // Content Moderation
  CONTENT_MODERATED: 'CONTENT_MODERATED',
  CONTENT_FLAGGED: 'CONTENT_FLAGGED',
  CONTENT_APPROVED: 'CONTENT_APPROVED',
  CONTENT_REJECTED: 'CONTENT_REJECTED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',

  // Settings
  SETTING_UPDATED: 'SETTING_UPDATED',
  PLATFORM_SETTING_CHANGED: 'PLATFORM_SETTING_CHANGED',

  // Roles & Permissions
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',

  // Events
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_DELETED: 'EVENT_DELETED',
  EVENT_APPROVED: 'EVENT_APPROVED',
  EVENT_REJECTED: 'EVENT_REJECTED',
  EVENT_CANCELLED: 'EVENT_CANCELLED',

  // Advisor Management
  ADVISOR_APPROVED: 'ADVISOR_APPROVED',
  ADVISOR_REJECTED: 'ADVISOR_REJECTED',
  ADVISOR_SUSPENDED: 'ADVISOR_SUSPENDED',
  ADVISOR_REACTIVATED: 'ADVISOR_REACTIVATED',

  // Finfluencer Management
  FINFLUENCER_APPROVED: 'FINFLUENCER_APPROVED',
  FINFLUENCER_REJECTED: 'FINFLUENCER_REJECTED',
  FINFLUENCER_SUSPENDED: 'FINFLUENCER_SUSPENDED',
  FINFLUENCER_REACTIVATED: 'FINFLUENCER_REACTIVATED',

  // Financial
  PAYOUT_APPROVED: 'PAYOUT_APPROVED',
  PAYOUT_REJECTED: 'PAYOUT_REJECTED',
  PAYOUT_PROCESSED: 'PAYOUT_PROCESSED',
  EXPENSE_CREATED: 'EXPENSE_CREATED',
  EXPENSE_UPDATED: 'EXPENSE_UPDATED',
  EXPENSE_DELETED: 'EXPENSE_DELETED',

  // Subscription Management
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  PROMO_CODE_CREATED: 'PROMO_CODE_CREATED',
  PLAN_CREATED: 'PLAN_CREATED',
  PLAN_UPDATED: 'PLAN_UPDATED',

  // Pledge Management
  PLEDGE_SESSION_CREATED: 'PLEDGE_SESSION_CREATED',
  PLEDGE_SESSION_UPDATED: 'PLEDGE_SESSION_UPDATED',
  PLEDGE_SESSION_EXECUTED: 'PLEDGE_SESSION_EXECUTED',
  PLEDGE_ACCESS_APPROVED: 'PLEDGE_ACCESS_APPROVED',
  PLEDGE_ACCESS_REJECTED: 'PLEDGE_ACCESS_REJECTED',

  // Refund Management
  REFUND_APPROVED: 'REFUND_APPROVED',
  REFUND_REJECTED: 'REFUND_REJECTED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',

  // Feature/Product Lifecycle
  FEATURE_ENABLED: 'FEATURE_ENABLED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  FEATURE_UPDATED: 'FEATURE_UPDATED',
  MODULE_APPROVED: 'MODULE_APPROVED',
  MODULE_REJECTED: 'MODULE_REJECTED',
};

// Helper function to format details for common operations
export const formatAuditDetails = {
  userCreated: (userName, userEmail, role) => 
    `Created new user "${userName}" (${userEmail}) with role: ${role}`,
  
  userUpdated: (userName, changes) => 
    `Updated user "${userName}". Changes: ${changes}`,
  
  userDeleted: (userName, userEmail) => 
    `Deleted user "${userName}" (${userEmail})`,
  
  userRoleChanged: (userName, oldRole, newRole) => 
    `Changed role for user "${userName}" from ${oldRole} to ${newRole}`,
  
  pollCreated: (pollTitle, stockSymbol) => 
    `Created poll "${pollTitle}" for stock ${stockSymbol}`,
  
  pollUpdated: (pollTitle, changes) => 
    `Updated poll "${pollTitle}". Changes: ${changes}`,
  
  pollDeleted: (pollTitle) => 
    `Deleted poll "${pollTitle}"`,
  
  chatroomCreated: (roomName, roomType) => 
    `Created ${roomType} chat room "${roomName}"`,
  
  chatroomUpdated: (roomName, changes) => 
    `Updated chat room "${roomName}". Changes: ${changes}`,
  
  chatroomDeleted: (roomName) => 
    `Deleted chat room "${roomName}"`,
  
  settingUpdated: (settingKey, oldValue, newValue) => 
    `Updated setting "${settingKey}" from "${oldValue}" to "${newValue}"`,
  
  advisorApproved: (advisorName) => 
    `Approved advisor application for "${advisorName}"`,
  
  advisorRejected: (advisorName, reason) => 
    `Rejected advisor application for "${advisorName}". Reason: ${reason}`,
  
  eventApproved: (eventTitle, organizerName) => 
    `Approved event "${eventTitle}" by organizer ${organizerName}`,
  
  eventRejected: (eventTitle, reason) => 
    `Rejected event "${eventTitle}". Reason: ${reason}`,
  
  payoutApproved: (amount, recipientName) => 
    `Approved payout of ₹${amount} to ${recipientName}`,
  
  payoutRejected: (amount, recipientName, reason) => 
    `Rejected payout of ₹${amount} to ${recipientName}. Reason: ${reason}`,
};

export default {
  logAuditAction,
  AuditActions,
  formatAuditDetails
};