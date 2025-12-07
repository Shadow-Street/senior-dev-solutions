import { useState, useEffect, useCallback } from 'react';
import { 
  Pledge, PledgeSession, Stock, Event, Subscription,
  Notification, ChatRoom, User, Poll, Course, News,
  Advisor, FinInfluencer, Referral, Watchlist, Portfolio
} from '@/api/entities';

// Generic data fetching hook
export function useApiData(entityApi, options = {}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { filters = {}, orderBy, limit = 100, autoFetch = true } = options;

  const fetch = useCallback(async (customFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const mergedFilters = { ...filters, ...customFilters };
      const result = Object.keys(mergedFilters).length > 0
        ? await entityApi.filter(mergedFilters, orderBy, limit)
        : await entityApi.list(orderBy, limit);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [entityApi, filters, orderBy, limit]);

  const create = useCallback(async (item) => {
    try {
      const created = await entityApi.create(item);
      setData(prev => [...prev, created]);
      return created;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [entityApi]);

  const update = useCallback(async (id, updates) => {
    try {
      const updated = await entityApi.update(id, updates);
      setData(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [entityApi]);

  const remove = useCallback(async (id) => {
    try {
      await entityApi.delete(id);
      setData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [entityApi]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch]);

  return { data, isLoading, error, fetch, create, update, remove, setData };
}

// User hook
export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const updateUser = useCallback(async (updates) => {
    if (!user) return;
    try {
      const updated = await User.update(user.id, updates);
      const newUser = { ...user, ...updated };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    } catch (err) {
      throw err;
    }
  }, [user]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return { user, isLoading, updateUser, logout, setUser };
}

// Pledges hook
export function usePledges(userId) {
  return useApiData(Pledge, {
    filters: userId ? { user_id: userId } : {},
    orderBy: 'created_at'
  });
}

// Stocks hook
export function useStocks() {
  return useApiData(Stock, { orderBy: 'symbol' });
}

// Events hook
export function useEvents(filters = {}) {
  return useApiData(Event, {
    filters,
    orderBy: 'start_date'
  });
}

// Chat rooms hook
export function useChatRooms() {
  return useApiData(ChatRoom, { orderBy: 'updated_at' });
}

// Notifications hook
export function useNotifications(userId) {
  const hook = useApiData(Notification, {
    filters: userId ? { user_id: userId } : {},
    orderBy: 'created_at'
  });

  const markAsRead = useCallback(async (notificationId) => {
    return hook.update(notificationId, { is_read: true, read_at: new Date().toISOString() });
  }, [hook.update]);

  const markAllAsRead = useCallback(async () => {
    const unread = hook.data.filter(n => !n.is_read);
    await Promise.all(unread.map(n => hook.update(n.id, { is_read: true })));
  }, [hook.data, hook.update]);

  return { ...hook, markAsRead, markAllAsRead };
}

// Polls hook
export function usePolls(filters = {}) {
  return useApiData(Poll, { filters, orderBy: 'created_at' });
}

// Subscriptions hook
export function useSubscriptions(userId) {
  return useApiData(Subscription, {
    filters: userId ? { user_id: userId } : {},
    orderBy: 'created_at'
  });
}

// Courses hook
export function useCourses() {
  return useApiData(Course, { orderBy: 'created_at' });
}

// News hook
export function useNews() {
  return useApiData(News, { orderBy: 'published_at' });
}

// Watchlist hook
export function useWatchlist(userId) {
  return useApiData(Watchlist, {
    filters: userId ? { user_id: userId } : {},
    orderBy: 'created_at'
  });
}

// Portfolio hook
export function usePortfolio(userId) {
  return useApiData(Portfolio, {
    filters: userId ? { user_id: userId } : {},
    orderBy: 'created_at'
  });
}

// Advisors hook
export function useAdvisors() {
  return useApiData(Advisor, { orderBy: 'created_at' });
}

// Finfluencers hook
export function useFinfluencers() {
  return useApiData(FinInfluencer, { orderBy: 'created_at' });
}

// Referrals hook
export function useReferrals(userId) {
  return useApiData(Referral, {
    filters: userId ? { referred_by: userId } : {},
    orderBy: 'created_at'
  });
}

export default {
  useApiData,
  useCurrentUser,
  usePledges,
  useStocks,
  useEvents,
  useChatRooms,
  useNotifications,
  usePolls,
  useSubscriptions,
  useCourses,
  useNews,
  useWatchlist,
  usePortfolio,
  useAdvisors,
  useFinfluencers,
  useReferrals
};
