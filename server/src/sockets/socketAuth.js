const Session = require('../models/Session');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io middleware — runs before 'connection' event.
 *
 * Expected handshake.auth:
 *   { sessionId, role: 'host' | 'participant', nickname?, token? }
 *
 * Hosts must supply a valid JWT token.
 * Participants only need sessionId + nickname.
 */
const socketAuthMiddleware = async (socket, next) => {
  const { sessionId, role, nickname, token: authToken } = socket.handshake.auth;
  
  // Get token from cookie or fallback to auth payload
  let token = authToken;
  if (socket.handshake.headers.cookie) {
    const cookies = socket.handshake.headers.cookie.split(';').reduce((res, c) => {
      const [key, val] = c.trim().split('=');
      return { ...res, [key]: decodeURIComponent(val) };
    }, {});
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
