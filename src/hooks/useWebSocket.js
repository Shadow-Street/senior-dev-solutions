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
          payload: {
            roomId,
            userId: user.id,
            userName: user.display_name || user.email
          }
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
    const { type, payload } = data;
    
    switch (type) {
      case 'new_message':
        setMessages(prev => [...prev, payload]);
        options.onNewMessage?.(payload);
        break;
        
      case 'message_updated':
        setMessages(prev => prev.map(msg => 
          msg.id === payload.id ? { ...msg, ...payload } : msg
        ));
        options.onMessageUpdated?.(payload);
        break;
        
      case 'message_deleted':
        setMessages(prev => prev.filter(msg => msg.id !== payload.messageId));
        options.onMessageDeleted?.(payload);
        break;
        
      case 'typing_start':
        setTypingUsers(prev => {
          if (!prev.find(u => u.userId === payload.userId)) {
            return [...prev, { userId: payload.userId, userName: payload.userName }];
          }
          return prev;
        });
        break;
        
      case 'typing_stop':
        setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId));
        break;
        
      case 'user_joined':
        setParticipants(prev => {
          if (!prev.find(p => p.userId === payload.userId)) {
            return [...prev, payload];
          }
          return prev;
        });
        options.onUserJoined?.(payload);
        break;
        
      case 'user_left':
        setParticipants(prev => prev.filter(p => p.userId !== payload.userId));
        options.onUserLeft?.(payload);
        break;
        
      case 'room_participants':
        setParticipants(payload.participants || []);
        break;
        
      case 'message_reaction':
        setMessages(prev => prev.map(msg => {
          if (msg.id === payload.messageId) {
            const reactions = msg.reactions || [];
            const existingReaction = reactions.find(r => 
              r.userId === payload.userId && r.emoji === payload.emoji
            );
            if (existingReaction) {
              return { ...msg, reactions: reactions.filter(r => r !== existingReaction) };
            }
            return { ...msg, reactions: [...reactions, payload] };
          }
          return msg;
        }));
        options.onReaction?.(payload);
        break;
        
      case 'message_pinned':
        setMessages(prev => prev.map(msg => 
          msg.id === payload.messageId ? { ...msg, is_pinned: true, pinned_at: payload.pinnedAt } : msg
        ));
        options.onMessagePinned?.(payload);
        break;
        
      case 'message_unpinned':
        setMessages(prev => prev.map(msg => 
          msg.id === payload.messageId ? { ...msg, is_pinned: false, pinned_at: null } : msg
        ));
        options.onMessageUnpinned?.(payload);
        break;
        
      case 'read_receipt':
        options.onReadReceipt?.(payload);
        break;
        
      case 'error':
        console.error('WebSocket error message:', payload);
        setConnectionError(payload.message);
        options.onError?.(payload);
        break;
        
      case 'room_history':
        setMessages(payload.messages || []);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }, [options]);

  // Chat actions
  const sendChatMessage = useCallback((content, metadata = {}) => {
    return sendMessage({
      type: 'send_message',
      payload: {
        roomId,
        userId: user?.id,
        userName: user?.display_name || user?.email,
        content,
        ...metadata
      }
    });
  }, [roomId, user, sendMessage]);

  const editMessage = useCallback((messageId, newContent) => {
    return sendMessage({
      type: 'edit_message',
      payload: { roomId, messageId, content: newContent, userId: user?.id }
    });
  }, [roomId, user, sendMessage]);

  const deleteMessage = useCallback((messageId) => {
    return sendMessage({
      type: 'delete_message',
      payload: { roomId, messageId, userId: user?.id }
    });
  }, [roomId, user, sendMessage]);

  const startTyping = useCallback(() => {
    return sendMessage({
      type: 'typing_start',
      payload: { roomId, userId: user?.id, userName: user?.display_name || user?.email }
    });
  }, [roomId, user, sendMessage]);

  const stopTyping = useCallback(() => {
    return sendMessage({
      type: 'typing_stop',
      payload: { roomId, userId: user?.id }
    });
  }, [roomId, user, sendMessage]);

  const addReaction = useCallback((messageId, emoji) => {
    return sendMessage({
      type: 'add_reaction',
      payload: { roomId, messageId, emoji, userId: user?.id, userName: user?.display_name }
    });
  }, [roomId, user, sendMessage]);

  const removeReaction = useCallback((messageId, emoji) => {
    return sendMessage({
      type: 'remove_reaction',
      payload: { roomId, messageId, emoji, userId: user?.id }
    });
  }, [roomId, user, sendMessage]);

  const pinMessage = useCallback((messageId) => {
    return sendMessage({
      type: 'pin_message',
      payload: { roomId, messageId, userId: user?.id }
    });
  }, [roomId, user, sendMessage]);

  const unpinMessage = useCallback((messageId) => {
    return sendMessage({
      type: 'unpin_message',
      payload: { roomId, messageId, userId: user?.id }
    });
  }, [roomId, user, sendMessage]);

  const markAsRead = useCallback((messageId) => {
    return sendMessage({
      type: 'mark_read',
      payload: { roomId, messageId, userId: user?.id }
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
