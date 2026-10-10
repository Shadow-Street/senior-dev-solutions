import { createSlice } from '@reduxjs/toolkit';

/**
 * In-app notifications.
 *
 * Read state is the boolean `is_read`, matching the column. The panel used to
 * track a `status: 'read' | 'unread'` string the table does not have, so the
 * unread count was permanently zero; keeping the shape honest here stops that
 * recurring.
 */
const initialState = {
  items: [],
  loading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationsLoading(state) {
      state.loading = true;
      state.error = null;
    },
    notificationsLoaded(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : [];
      state.loading = false;
    },
    notificationsFailed(state, action) {
      state.loading = false;
      state.error = action.payload || 'Could not load notifications';
    },
    notificationRead(state, action) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item) item.is_read = true;
    },
    allNotificationsRead(state) {
      state.items.forEach((n) => {
        n.is_read = true;
      });
    },
    notificationsCleared(state) {
      state.items = [];
      state.error = null;
    },
  },
});

export const {
  notificationsLoading,
  notificationsLoaded,
  notificationsFailed,
  notificationRead,
  allNotificationsRead,
  notificationsCleared,
} = notificationsSlice.actions;

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) =>
  state.notifications.items.filter((n) => !n.is_read).length;

export default notificationsSlice.reducer;
