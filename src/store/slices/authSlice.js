import { createSlice } from '@reduxjs/toolkit';

/**
 * The signed-in user, centrally.
 *
 * The session already has a single owner — AuthContext — which talks to the
 * API, validates the token and keeps tabs in step. Rather than move that logic
 * and risk reintroducing the session bugs it was written to fix, the context
 * mirrors its state into this slice. Components can read the user from either
 * place and always get the same answer, and new code can use the store without
 * a second migration.
 */
const initialState = {
  user: null,
  loading: true,
  /** Where the current value came from, for debugging a stale read. */
  lastSyncedAt: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionLoading(state) {
      state.loading = true;
    },
    sessionResolved(state, action) {
      state.user = action.payload ?? null;
      state.loading = false;
      state.lastSyncedAt = Date.now();
    },
    sessionCleared(state) {
      state.user = null;
      state.loading = false;
      state.lastSyncedAt = Date.now();
    },
  },
});

export const { sessionLoading, sessionResolved, sessionCleared } = authSlice.actions;

// Selectors, so components never reach into the state shape directly.
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectIsAuthenticated = (state) => Boolean(state.auth.user);
export const selectRole = (state) => state.auth.user?.app_role || state.auth.user?.role || null;

export default authSlice.reducer;
