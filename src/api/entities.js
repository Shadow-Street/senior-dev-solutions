import apiClient, { authAPI, User as BaseUser } from "../lib/apiClient";

// Re-export all generic entity APIs from the central apiClient
export * from "../lib/apiClient";

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
