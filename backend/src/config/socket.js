const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    logger.debug(`User ${userId} connected via WebSocket`);

    socket.on('join_chat', (matchId) => {
      socket.join(`chat:${matchId}`);
    });

    socket.on('send_message', async (data) => {
      const { matchId, content } = data;
      io.to(`chat:${matchId}`).emit('new_message', {
        senderId: userId,
        content,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      logger.debug(`User ${userId} disconnected`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
