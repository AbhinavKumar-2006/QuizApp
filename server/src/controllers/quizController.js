const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');

/**
 * GET /api/quizzes
 * Returns all quizzes belonging to the logged-in host.
 * Supports ?status=draft|published|archived filter.
 */
const getMyQuizzes = async (req, res) => {
  const filter = { creatorId: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: quizzes.length, quizzes });
};

/**
 * POST /api/quizzes
 * Body: { title, description?, defaultTimeLimit? }
 */
const createQuiz = async (req, res) => {
  const { title, description, defaultTimeLimit } = req.body;

  const quiz = await Quiz.create({
    title: title.trim(),
    description: description?.trim(),
    defaultTimeLimit,
    creatorId: req.user._id,
  });

  res.status(201).json({ success: true, quiz });
};

/**
 * GET /api/quizzes/:quizId
 * Returns quiz details + all its questions.
 */
const getQuiz = async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.quizId, creatorId: req.user._id });
  if (!quiz) throw new AppError('Quiz not found', 404);

  const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 });
  res.json({ success: true, quiz, questions });
};

/**
 * PATCH /api/quizzes/:quizId
 * Body: any subset of { title, description, status, defaultTimeLimit }
 */
const updateQuiz = async (req, res) => {
  const allowed = ['title', 'description', 'status', 'defaultTimeLimit'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const quiz = await Quiz.findOneAndUpdate(
    { _id: req.params.quizId, creatorId: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!quiz) throw new AppError('Quiz not found', 404);

  res.json({ success: true, quiz });
};

/**
 * DELETE /api/quizzes/:quizId
 * Cascade deletes all questions belonging to this quiz.
 * Does NOT delete past sessions/responses (historical data stays).
 */
const deleteQuiz = async (req, res) => {
  const quiz = await Quiz.findOneAndDelete({ _id: req.params.quizId, creatorId: req.user._id });
  if (!quiz) throw new AppError('Quiz not found', 404);

  await Question.deleteMany({ quizId: quiz._id });

  res.json({ success: true, message: 'Quiz and its questions deleted' });
};

/**
 * POST /api/quizzes/:quizId/duplicate
 * Creates a full copy of a quiz including all questions.
 */
const duplicateQuiz = async (req, res) => {
  const original = await Quiz.findOne({ _id: req.params.quizId, creatorId: req.user._id });
  if (!original) throw new AppError('Quiz not found', 404);

  const newQuiz = await Quiz.create({
    title: `${original.title} (Copy)`,
    description: original.description,
    defaultTimeLimit: original.defaultTimeLimit,
    creatorId: req.user._id,
    status: 'draft',
  });

  const questions = await Question.find({ quizId: original._id }).sort({ order: 1 });
  if (questions.length) {
    const newQuestions = questions.map((q) => ({
      quizId: newQuiz._id,
      type: q.type,
      text: q.text,
      options: q.options,
      order: q.order,
      timeLimit: q.timeLimit,
      points: q.points,
      imageUrl: q.imageUrl,
    }));
    await Question.insertMany(newQuestions);
  }

  const newQuestions = await Question.find({ quizId: newQuiz._id }).sort({ order: 1 });
  res.status(201).json({ success: true, quiz: newQuiz, questions: newQuestions });
};

module.exports = { getMyQuizzes, createQuiz, getQuiz, updateQuiz, deleteQuiz, duplicateQuiz };
