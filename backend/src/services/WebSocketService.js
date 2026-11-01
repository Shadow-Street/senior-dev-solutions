const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { canJoinRoom, canReadRoom, canManageRoom } = require('../utils/roomAccess');

// ws defaults to 100 MiB per frame, so one client could make the server
// buffer and JSON.parse 100 MiB. Chat frames are small; media goes by URL.
const MAX_PAYLOAD = 64 * 1024;
const MAX_CONTENT_LENGTH = 10000;
// Never `email`: these profiles are broadcast to everyone in the room.
const PUBLIC_USER_ATTRIBUTES = ['id', 'name', 'profile_image_url'];

/** An error whose message is safe to show the client; anything else is generic. */
const clientError = (message) => Object.assign(new Error(message), { clientMessage: message });

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, maxPayload: MAX_PAYLOAD });
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

        // Room events below need a prior join_room, which is where access is
        // checked; without it they would broadcast into any room by id.
        case 'leave_room':
          if (this.isInRoom(userId, message.roomId)) await this.handleLeaveRoom(userId, message.roomId);
          break;

        case 'chat_message':
          await this.handleChatMessage(userId, message);
          break;

        case 'typing_start':
          if (this.isInRoom(userId, message.roomId)) await this.handleTypingStart(userId, message.roomId);
          break;

        case 'typing_stop':
          if (this.isInRoom(userId, message.roomId)) await this.handleTypingStop(userId, message.roomId);
          break;

        case 'message_reaction':
          await this.handleMessageReaction(userId, message);
          break;

        case 'read_messages':
          if (this.isInRoom(userId, message.roomId)) await this.handleReadMessages(userId, message.roomId);
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
        message: error.clientMessage || 'Request failed'
      });
    }
  }

  /** Stops live delivery of a room to a user removed from it (kick or ban). */
  evictFromRoom(userId, roomId) {
    const key = String(userId);
    for (const id of [userId, key]) {
      if (this.rooms.get(roomId)?.delete(id)) {
        this.sendToUser(id, { type: 'removed_from_room', roomId });
        this.broadcastToRoom(roomId, { type: 'user_left', roomId, userId: id, timestamp: new Date().toISOString() });
      }
    }
    if (this.rooms.get(roomId)?.size === 0) this.rooms.delete(roomId);
  }

  /** True when this user joined `roomId` over this server (access was checked then). */
  isInRoom(userId, roomId) {
    return typeof roomId === 'string' && Boolean(this.rooms.get(roomId)?.has(userId));
  }

  async handleJoinRoom(userId, roomId) {
    if (typeof roomId !== 'string' || !roomId) throw clientError('Invalid room');
    const room = await db.ChatRoom.findByPk(roomId);
    if (!room) throw clientError('Room not found');

    // Existing participants are in; anyone else must pass the same join rules
    // as POST /api/chat/:id/join (private = invite only, premium = paid).
    const existing = await db.ChatRoomParticipant.findOne({
      where: { chat_room_id: roomId, user_id: userId }
    });

    const joiner = await db.User.findByPk(userId, { attributes: { exclude: ['password'] } });
    // An existing row still has to read the room (a lapsed premium member).
    if (existing && !(await canReadRoom(joiner, roomId))) throw clientError('You cannot join this room');

    if (!existing) {
      if (!(await canJoinRoom(joiner, room))) throw clientError('You cannot join this room');

      await db.ChatRoomParticipant.create({
        chat_room_id: roomId,
        user_id: userId,
        role: 'member',
        joined_at: new Date()
      });

      await db.ChatRoom.increment('participant_count', { where: { id: roomId } });
    }

    // Add user to room tracking
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(userId);

    // Get user info
    const user = await db.User.findByPk(userId, {
      attributes: PUBLIC_USER_ATTRIBUTES
    });

    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      roomId,
      user: user?.toJSON(),
      timestamp: new Date().toISOString()
    });

    // Send room info to user
    const participants = await db.ChatRoomParticipant.findAll({
      where: { chat_room_id: roomId },
      include: [{ model: db.User, attributes: PUBLIC_USER_ATTRIBUTES }]
    });

    this.sendToUser(userId, {
      type: 'room_joined',
      room: typeof room.toJSON === 'function' ? room.toJSON() : room,
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
    if (typeof roomId !== 'string' || typeof content !== 'string' || content.length > MAX_CONTENT_LENGTH) {
      throw clientError('Invalid message');
    }

    // Verify user is in room
    const participant = await db.ChatRoomParticipant.findOne({
      where: { chat_room_id: roomId, user_id: userId }
    });

    if (!participant) {
      throw clientError('Not a member of this room');
    }
    if (participant.muted) throw clientError('You are muted in this room');

    // A participant row alone is not enough: a lapsed premium member keeps
    // their row, so read access (which re-checks premium) is required to post.
    const sender = await db.User.findByPk(userId, { attributes: { exclude: ['password'] } });
    if (!(await canReadRoom(sender, roomId))) throw clientError('Not a member of this room');

    const room = await db.ChatRoom.findByPk(roomId);
    if (room?.admin_only_post && !(await canManageRoom(sender, room))) {
      throw clientError('Only moderators can post in this room');
    }

    // Create message in database
    // A reply may only point at a message in the same room.
    let replyMessage = null;
    if (replyToId) {
      replyMessage = await db.Message.findByPk(replyToId, {
        include: [{ model: db.User, attributes: ['id', 'name'] }]
      });
      if (replyMessage && replyMessage.chat_room_id !== roomId) replyMessage = null;
    }

    const newMessage = await db.Message.create({
      chat_room_id: roomId,
      user_id: userId,
      content,
      reply_to_id: replyMessage ? replyMessage.id : null,
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
      attributes: PUBLIC_USER_ATTRIBUTES
    });


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
      attributes: ['id', 'name', 'profile_image_url']
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
    if (!roomId) {
      // room id is required for typing stop
      return;
    }
    const key = `${roomId}-${userId}`;

    // Clear timeout
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key));
      this.typingTimeouts.delete(key);
    }

    // Update database
    try {
      await db.TypingIndicator.update(
        { is_typing: false },
        { where: { chat_room_id: roomId, user_id: userId } }
      );
    } catch (error) {
      console.error(`[WebSocket] Error updating TypingIndicator for user ${userId} in room ${roomId}:`, error.message);
    }

    // Broadcast to room
    this.broadcastToRoom(roomId, {
      type: 'typing_stop',
      roomId,
      userId
    }, userId);
  }

  async handleMessageReaction(userId, message) {
    const { messageId, emoji } = message;
    if (typeof messageId !== 'string' || typeof emoji !== 'string' || !emoji || emoji.length > 32) {
      throw clientError('Invalid reaction');
    }

    // Only on a message in a room this user has joined.
    const msg = await db.Message.findByPk(messageId);
    if (!msg || !this.isInRoom(userId, msg.chat_room_id)) throw clientError('Message not found');

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
