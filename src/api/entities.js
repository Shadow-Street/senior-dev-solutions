import apiClient, { authAPI, User as BaseUser } from "../lib/apiClient";

// Re-export all generic entity APIs from the central apiClient
export * from "../lib/apiClient";

import { createEntityAPI } from "../lib/apiClient";

export const Announcement = createEntityAPI("/announcements");

// ---- Financial Audit Logs ----
export const FinancialAuditLog = createEntityAPI("/financials/audit-logs");

// ---- Ticketing (RefundManagement.jsx expects Ticket) ----
export const Ticket = createEntityAPI("/events/tickets");

// ---- Alerts System ----
export const AlertLog = createEntityAPI("/alerts/logs");

// ---- Chat Room Subscription ----
export const RoomSubscription = createEntityAPI("/chatrooms/subscriptions");

// ---- Chat Room Invites ----
export const ChatRoomInvite = createEntityAPI("/chat-management/invites");

// ---- Chat Room Scheduling / Automation ----
export const ChatRoomSchedule = createEntityAPI("/chat-management/automations");

// ---- VIP / Premium Customization ----
export const VIPCustomization = createEntityAPI("/chat-management/vip-features");

// ---- Investment Allocations ----
export const InvestmentAllocation = createEntityAPI("/investments/allocations");

// ---- Educators ----
export const Educator = createEntityAPI("/educators");


// Backwards-compatible User helper with extra methods that existing code relies on
export const User = {
  ...BaseUser,
  /**
   * Get the currently authenticated user.
   * Wraps authAPI.me() so existing calls to User.me() keep working.
   */
  async me() {
    return authAPI.me();
  },

  /**
   * Update the currently authenticated user's data.
   * Maps to the /users/me endpoint used by the backend.
   */
  async updateMyUserData(updates) {
    const response = await apiClient.put("/users/me", updates);
    return response.data;
  },

  /**
   * Logout helper used throughout the frontend.
   * Delegates to authAPI.logout() and returns a resolved Promise
   * so existing `await User.logout()` calls remain valid.
   */
  async logout() {
    authAPI.logout();
    return Promise.resolve();
  },
};
