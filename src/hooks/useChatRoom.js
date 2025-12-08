import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from './useWebSocket';
import { Message, ChatRoom, ChatRoomParticipant, User, MessageReadReceipt } from '@/api/entities';
import { toast } from 'sonner';

export function useChatRoom(roomId, user) {
  const [room, setRoom] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readReceipts, setReadReceipts] = useState([]);
  
  // WebSocket connection
  const ws = useWebSocket(roomId, user, {
    onNewMessage: (message) => {
      setAllMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    },
    onMessageUpdated: (message) => {
      setAllMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, ...message } : m
      ));
    },
    onMessageDeleted: ({ messageId }) => {
      setAllMessages(prev => prev.filter(m => m.id !== messageId));
    },
    onUserJoined: (payload) => {
      toast.info(`${payload.userName} joined the room`);
    },
    onUserLeft: (payload) => {
      toast.info(`${payload.userName} left the room`);
    },
    onError: (error) => {
      toast.error(error.message || 'Connection error');
    },
    onReadReceipt: (receipt) => {
      setReadReceipts(prev => {
        // Avoid duplicates
        const exists = prev.find(r => r.user_id === receipt.userId && r.message_id === receipt.messageId);
        if (exists) return prev;
        return [...prev, { user_id: receipt.userId, message_id: receipt.messageId, read_at: receipt.readAt }];
      });
    }
  });

  // Load initial room data
  const loadRoomData = useCallback(async () => {
    if (!roomId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [roomData, messagesData, usersData, receiptsData] = await Promise.all([
        ChatRoom.get(roomId).catch(() => null),
        Message.filter({ chat_room_id: roomId }, 'created_date', 100).catch(() => []),
        User.list().catch(() => []),
        MessageReadReceipt.filter({ chat_room_id: roomId }).catch(() => [])
      ]);
      
      if (!roomData) {
        setError('Room not found');
        return;
      }
      
      setRoom(roomData);
      setAllMessages(messagesData);
      setReadReceipts(receiptsData || []);
      
      // Create users lookup map
      const usersMap = usersData.reduce((acc, u) => {
        acc[u.email || u.id] = u;
        acc[u.id] = u;
        return acc;
      }, {});
      setUsers(usersMap);
      
    } catch (err) {
      console.error('Failed to load room data:', err);
      setError('Failed to load chat room');
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Merge WebSocket messages with loaded messages
  const messages = useMemo(() => {
    // Combine and deduplicate
    const messageMap = new Map();
    
    allMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    ws.messages.forEach(msg => {
      if (msg.id) {
        messageMap.set(msg.id, { ...messageMap.get(msg.id), ...msg });
      }
    });
    
    return Array.from(messageMap.values()).sort((a, b) => 
      new Date(a.created_date || a.created_at) - new Date(b.created_date || b.created_at)
    );
  }, [allMessages, ws.messages]);

  // Pinned messages
  const pinnedMessages = useMemo(() => {
    return messages.filter(m => m.is_pinned);
  }, [messages]);

  // Get typing user names (convert from objects to string array)
  const typingUsers = useMemo(() => {
    return ws.typingUsers
      .filter(t => t.userId !== user?.id)
      .map(t => t.userName || 'Someone');
  }, [ws.typingUsers, user?.id]);

  // Get user for a message
  const getUserForMessage = useCallback((message) => {
    if (message.is_bot) {
      return { display_name: 'AI Assistant', profile_color: '#6366F1', is_bot: true };
    }
    
    const userId = message.user_id || message.created_by;
    return users[userId] || {
      display_name: message.created_by?.split('@')[0] || 'Unknown',
      profile_color: '#6B7280'
    };
  }, [users]);

  // Send a chat message (with API fallback)
  const sendMessage = useCallback(async (content, metadata = {}) => {
    if (!content.trim() && !metadata.file_url) return;
    
    // Optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      chat_room_id: roomId,
      user_id: user?.id,
      created_by: user?.email,
      content,
      created_date: new Date().toISOString(),
      isOptimistic: true,
      ...metadata
    };
    
    setAllMessages(prev => [...prev, optimisticMessage]);
    
    // Try WebSocket first
    if (ws.isConnected) {
      ws.sendMessage(content, metadata);
    }
    
    // Always persist via API
    try {
      const createdMessage = await Message.create({
        chat_room_id: roomId,
        user_id: user?.id,
        created_by: user?.email,
        content,
        ...metadata
      });
      
      // Replace optimistic message with real one
      setAllMessages(prev => prev.map(m => 
        m.id === tempId ? createdMessage : m
      ));
      
      return createdMessage;
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove optimistic message on failure
      setAllMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Failed to send message');
      throw err;
    }
  }, [roomId, user, ws]);

  // Edit a message
  const editMessage = useCallback(async (messageId, newContent) => {
    try {
      const updated = await Message.update(messageId, { 
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      });
      
      setAllMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, ...updated } : m
      ));
      
      if (ws.isConnected) {
        ws.editMessage(messageId, newContent);
      }
      
      return updated;
    } catch (err) {
      console.error('Failed to edit message:', err);
      toast.error('Failed to edit message');
      throw err;
    }
  }, [ws]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await Message.delete(messageId);
      
      setAllMessages(prev => prev.filter(m => m.id !== messageId));
      
      if (ws.isConnected) {
        ws.deleteMessage(messageId);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error('Failed to delete message');
      throw err;
    }
  }, [ws]);

  // Pin/unpin a message
  const togglePinMessage = useCallback(async (messageId, isPinned) => {
    try {
      const updated = await Message.update(messageId, { 
        is_pinned: !isPinned,
        pinned_at: !isPinned ? new Date().toISOString() : null
      });
      
      setAllMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, ...updated } : m
      ));
      
      if (ws.isConnected) {
        if (!isPinned) {
          ws.pinMessage(messageId);
        } else {
          ws.unpinMessage(messageId);
        }
      }
      
      toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
      return updated;
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      toast.error('Failed to update message');
      throw err;
    }
  }, [ws]);

  // Add reaction
  const addReaction = useCallback(async (messageId, emoji) => {
    if (ws.isConnected) {
      ws.addReaction(messageId, emoji);
    }
    
    // Optimistic update
    setAllMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || [];
        return { ...m, reactions: [...reactions, { emoji, userId: user?.id, userName: user?.display_name }] };
      }
      return m;
    }));
  }, [user, ws]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!user || !roomId || messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    
    // Check if already marked
    const alreadyRead = readReceipts.find(
      r => r.user_id === user.id && r.message_id === lastMessage.id
    );
    if (alreadyRead) return;
    
    try {
      // Notify via WebSocket
      if (ws.isConnected) {
        ws.markAsRead(roomId);
      }
      
      // Persist to API
      await MessageReadReceipt.create({
        chat_room_id: roomId,
        message_id: lastMessage.id,
        user_id: user.id,
        read_at: new Date().toISOString()
      }).catch(() => {});
      
      setReadReceipts(prev => [
        ...prev, 
        { user_id: user.id, message_id: lastMessage.id, read_at: new Date().toISOString() }
      ]);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [user, roomId, messages, readReceipts, ws]);

  // Load initial data
  useEffect(() => {
    loadRoomData();
  }, [loadRoomData]);

  // Auto mark as read when messages load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [isLoading, messages.length, markMessagesAsRead]);

  return {
    // State
    room,
    messages,
    pinnedMessages,
    users,
    isLoading,
    error,
    readReceipts,
    
    // WebSocket state
    isConnected: ws.isConnected,
    typingUsers,
    participants: ws.participants,
    connectionError: ws.connectionError,
    
    // Actions
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinMessage,
    addReaction,
    startTyping: ws.startTyping,
    stopTyping: ws.stopTyping,
    markAsRead: markMessagesAsRead,
    
    // Utilities
    getUserForMessage,
    refetch: loadRoomData
  };
}

export default useChatRoom;
