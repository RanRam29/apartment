const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { getJwtSecret } = require('./security');
const logger = require('../utils/logger');
const { logSystemEvent } = require('../services/systemEventService');
const { logAudit } = require('../services/auditLogService');
const { SYSTEM_CATEGORY, SYSTEM_SEVERITY, AUDIT_ACTIONS } = require('../constants/logging');
const { isAllowedCorsOrigin } = require('./corsOrigins');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      logSystemEvent({
        source: 'socket',
        category: SYSTEM_CATEGORY.SECURITY,
        severity: SYSTEM_SEVERITY.WARN,
        event: 'socket.auth.invalid_token',
        message: 'Socket connection rejected due to invalid token',
      });
      return next(new Error('Invalid token'));
    }
    try {
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'role', 'email', 'isPremium', 'isVerified'],
      });
      if (!user) return next(new Error('Invalid token'));
      socket.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        isPremium: Boolean(user.isPremium),
        isVerified: Boolean(user.isVerified),
      };
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    logger.debug(`User ${userId} connected via WebSocket`);
    logAudit({
      actorId: userId,
      actorRole: socket.user.role,
      action: AUDIT_ACTIONS.SOCKET_CONNECT,
      resourceType: 'socket',
      resourceId: socket.id,
      statusCode: 200,
      outcome: 'success',
      metadata: { transport: socket.conn.transport.name },
    });

    // Join all accepted-match chat rooms so messages arrive without opening Chat first
    void (async () => {
      try {
        const { Match } = require('../models');
        const rows = await Match.findAll({
          where: {
            status: 'accepted',
            [Op.or]: [{ tenantId: userId }, { landlordId: userId }],
          },
          attributes: ['id'],
        });
        for (const m of rows) {
          socket.join(`chat:${m.id}`);
        }
        if (rows.length) logger.debug(`User ${userId} auto-joined ${rows.length} chat rooms`);
      } catch (err) {
        logger.warn(`Socket chat auto-join failed: ${err.message}`);
      }
    })();

    // Join a specific match chat room
    socket.on('join_chat', (matchId) => {
      socket.join(`chat:${matchId}`);
      logger.debug(`User ${userId} joined chat:${matchId}`);
    });

    socket.on('leave_chat', (matchId) => {
      socket.leave(`chat:${matchId}`);
    });

    // Primary message path — persist to MongoDB then broadcast
    socket.on('send_message', async (data, ack) => {
      try {
        const { matchId, content, type = 'text', imageUrl } = data;

        if (!matchId || !content?.trim()) {
          return ack?.({ error: 'matchId and content are required' });
        }

        // Lazy-require to avoid circular dependency at module load time
        const { Message, Match } = require('../models');

        // Verify sender is a participant in an accepted match
        const match = await Match.findOne({
          where: { id: matchId, status: 'accepted' },
          attributes: ['id', 'tenantId', 'landlordId'],
        });

        if (!match || (match.tenantId !== userId && match.landlordId !== userId)) {
          return ack?.({ error: 'Unauthorized' });
        }

        const message = await Message.create({
          matchId,
          senderId: userId,
          content: content.trim(),
          type,
          imageUrl: imageUrl || null,
        });

        Match.update({ lastMessageAt: new Date() }, { where: { id: matchId } }).catch(() => {});

        const payload = {
          id: message._id,
          matchId,
          senderId: userId,
          content: message.content,
          type: message.type,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
        };

        io.to(`chat:${matchId}`).emit('new_message', payload);
        logAudit({
          actorId: userId,
          actorRole: socket.user.role,
          action: AUDIT_ACTIONS.SOCKET_MESSAGE_SEND,
          resourceType: 'chat',
          resourceId: matchId,
          statusCode: 200,
          outcome: 'success',
          metadata: { type },
        });
        ack?.({ success: true, message: payload });
      } catch (err) {
        logger.error('Socket send_message error:', err.message);
        logSystemEvent({
          source: 'socket',
          category: SYSTEM_CATEGORY.APPLICATION,
          severity: SYSTEM_SEVERITY.ERROR,
          event: 'socket.send_message.error',
          message: 'Socket send_message failed',
          actorId: userId,
          metadata: { error: err.message },
        });
        ack?.({ error: 'Failed to send message' });
      }
    });

    // Typing indicator — broadcast to other participants only
    socket.on('typing', ({ matchId }) => {
      socket.to(`chat:${matchId}`).emit('user_typing', { userId, matchId });
    });

    socket.on('stop_typing', ({ matchId }) => {
      socket.to(`chat:${matchId}`).emit('user_stop_typing', { userId, matchId });
    });

    socket.on('disconnect', () => {
      logger.debug(`User ${userId} disconnected`);
      logAudit({
        actorId: userId,
        actorRole: socket.user.role,
        action: AUDIT_ACTIONS.SOCKET_DISCONNECT,
        resourceType: 'socket',
        resourceId: socket.id,
        statusCode: 200,
        outcome: 'success',
        metadata: { reason: 'disconnect' },
      });
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
