const Session = require('../../models/Session');
const Participant = require('../../models/Participant');
const Question = require('../../models/Question');
const Response = require('../../models/Response');
const { calcScore } = require('../../utils/scoreCalc');

/**
 * Registers all participant-side socket events.
 *
 * Events listened (participant → server):
 *   participant:join    — register nickname, join waiting room
 *   participant:answer  — submit answer for current question
 *
 * Events emitted (server → participant):
 *   participant:joined         — { participant }
 *   participant:answer_result  — { isCorrect, score, correctOptionId }
 *   session:participants       — { participants } (broadcast to room)
 *   session:question_stats     — { answerCount, totalParticipants } (broadcast)
 *   error                      — { message }
 */
const registerParticipantHandlers = (io, socket) => {
  const { sessionId } = socket;

  // ── participant:join ──────────────────────────────────────────
  socket.on('participant:join', async ({ nickname } = {}) => {
    try {
      const name = (nickname || socket.nickname || '').trim();
      if (!name) return socket.emit('error', { message: 'nickname is required' });

      const session = await Session.findById(sessionId);
      if (!session) return socket.emit('error', { message: 'Session not found' });

      if (!['waiting', 'active'].includes(session.status)) {
        return socket.emit('error', { message: 'Session is no longer joinable' });
      }

      // Upsert: handles reconnection gracefully
      let participant = await Participant.findOneAndUpdate(
        { sessionId, nickname: name },
        { socketId: socket.id, isConnected: true },
        { new: true }
      );

      if (!participant) {
        participant = await Participant.create({
          sessionId,
          nickname: name,
          socketId: socket.id,
          isConnected: true,
        });
      }

      socket.participantId = participant._id.toString();

      // Confirm join to the joining participant
      socket.emit('participant:joined', { participant });

      // Broadcast updated participant list to everyone in the room
      const participants = await Participant.find({ sessionId })
        .sort({ createdAt: 1 })
        .select('nickname isConnected totalScore');
      io.to(sessionId).emit('session:participants', { participants });
    } catch (err) {
      if (err.code === 11000) {
        return socket.emit('error', { message: 'This nickname is already taken in this session' });
      }
      console.error('[participant:join]', err);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // ── participant:answer ────────────────────────────────────────
  socket.on('participant:answer', async ({ questionId, selectedOptionId, responseTimeMs } = {}) => {
    try {
      if (!socket.participantId) {
        return socket.emit('error', { message: 'You must join the session first' });
      }
      if (!questionId || !selectedOptionId) {
        return socket.emit('error', { message: 'questionId and selectedOptionId are required' });
      }

      // Validate session is active and question is current
      const session = await Session.findById(sessionId);
      if (!session || session.status !== 'active') {
        return socket.emit('error', { message: 'Session is not active' });
      }
      if (session.currentQuestionId?.toString() !== questionId) {
        return socket.emit('error', { message: 'This question is no longer active' });
      }

      const question = await Question.findById(questionId);
      if (!question) return socket.emit('error', { message: 'Question not found' });

      const selectedOption = question.options.id(selectedOptionId);
      if (!selectedOption) return socket.emit('error', { message: 'Invalid option' });

      const isCorrect = selectedOption.isCorrect;
      const timeLimitMs = (question.timeLimit || 30) * 1000;
      const score = isCorrect ? calcScore(question.points, responseTimeMs, timeLimitMs) : 0;

      // Save response — unique index silently prevents duplicates
      try {
        await Response.create({
          sessionId,
          participantId: socket.participantId,
          questionId,
          selectedOptionId,
          isCorrect,
          score,
          responseTimeMs: responseTimeMs || null,
        });
      } catch (err) {
        if (err.code === 11000) {
          return socket.emit('error', { message: 'You have already answered this question' });
        }
        throw err;
      }

      // Update participant cumulative score
      await Participant.findByIdAndUpdate(socket.participantId, {
        $inc: { totalScore: score },
      });

      // Send result back to this participant only
      socket.emit('participant:answer_result', {
        isCorrect,
        score,
        correctOptionId: isCorrect ? selectedOptionId : null,
      });

      // Broadcast answer progress to everyone (host shows a live counter)
      const answerCount = await Response.countDocuments({ sessionId, questionId });
      const totalParticipants = await Participant.countDocuments({ sessionId, isConnected: true });
      io.to(sessionId).emit('session:question_stats', { answerCount, totalParticipants });
    } catch (err) {
      console.error('[participant:answer]', err);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });
};

module.exports = registerParticipantHandlers;
