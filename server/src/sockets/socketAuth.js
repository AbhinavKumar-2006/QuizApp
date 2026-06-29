const Session = require('../models/Session');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { parseCookie } = require('cookie');

/**
 * Socket.io middleware — runs before 'connection' event.
 *
 * Expected handshake.auth:
 *   { sessionId, role: 'host' | 'participant', nickname? }
 *
 * Hosts must supply a valid JWT token.
 * Participants only need sessionId + nickname.
 */
const socketAuthMiddleware = async (socket, next) => {
  const { sessionId, role, nickname } = socket.handshake.auth;

  let token;
  if (socket.handshake.headers.cookie) {
    const cookies = parseCookie(socket.handshake.headers.cookie);
    if (cookies.token) token = cookies.token;
  }

  if (!sessionId) {
    return next(new Error('AUTH_ERROR: sessionId is required'));
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new Error('AUTH_ERROR: Session not found'));
  }

  // Attach to socket for use in handlers
  socket.sessionId = sessionId;
  socket.session = session;
  socket.role = role === 'host' ? 'host' : 'participant';

  // Validate host's JWT
  if (socket.role === 'host') {
    if (!token) return next(new Error('AUTH_ERROR: Hosts must provide a JWT token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('AUTH_ERROR: Host user not found'));
      if (session.hostId.toString() !== user._id.toString()) {
        return next(new Error('AUTH_ERROR: You are not the host of this session'));
      }
      socket.hostUser = user;
    } catch {
      return next(new Error('AUTH_ERROR: Invalid or expired token'));
    }
  }

  // Validate participant nickname
  if (socket.role === 'participant') {
    if (!nickname || !nickname.trim()) {
      return next(new Error('AUTH_ERROR: nickname is required for participants'));
    }
    socket.nickname = nickname.trim();
  }

  next();
};

module.exports = socketAuthMiddleware;
