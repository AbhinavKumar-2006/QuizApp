const socketAuthMiddleware = require('./socketAuth');
const registerHostHandlers = require('./handlers/hostHandlers');
const registerParticipantHandlers = require('./handlers/participantHandlers');
const Participant = require('../models/Participant');

const initSockets = (io) => {
  // Apply auth middleware to every incoming connection
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const { sessionId, role } = socket;

    // Put socket in the session's room
    socket.join(sessionId);
    console.log(`[socket] ${role} connected | session=${sessionId} | socket=${socket.id}`);

    // Register role-specific event handlers
    if (role === 'host') {
      registerHostHandlers(io, socket);
    } else {
      registerParticipantHandlers(io, socket);
    }

    // ── Disconnect ──────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      console.log(`[socket] ${role} disconnected | socket=${socket.id} | reason=${reason}`);

      if (socket.participantId) {
        await Participant.findByIdAndUpdate(socket.participantId, { isConnected: false });

        // Notify room of updated participant list
        const participants = await Participant.find({ sessionId })
          .sort({ createdAt: 1 })
          .select('nickname isConnected totalScore');
        io.to(sessionId).emit('session:participants', { participants });
      }
    });
  });
};

module.exports = initSockets;
