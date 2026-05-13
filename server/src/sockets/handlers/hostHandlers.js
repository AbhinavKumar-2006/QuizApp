const Session = require('../../models/Session');
const Question = require('../../models/Question');
const Response = require('../../models/Response');
const Participant = require('../../models/Participant');
const { buildLeaderboard, stripCorrectAnswers } = require('../helpers');

/**
 * Registers all host-side socket events.
 *
 * Events listened (host → server):
 *   host:start   — start the quiz (waiting → active, send first question)
 *   host:reveal  — reveal correct answer + current leaderboard
 *   host:next    — advance to next question (or end session)
 *   host:end     — force-end the session early
 *
 * Events emitted (server → room):
 *   session:started        — { totalQuestions }
 *   session:question       — { question (no answers), index, total, timeLimit }
 *   session:reveal         — { correctOptionId, options (with counts), leaderboard }
 *   session:question_stats — { answerCount, totalParticipants } (broadcast on each answer)
 *   session:ended          — { finalLeaderboard }
 *   error                  — { message }
 */
const registerHostHandlers = (io, socket) => {
  const { sessionId } = socket;

  // ── host:start ────────────────────────────────────────────────
  socket.on('host:start', async () => {
    try {
      const session = await Session.findById(sessionId).populate('quizId');
      if (!session) return socket.emit('error', { message: 'Session not found' });
      if (session.status !== 'waiting') {
        return socket.emit('error', { message: 'Session already started' });
      }

      const questions = await Question.find({ quizId: session.quizId._id }).sort({ order: 1 });
      if (!questions.length) {
        return socket.emit('error', { message: 'Quiz has no questions' });
      }

      const firstQ = questions[0];
      const effectiveTimeLimit = firstQ.timeLimit || session.quizId.defaultTimeLimit;

      await Session.findByIdAndUpdate(sessionId, {
        status: 'active',
        currentQuestionIndex: 0,
        currentQuestionId: firstQ._id,
        startedAt: new Date(),
      });

      // Notify everyone the quiz is starting
      io.to(sessionId).emit('session:started', { totalQuestions: questions.length });

      // Broadcast first question (correct answers stripped for participants)
      io.to(sessionId).emit('session:question', {
        question: stripCorrectAnswers(firstQ.toObject()),
        index: 0,
        total: questions.length,
        timeLimit: effectiveTimeLimit,
      });
    } catch (err) {
      console.error('[host:start]', err);
      socket.emit('error', { message: 'Failed to start session' });
    }
  });

  // ── host:reveal ───────────────────────────────────────────────
  socket.on('host:reveal', async () => {
    try {
      const session = await Session.findById(sessionId);
      if (!session || session.status !== 'active') {
        return socket.emit('error', { message: 'No active session' });
      }

      const question = await Question.findById(session.currentQuestionId);
      if (!question) return socket.emit('error', { message: 'Question not found' });

      const correctOption = question.options.find((o) => o.isCorrect);

      // Build per-option response counts for the bar chart
      const optionCounts = await Promise.all(
        question.options.map(async (opt) => {
          const count = await Response.countDocuments({
            sessionId,
            questionId: question._id,
            selectedOptionId: opt._id,
          });
          return {
            optionId: opt._id,
            text: opt.text,
            isCorrect: opt.isCorrect,
            count,
          };
        })
      );

      const leaderboard = await buildLeaderboard(sessionId);

      io.to(sessionId).emit('session:reveal', {
        correctOptionId: correctOption?._id || null,
        options: optionCounts,
        leaderboard,
      });
    } catch (err) {
      console.error('[host:reveal]', err);
      socket.emit('error', { message: 'Failed to reveal answer' });
    }
  });

  // ── host:next ────────────────────────────────────────────────
  socket.on('host:next', async () => {
    try {
      const session = await Session.findById(sessionId).populate('quizId');
      if (!session || session.status !== 'active') {
        return socket.emit('error', { message: 'No active session' });
      }

      const questions = await Question.find({ quizId: session.quizId._id }).sort({ order: 1 });
      const nextIndex = session.currentQuestionIndex + 1;

      // No more questions — end session
      if (nextIndex >= questions.length) {
        await Session.findByIdAndUpdate(sessionId, {
          status: 'ended',
          endedAt: new Date(),
        });
        const finalLeaderboard = await buildLeaderboard(sessionId);
        io.to(sessionId).emit('session:ended', { finalLeaderboard });
        return;
      }

      const nextQ = questions[nextIndex];
      const effectiveTimeLimit = nextQ.timeLimit || session.quizId.defaultTimeLimit;

      await Session.findByIdAndUpdate(sessionId, {
        currentQuestionIndex: nextIndex,
        currentQuestionId: nextQ._id,
      });

      io.to(sessionId).emit('session:question', {
        question: stripCorrectAnswers(nextQ.toObject()),
        index: nextIndex,
        total: questions.length,
        timeLimit: effectiveTimeLimit,
      });
    } catch (err) {
      console.error('[host:next]', err);
      socket.emit('error', { message: 'Failed to advance question' });
    }
  });

  // ── host:end ─────────────────────────────────────────────────
  socket.on('host:end', async () => {
    try {
      await Session.findByIdAndUpdate(sessionId, {
        status: 'ended',
        endedAt: new Date(),
      });
      const finalLeaderboard = await buildLeaderboard(sessionId);
      io.to(sessionId).emit('session:ended', { finalLeaderboard });
    } catch (err) {
      console.error('[host:end]', err);
      socket.emit('error', { message: 'Failed to end session' });
    }
  });
};

module.exports = registerHostHandlers;
