
import { useState, useEffect, useCallback, useRef } from 'react';
import { PledgeSession, Pledge, PledgeExecutionRecord } from '@/api/entities';

/**
 * Custom hook for real-time pledge pool updates
 * Implements smart polling with rate limit protection
 */
export function useRealTimePledgeUpdates(userId, initialSessions = [], pollInterval = 30000) { // Changed to 30s
  const [sessions, setSessions] = useState(initialSessions);
  const [pledgeStats, setPledgeStats] = useState({});
  const [executionUpdates, setExecutionUpdates] = useState({});
  const [isPolling, setIsPolling] = useState(false); // Changed to false by default
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [error, setError] = useState(null);
  
  const pollIntervalRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 3; // Reduced from 5
  const lastPollTime = useRef(0);
  const minPollInterval = 30000; // Minimum 30 seconds between polls

  // Calculate current poll interval with exponential backoff
  const getCurrentPollInterval = useCallback(() => {
    if (retryCount.current === 0) return pollInterval;
    return Math.min(pollInterval * Math.pow(2, retryCount.current), 120000); // Max 2 minutes
  }, [pollInterval]);

  // ✅ FIX: Enhanced fetchSessionStats with better caching strategy
  const fetchSessionStats = useCallback(async (sessionId) => {
    try {
      // Use cached data if available and recent (< 30 seconds old for better freshness after pledges)
      const cacheKey = `session_stats_${sessionId}`;
      const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30000) { // Reduced from 2 minutes to 30 seconds
          return data;
        }
      }

      const sessionPledges = await Pledge.filter({ session_id: sessionId });
      const uniquePledgers = new Set(sessionPledges.map(p => p.demat_account_id)).size;
      const totalPledgeValue = sessionPledges.reduce((sum, p) => {
        const price = p.price_target || 0;
        return sum + (p.qty * price);
      }, 0);
      
      const buyPledges = sessionPledges.filter(p => p.side === 'buy').length;
      const sellPledges = sessionPledges.filter(p => p.side === 'sell').length;
      
      const stats = {
        unique_pledgers_count: uniquePledgers,
        total_pledges: sessionPledges.length,
        total_pledge_value: totalPledgeValue,
        buy_pledges_count: buyPledges,
        sell_pledges_count: sellPledges,
        latest_pledges: sessionPledges.slice(-5).reverse()
      };

      // Cache the result with shorter TTL
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: stats,
          timestamp: Date.now()
        }));
      }

      return stats;
    } catch (error) {
      console.warn('Error fetching session stats:', sessionId, error);
      return null;
    }
  }, []);

  // Fetch execution status with caching
  const fetchExecutionStatus = useCallback(async (userId) => {
    if (!userId) return {};
    
    try {
      // Use cached data if available and recent
      const cacheKey = `exec_status_${userId}`;
      const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60000) { // 1 minute cache
          return data;
        }
      }

      const userPledges = await Pledge.filter({ user_id: userId });
      const executions = {};
      
      // Only fetch executions for executed/executing pledges
      const relevantPledges = userPledges.filter(p => 
        ['executed', 'executing'].includes(p.status)
      );

      for (const pledge of relevantPledges) {
        const executionRecords = await PledgeExecutionRecord.filter(
          { pledge_id: pledge.id }, 
          '-created_date', 
          1
        );
        if (executionRecords.length > 0) {
          executions[pledge.id] = executionRecords[0];
        }
      }

      // Cache the result
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: executions,
          timestamp: Date.now()
        }));
      }
      
      return executions;
    } catch (error) {
      console.warn('Error fetching execution status:', error);
      return {};
    }
  }, []);

  // Main polling function with rate limit protection
  const pollUpdates = useCallback(async () => {
    if (!isPolling) return;

    // Check if enough time has passed since last poll
    const now = Date.now();
    const timeSinceLastPoll = now - lastPollTime.current;
    if (timeSinceLastPoll < minPollInterval) {
      console.log(`Skipping poll - only ${timeSinceLastPoll}ms since last poll`);
      return;
    }

    lastPollTime.current = now;
    setError(null);

    try {
      // Check cache first for sessions
      const sessionsCacheKey = 'active_sessions';
      const cachedSessions = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(sessionsCacheKey) : null;
      let activeSessions;

      if (cachedSessions) {
        const { data, timestamp } = JSON.parse(cachedSessions);
        if (now - timestamp < 60000) { // Use cache if < 1 minute old
          activeSessions = data;
        }
      }

      if (!activeSessions) {
        activeSessions = await PledgeSession.filter({ status: 'active' }, '-created_date');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(sessionsCacheKey, JSON.stringify({
            data: activeSessions,
            timestamp: now
          }));
        }
      }
      
      if (activeSessions.length === 0) {
        setSessions([]);
        setPledgeStats({});
        retryCount.current = 0;
        return;
      }

      // Fetch stats for each session (with caching)
      const statsPromises = activeSessions.map(session => 
        fetchSessionStats(session.id).then(stats => ({
          sessionId: session.id,
          stats
        }))
      );

      const statsResults = await Promise.all(statsPromises);
      
      // Build stats map
      const newPledgeStats = {};
      statsResults.forEach(({ sessionId, stats }) => {
        if (stats) {
          newPledgeStats[sessionId] = stats;
        }
      });

      // Enhance sessions with stats
      const enhancedSessions = activeSessions.map(session => ({
        ...session,
        ...newPledgeStats[session.id]
      }));

      // Fetch execution updates for user (with caching)
      const execUpdates = await fetchExecutionStatus(userId);

      // Update state
      setSessions(enhancedSessions);
      setPledgeStats(newPledgeStats);
      setExecutionUpdates(execUpdates);
      setLastUpdate(Date.now());
      
      // Reset retry count on success
      retryCount.current = 0;

      // Trigger notification if session is filling up
      enhancedSessions.forEach(session => {
        const stats = newPledgeStats[session.id];
        if (stats && session.capacity) {
          const fillPercentage = (stats.total_pledges / session.capacity) * 100;
          if (fillPercentage >= 80 && fillPercentage < 90) {
            notifySessionFilling(session, fillPercentage);
          } else if (fillPercentage >= 100) {
            notifySessionFull(session);
          }
        }
      });

    } catch (error) {
      console.error('Polling error:', error);
      
      // Check if it's a rate limit error
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        setError('Rate limit reached. Polling paused for 2 minutes.');
        setIsPolling(false); // Stop polling
        
        // Auto-resume after 2 minutes
        setTimeout(() => {
          setIsPolling(true);
          setError(null);
          retryCount.current = 0;
        }, 120000); // 2 minutes
      } else {
        retryCount.current = Math.min(retryCount.current + 1, maxRetries);
        
        if (retryCount.current >= maxRetries) {
          setError('Failed to fetch updates. Please refresh manually.');
          setIsPolling(false);
        }
      }
    }
  }, [isPolling, userId, fetchSessionStats, fetchExecutionStatus]);

  // Start polling on mount (only if enabled)
  useEffect(() => {
    if (!isPolling) return;

    // Initial poll
    pollUpdates();

    // Set up polling interval
    pollIntervalRef.current = setInterval(() => {
      pollUpdates();
    }, getCurrentPollInterval());

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPolling, pollUpdates, getCurrentPollInterval]);

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isPolling) {
        // Only poll if enough time has passed
        const timeSinceLastPoll = Date.now() - lastPollTime.current;
        if (timeSinceLastPoll >= minPollInterval) {
          console.log('Page visible, refreshing data...');
          pollUpdates();
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [isPolling, pollUpdates]);

  // Notification helpers
  const notifySessionFilling = (session, percentage) => {
    const key = `filling_${session.id}_${Math.floor(percentage / 10)}`;
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification('Session Filling Up!', {
          body: `${session.stock_name || session.stock_symbol} session is ${percentage.toFixed(0)}% full`,
          icon: '/favicon.ico',
          tag: key
        });
      }
    }
  };

  const notifySessionFull = (session) => {
    const key = `full_${session.id}`;
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification('Session Full!', {
          body: `${session.stock_name || session.stock_symbol} session has reached capacity`,
          icon: '/favicon.ico',
          tag: key
        });
      }
    }
  };

  // ✅ FIX: Manual refresh function that clears caches
  const refresh = useCallback(async () => {
    // Clear all caches
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('active_sessions');
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('session_stats_') || key.startsWith('exec_status_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    retryCount.current = 0;
    lastPollTime.current = 0; // Allow immediate poll
    setError(null);
    return pollUpdates();
  }, [pollUpdates]);

  // Pause/resume polling
  const pausePolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const resumePolling = useCallback(() => {
    setIsPolling(true);
    setError(null);
    retryCount.current = 0;
  }, []);

  // Enable polling (for manual control)
  const enablePolling = useCallback(() => {
    setIsPolling(true);
    setError(null);
    retryCount.current = 0;
  }, []);

  return {
    sessions,
    pledgeStats,
    executionUpdates,
    lastUpdate,
    isPolling,
    error,
    refresh,
    pausePolling,
    resumePolling,
    enablePolling
  };
}

// Push notification permission helper
export function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
    return window.Notification.requestPermission();
  }
  return Promise.resolve(typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'denied');
}
