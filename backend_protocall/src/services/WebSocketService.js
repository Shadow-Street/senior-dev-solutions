const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const db = require('../models');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.rooms = new Map(); // roomId -> Set of userIds
    this.typingTimeouts = new Map(); // `${roomId}-${userId}` -> timeout

    this.init();
  }

  init() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('WebSocket server initialized');
  }

  async handleConnection(ws, req) {
    try {
      // Extract token from query string
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      // Store connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      ws.userId = userId;
      ws.isAlive = true;

      console.log(`User ${userId} connected via WebSocket`);

      // Set up ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });

      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Send connected confirmation
      this.sendToUser(userId, {
        type: 'connected',
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(4003, 'Invalid token');
    }
  }

  async handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      const userId = ws.userId;

      switch (message.type) {
        case 'join_room':
          await this.handleJoinRoom(userId, message.roomId);
          break;

        case 'leave_room':
          await this.handleLeaveRoom(userId, message.roomId);
          break;

        case 'chat_message':
          await this.handleChatMessage(userId, message);
          break;

        case 'typing_start':
          await this.handleTypingStart(userId, message.roomId);
          break;

        case 'typing_stop':
          await this.handleTypingStop(userId, message.roomId);
          break;

        case 'message_reaction':
          await this.handleMessageReaction(userId, message);
          break;

        case 'read_messages':
          await this.handleReadMessages(userId, message.roomId);
          break;

        case 'ping':
          this.sendToUser(userId, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToUser(ws.userId, {
        type: 'error',
        message: error.message
      });
    }
  }

  async handleJoinRoom(userId, roomId) {
    // Add user to room tracking
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(userId);

    // Update database
    const existing = await db.ChatRoomParticipant.findOne({
      where: { chat_room_id: roomId, user_id: userId }
    });

    if (!existing) {
      await db.ChatRoomParticipant.create({
        chat_room_id: roomId,
        user_id: userId,
        role: 'member',
        joined_at: new Date()
      });

      await db.ChatRoom.increment('participant_count', { where: { id: roomId } });
    }

    // Get user info
    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'avatar_url']
    });

    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      roomId,
      user: user?.toJSON(),
      timestamp: new Date().toISOString()
    });

    // Send room info to user
    const room = await db.ChatRoom.findByPk(roomId);
    const participants = await db.ChatRoomParticipant.findAll({
      where: { chat_room_id: roomId },
      include: [{ model: db.User, attributes: ['id', 'name', 'avatar_url'] }]
    });

    this.sendToUser(userId, {
      type: 'room_joined',
      room: room?.toJSON(),
      participants: participants.map(p => p.toJSON()),
      onlineUsers: Array.from(this.rooms.get(roomId) || [])
    });
  }

  async handleLeaveRoom(userId, roomId) {
    // Remove from room tracking
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(userId);
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }

    // Clear typing indicator
    this.handleTypingStop(userId, roomId);

    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'user_left',
      roomId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  async handleChatMessage(userId, message) {
    const { roomId, content, replyToId, messageType = 'text', mediaUrls } = message;

    // Verify user is in room
    const participant = await db.ChatRoomParticipant.findOne({
      where: { chat_room_id: roomId, user_id: userId }
    });

    if (!participant) {
      throw new Error('Not a member of this room');
    }

    // Create message in database
    const newMessage = await db.Message.create({
      chat_room_id: roomId,
      user_id: userId,
      content,
      reply_to_id: replyToId || null,
      message_type: messageType,
      media_urls: mediaUrls || null,
      is_pinned: false
    });

    // Update room last message time
    await db.ChatRoom.update(
      { last_message_at: new Date() },
      { where: { id: roomId } }
    );

    // Get user info
    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'avatar_url']
    });

    // Get reply message if exists
    let replyMessage = null;
    if (replyToId) {
      replyMessage = await db.Message.findByPk(replyToId, {
        include: [{ model: db.User, attributes: ['id', 'name'] }]
      });
    }

    const messageData = {
      type: 'new_message',
      message: {
        ...newMessage.toJSON(),
        User: user?.toJSON(),
        replyTo: replyMessage?.toJSON()
      },
      roomId,
      timestamp: new Date().toISOString()
    };

    // Broadcast to room
    this.broadcastToRoom(roomId, messageData);

    // Clear typing indicator
    this.handleTypingStop(userId, roomId);
  }

  async handleTypingStart(userId, roomId) {
    const key = `${roomId}-${userId}`;
    
    // Clear existing timeout
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key));
    }

    // Update database
    await db.TypingIndicator.upsert({
      chat_room_id: roomId,
      user_id: userId,
      is_typing: true,
      last_typed_at: new Date()
    });

    // Get user info
    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'name', 'avatar_url']
    });

    // Broadcast to room (excluding sender)
    this.broadcastToRoom(roomId, {
      type: 'typing_start',
      roomId,
      user: user?.toJSON()
    }, userId);

    // Auto-stop after 5 seconds
    const timeout = setTimeout(() => {
      this.handleTypingStop(userId, roomId);
    }, 5000);

    this.typingTimeouts.set(key, timeout);
  }

  async handleTypingStop(userId, roomId) {
    const key = `${roomId}-${userId}`;

    // Clear timeout
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key));
      this.typingTimeouts.delete(key);
    }

    // Update database
    await db.TypingIndicator.update(
      { is_typing: false },
      { where: { chat_room_id: roomId, user_id: userId } }
    );

    // Broadcast to room
    this.broadcastToRoom(roomId, {
      type: 'typing_stop',
      roomId,
      userId
    }, userId);
  }

  async handleMessageReaction(userId, message) {
    const { messageId, emoji } = message;

    // Check if reaction exists
    const existing = await db.MessageReaction.findOne({
      where: { message_id: messageId, user_id: userId, emoji }
    });

    let action;
    if (existing) {
      await existing.destroy();
      action = 'removed';
    } else {
      await db.MessageReaction.create({
        message_id: messageId,
        user_id: userId,
        emoji
      });
      action = 'added';
    }

    // Get message to find room
    const msg = await db.Message.findByPk(messageId);
    if (!msg) return;

    // Get all reactions for the message
    const reactions = await db.MessageReaction.findAll({
      where: { message_id: messageId },
      include: [{ model: db.User, attributes: ['id', 'name'] }]
    });

    // Broadcast to room
    this.broadcastToRoom(msg.chat_room_id, {
      type: 'reaction_update',
      messageId,
      reactions: reactions.map(r => r.toJSON()),
      action,
      userId,
      emoji
    });
  }

  async handleReadMessages(userId, roomId) {
    // Update last read timestamp
    await db.ChatRoomParticipant.update(
      { last_read_at: new Date() },
      { where: { chat_room_id: roomId, user_id: userId } }
    );

    // Broadcast read receipt
    this.broadcastToRoom(roomId, {
      type: 'messages_read',
      roomId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(ws) {
    const userId = ws.userId;
    
    if (userId && this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);

        // Remove user from all rooms
        this.rooms.forEach((users, roomId) => {
          if (users.has(userId)) {
            users.delete(userId);
            this.broadcastToRoom(roomId, {
              type: 'user_offline',
              userId,
              roomId
            });
          }
        });
      }
    }

    console.log(`User ${userId} disconnected from WebSocket`);
  }

  // Send to specific user (all their connections)
  sendToUser(userId, data) {
    const connections = this.clients.get(userId);
    if (connections) {
      const message = JSON.stringify(data);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  // Broadcast to all users in a room
  broadcastToRoom(roomId, data, excludeUserId = null) {
    const users = this.rooms.get(roomId);
    if (users) {
      users.forEach(userId => {
        if (userId !== excludeUserId) {
          this.sendToUser(userId, data);
        }
      });
    }
  }

  // Broadcast to all connected users
  broadcastAll(data, excludeUserId = null) {
    const message = JSON.stringify(data);
    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
        ws.send(message);
      }
    });
  }

  // Send notification to user
  async sendNotification(userId, notification) {
    // Save to database
    const notif = await db.Notification.create({
      user_id: userId,
      ...notification,
      is_read: false
    });

    // Send via WebSocket
    this.sendToUser(userId, {
      type: 'notification',
      notification: notif.toJSON()
    });
  }

  // Start heartbeat checking
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // Get online users for a room
  getOnlineUsers(roomId) {
    return Array.from(this.rooms.get(roomId) || []);
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.clients.has(userId) && this.clients.get(userId).size > 0;
  }
}

module.exports = WebSocketService;
