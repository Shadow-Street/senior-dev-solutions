import { useState, useEffect, useCallback, useRef } from 'react';

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;

export function useNotificationSocket(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
  const token = localStorage.getItem('accessToken');

  const connect = useCallback(() => {
    if (!userId || !token) return;

    try {
      const wsUrl = `${WS_URL}/notifications?token=${token}&userId=${userId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Notification socket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (err) {
          console.error('Failed to parse notification message:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Notification socket error:', error);
      };

      wsRef.current.onclose = (event) => {
        console.log('Notification socket closed:', event.code);
        setIsConnected(false);

        if (event.code !== 1000 && reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, WS_RECONNECT_DELAY);
        }
      };
    } catch (error) {
      console.error('Failed to connect notification socket:', error);
    }
  }, [userId, token, WS_URL]);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'notification':
        setNotifications(prev => [data.payload, ...prev]);
        setUnreadCount(prev => prev + 1);
        break;
      
      case 'notifications_list':
        setNotifications(data.payload.notifications || []);
        setUnreadCount(data.payload.unreadCount || 0);
        break;
      
      case 'notification_read':
        setNotifications(prev => prev.map(n => 
          n.id === data.payload.notificationId ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        break;
      
      case 'all_notifications_read':
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        break;
      
      default:
        console.log('Unknown notification message type:', data.type);
    }
  }, []);

  const markAsRead = useCallback((notificationId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_read',
        payload: { notificationId }
      }));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_all_read',
        payload: { userId }
      }));
    }
  }, [userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (userId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    connect,
    disconnect
  };
}

export default useNotificationSocket;
