import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

export function useWebSocket(roomId, user, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectDelay = options.reconnectDelay || 3000;

  const token = localStorage.getItem('accessToken');

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!roomId || !user?.id) return;

    try {
      const wsUrl = `${WS_BASE_URL}?token=${token}&roomId=${roomId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Join the room
        sendMessage({
          type: 'join_room',
          roomId,
          userId: user.id,
          userName: user.display_name || user.email
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);

        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect');
    }
  }, [roomId, user, token, maxReconnectAttempts, reconnectDelay]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      // Send leave room message before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        sendMessage({
          type: 'leave_room',
          payload: { roomId, userId: user?.id }
        });
      }
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    setMessages([]);
    setTypingUsers([]);
    setParticipants([]);
  }, [roomId, user]);

  // Send message through WebSocket
  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket not connected, message not sent');
    return false;
  }, []);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    const { type } = data;

    switch (type) {
      case 'new_message':
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
          options.onNewMessage?.(data.message);
        }
        break;

      case 'message_updated':
        // Verify if backend sends this. If not, this might be dead code, but keeping structure flattened.
        // Assuming backend might send { type, message } or { type, ...msg }
        if (data.message) {
          setMessages(prev => prev.map(m =>
            m.id === data.message.id ? { ...m, ...data.message } : m
          ));
          options.onMessageUpdated?.(data.message);
        }
        break;

      case 'message_deleted':
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
        options.onMessageDeleted?.(data);
        break;

      case 'typing_start':
        if (data.user) {
          setTypingUsers(prev => {
            if (!prev.find(u => u.userId === data.user.id)) {
              return [...prev, { userId: data.user.id, userName: data.user.name }];
            }
            return prev;
          });
        }
        break;

      case 'typing_stop':
        if (data.userId) {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }
        break;

      case 'user_joined':
        if (data.user) {
          // Backend sends user object
          const joinedUser = { ...data.user, userId: data.user.id, userName: data.user.name };
          setParticipants(prev => {
            if (!prev.find(p => p.userId === joinedUser.userId)) {
              return [...prev, joinedUser];
            }
            return prev;
          });
          options.onUserJoined?.(joinedUser);
        }
        break;

      case 'user_left':
        if (data.userId) {
          setParticipants(prev => prev.filter(p => p.userId !== data.userId));
          options.onUserLeft?.({ userId: data.userId });
        }
        break;

      case 'room_participants':
        // Assuming backend sends flattened participants list? 
        // Backend `handleJoinRoom` sends { type: 'room_joined', participants: [...] } to the joining user
        // and 'user_joined' to others.
        // There is no explicit 'room_participants' broadcast in the snippet, but maybe 'room_joined' is what we handle here?
        // Let's add 'room_joined' case.
        if (data.participants) {
          setParticipants(data.participants.map(p => ({ ...p, userId: p.id, userName: p.name })));
        }
        break;

      case 'room_joined':
        if (data.participants) {
          setParticipants(data.participants.map(p => ({ ...p, userId: p.id, userName: p.name })));
        }
        break;

      case 'reaction_update': // Backend sends this
      case 'message_reaction': // Legacy/Frontend expectation
        // Backend: { type: 'reaction_update', messageId, reactions, action, userId, emoji }
        const { messageId, reactions } = data;
        if (messageId && reactions) {
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              return { ...msg, reactions: reactions };
            }
            return msg;
          }));
          options.onReaction?.(data);
        }
        break;

      case 'message_pinned':
        // Backend doesn't show pin broadcast in snippet, but assuming it follows similar pattern if implemented
        setMessages(prev => prev.map(msg =>
          msg.id === data.messageId ? { ...msg, is_pinned: true, pinned_at: data.pinnedAt } : msg
        ));
        options.onMessagePinned?.(data);
        break;

      case 'message_unpinned':
        setMessages(prev => prev.map(msg =>
          msg.id === data.messageId ? { ...msg, is_pinned: false, pinned_at: null } : msg
        ));
        options.onMessageUnpinned?.(data);
        break;

      case 'messages_read': // Backend sends this
      case 'read_receipt': // Frontend expected this
        // Backend: { type: 'messages_read', roomId, userId, timestamp }
        options.onReadReceipt?.({ userId: data.userId, readAt: data.timestamp });
        break;

      case 'error':
        console.error('WebSocket error message:', data);
        setConnectionError(data.message);
        options.onError?.(data);
        break;

      default:
        console.log('Unknown WebSocket message type:', type);
        // Fallback: if data.payload exists, maybe it's a legacy message?
        if (data.payload) {
          console.warn('Received legacy payload structure for:', type);
        }
    }
  }, [options]);

  // Chat actions
  const sendChatMessage = useCallback((content, metadata = {}) => {
    return sendMessage({
      type: 'chat_message', // Backend expects 'chat_message'
      roomId,
      userId: user?.id,
      content,
      ...metadata // flatten metadata
    });
  }, [roomId, user, sendMessage]);

  const editMessage = useCallback((messageId, newContent) => {
    // Backend doesn't support 'edit_message' in WS service, likely handled via API
    // But if we wanted to try:
    return sendMessage({
      type: 'edit_message',
      roomId,
      messageId,
      content: newContent,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  const deleteMessage = useCallback((messageId) => {
    // Backend doesn't support 'delete_message' in WS service
    return sendMessage({
      type: 'delete_message',
      roomId,
      messageId,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  const startTyping = useCallback(() => {
    return sendMessage({
      type: 'typing_start',
      roomId,
      userId: user?.id // Backend uses this
    });
  }, [roomId, user, sendMessage]);

  const stopTyping = useCallback(() => {
    return sendMessage({
      type: 'typing_stop',
      roomId,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  const addReaction = useCallback((messageId, emoji) => {
    return sendMessage({
      type: 'message_reaction',
      roomId, // Backend needs roomId? It fetches from messageId, but safe to send
      messageId,
      emoji,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  const removeReaction = useCallback((messageId, emoji) => {
    // Backend handles toggle in same 'message_reaction'
    return sendMessage({
      type: 'message_reaction',
      roomId,
      messageId,
      emoji,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  const pinMessage = useCallback((messageId) => {
    return sendMessage({
      type: 'pin_message',
      roomId,
      messageId,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  const unpinMessage = useCallback((messageId) => {
    return sendMessage({
      type: 'unpin_message',
      roomId,
      messageId,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  const markAsRead = useCallback((messageId) => {
    return sendMessage({
      type: 'read_messages', // Backend expects 'read_messages'
      roomId,
      messageId,
      userId: user?.id
    });
  }, [roomId, user, sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    if (roomId && user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [roomId, user?.id]);

  return {
    // State
    isConnected,
    messages,
    typingUsers,
    participants,
    connectionError,

    // Connection controls
    connect,
    disconnect,

    // Chat actions
    sendMessage: sendChatMessage,
    editMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    pinMessage,
    unpinMessage,
    markAsRead,

    // Raw send for custom messages
    sendRaw: sendMessage
  };
}

export default useWebSocket;
