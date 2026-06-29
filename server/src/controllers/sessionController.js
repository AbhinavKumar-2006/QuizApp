const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Question = require('../models/Question');
const Response = require('../models/Response');
const Quiz = require('../models/Quiz');
const AppError = require('../utils/AppError');
const { generateJoinCode } = require('../utils/joinCode');

/**
 * POST /api/sessions
 * Host creates a new live session from one of their quizzes.
 * Body: { quizId }
 */
const createSession = async (req, res) => {
  const { quizId } = req.body;

  const quiz = await Quiz.findOne({ _id: quizId, creatorId: req.user._id });
  if (!quiz) throw new AppError('Quiz not found', 404);

  // Ensure quiz has at least one question before launching
  const questionCount = await Question.countDocuments({ quizId });
  if (questionCount === 0) {
    throw new AppError('Cannot start a session — quiz has no questions', 400);
  }

  // Generate unique join code (retry on rare collision)
  let joinCode;
  let attempts = 0;
  do {
    joinCode = generateJoinCode();
    attempts++;
    if (attempts > 10) throw new AppError('Failed to generate unique join code', 500);
  } while (await Session.findOne({ joinCode }));

  const session = await Session.create({
    quizId,
    hostId: req.user._id,
    joinCode,
  });

  res.status(201).json({ success: true, session });
};

/**
 * GET /api/sessions
 * Host fetches all their past and current sessions.
 */
const getMySessions = async (req, res) => {
  const filter = { hostId: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const sessions = await Session.find(filter)
    .populate('quizId', 'title')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: sessions.length, sessions });
};

/**
 * GET /api/sessions/:sessionId
 * Host fetches full session state + current participants.
 */
const getSession = async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.sessionId,
    hostId: req.user._id,
  })
    .populate('quizId', 'title defaultTimeLimit')
    .populate('currentQuestionId');

  if (!session) throw new AppError('Session not found', 404);

  const participants = await Participant.find({ sessionId: session._id })
    .sort({ totalScore: -1 })
    .select('nickname totalScore rank isConnected createdAt');

  let activeState = null;
  if (session.status === 'active' && session.currentQuestionId) {
    const totalQuestions = await Question.countDocuments({ quizId: session.quizId._id });
    const answerCount = await Response.countDocuments({ 
      sessionId: session._id, 
      questionId: session.currentQuestionId._id 
    });
    
    const timeLimit = session.currentQuestionId.timeLimit || session.quizId.defaultTimeLimit || 30;

    activeState = {
      question: session.currentQuestionId,
      index: session.currentQuestionIndex,
      total: totalQuestions,
      timeLimit,
      questionStartedAt: session.questionStartedAt,
      answerCount,
    };
  }

  res.json({ success: true, session, participants, activeState });
};

/**
 * GET /api/sessions/join/:code
 * PUBLIC — participant looks up a session by its 6-char join code.
 * Only returns info needed to render the waiting room.
 */
const lookupByCode = async (req, res) => {
  const joinCode = req.params.code.toUpperCase().trim();

  const session = await Session.findOne({
    joinCode,
    status: { $in: ['waiting', 'active'] },
  }).populate('quizId', 'title description');

  if (!session) {
    throw new AppError('No active session found with that code', 404);
  }

  res.json({
    success: true,
    session: {
      _id: session._id,
      joinCode: session.joinCode,
      status: session.status,
      quiz: session.quizId,
    },
  });
};

/**
 * GET /api/sessions/:sessionId/leaderboard
 * PUBLIC — returns live leaderboard (used by participants and host).
 */
const getLeaderboard = async (req, res) => {
  const participants = await Participant.find({ sessionId: req.params.sessionId })
    .sort({ totalScore: -1, createdAt: 1 })
    .select('nickname totalScore rank isConnected');

  res.json({ success: true, count: participants.length, leaderboard: participants });
};

/**
 * GET /api/sessions/:sessionId/results
 * HOST ONLY — post-game analytics: per-question breakdown with all responses.
 */
const getSessionResults = async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.sessionId,
    hostId: req.user._id,
  });
  if (!session) throw new AppError('Session not found', 404);

  // Aggregate per-question stats
  const questions = await Question.find({ quizId: session.quizId }).sort({ order: 1 });

  const results = await Promise.all(
    questions.map(async (q) => {
      const responses = await Response.find({
        sessionId: session._id,
        questionId: q._id,
      })
        .populate('participantId', 'nickname')
        .select('participantId selectedOptionId isCorrect score responseTimeMs answeredAt');

      const totalAnswers = responses.length;
      const correctAnswers = responses.filter((r) => r.isCorrect).length;

      // Option-level breakdown
      const optionBreakdown = q.options.map((opt) => ({
        optionId: opt._id,
        text: opt.text,
        isCorrect: opt.isCorrect,
        count: responses.filter(
          (r) => r.selectedOptionId?.toString() === opt._id.toString()
        ).length,
      }));

      return {
        question: { _id: q._id, text: q.text, type: q.type, order: q.order },
        totalAnswers,
        correctAnswers,
        accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
        optionBreakdown,
        responses,
      };
    })
  );

  const finalLeaderboard = await Participant.find({ sessionId: session._id })
    .sort({ totalScore: -1, createdAt: 1 })
    .select('nickname totalScore rank');

  res.json({ success: true, session, results, finalLeaderboard });
};

/**
 * DELETE /api/sessions/:sessionId
 * Host deletes a session and all its responses/participants.
 * Only allowed if session is ended or waiting.
 */
const deleteSession = async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.sessionId,
    hostId: req.user._id,
  });
  if (!session) throw new AppError('Session not found', 404);

  if (session.status === 'active') {
    throw new AppError('Cannot delete an active session. End it first.', 400);
  }

  await Participant.deleteMany({ sessionId: session._id });
  await Response.deleteMany({ sessionId: session._id });
  await Session.findByIdAndDelete(session._id);

  res.json({ success: true, message: 'Session deleted' });
};

module.exports = {
  createSession,
  getMySessions,
  getSession,
  lookupByCode,
  getLeaderboard,
  getSessionResults,
  deleteSession,
};
