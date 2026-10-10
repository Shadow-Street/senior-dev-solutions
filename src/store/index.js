import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import notificationsReducer from './slices/notificationsSlice';

/**
 * Central store.
 *
 * Deliberately small to begin with: the session and notifications are the two
 * pieces of state that several unrelated screens need and that caused real
 * bugs when each component kept its own copy — a stale cached user showing the
 * wrong account, and an unread count that never matched the data. Slices are
 * added as areas move over, rather than a single rewrite.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
  },
  devTools: import.meta.env.MODE !== 'production',
});

/**
 * Dev-only handle, for inspecting the store from the console without the
 * Redux DevTools extension installed. Guarded by MODE so it never ships.
 */
if (import.meta.env.MODE !== 'production' && typeof window !== 'undefined') {
  window.__protocallStore = store;
}

export default store;
