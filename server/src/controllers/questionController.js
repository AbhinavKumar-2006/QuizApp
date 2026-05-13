const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const AppError = require('../utils/AppError');

// Internal helper — verify quiz ownership
const getOwnedQuiz = async (quizId, userId) => {
  const quiz = await Quiz.findOne({ _id: quizId, creatorId: userId });
  if (!quiz) throw new AppError('Quiz not found', 404);
  return quiz;
};

/**
 * GET /api/quizzes/:quizId/questions
 */
const getQuestions = async (req, res) => {
  await getOwnedQuiz(req.params.quizId, req.user._id);
  const questions = await Question.find({ quizId: req.params.quizId }).sort({ order: 1 });
  res.json({ success: true, count: questions.length, questions });
};

/**
 * GET /api/quizzes/:quizId/questions/:questionId
 */
const getQuestion = async (req, res) => {
  await getOwnedQuiz(req.params.quizId, req.user._id);
  const question = await Question.findOne({
    _id: req.params.questionId,
    quizId: req.params.quizId,
  });
  if (!question) throw new AppError('Question not found', 404);
  res.json({ success: true, question });
};

/**
 * POST /api/quizzes/:quizId/questions
 * Body: { text, type?, options, timeLimit?, points?, imageUrl? }
 *
 * options: [{ text, isCorrect, order }]
 * order is auto-assigned to end of list if not provided.
 */
const createQuestion = async (req, res) => {
  const quiz = await getOwnedQuiz(req.params.quizId, req.user._id);

  // Auto-assign order = current count (0-indexed end of list)
  const count = await Question.countDocuments({ quizId: quiz._id });

  const { text, type, options, timeLimit, points, imageUrl } = req.body;

  // Normalise options — ensure order field is set
  const normalisedOptions = options.map((opt, idx) => ({
    text: opt.text.trim(),
    isCorrect: opt.isCorrect || false,
    order: opt.order !== undefined ? opt.order : idx,
  }));

  const question = await Question.create({
    quizId: quiz._id,
    text: text.trim(),
    type: type || 'mcq',
    options: normalisedOptions,
    order: count,
    timeLimit: timeLimit || null,
    points: points !== undefined ? points : 1000,
    imageUrl: imageUrl || null,
  });

  res.status(201).json({ success: true, question });
};

/**
 * PATCH /api/quizzes/:quizId/questions/:questionId
 * Body: any subset of question fields
 */
const updateQuestion = async (req, res) => {
  await getOwnedQuiz(req.params.quizId, req.user._id);

  const allowed = ['text', 'type', 'options', 'timeLimit', 'points', 'imageUrl'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  // Normalise options if present
  if (updates.options) {
    updates.options = updates.options.map((opt, idx) => ({
      text: opt.text.trim(),
      isCorrect: opt.isCorrect || false,
      order: opt.order !== undefined ? opt.order : idx,
    }));
  }

  const question = await Question.findOneAndUpdate(
    { _id: req.params.questionId, quizId: req.params.quizId },
    updates,
    { new: true, runValidators: true }
  );
  if (!question) throw new AppError('Question not found', 404);

  res.json({ success: true, question });
};

/**
 * DELETE /api/quizzes/:quizId/questions/:questionId
 * Deletes the question and re-indexes the order of remaining questions.
 */
const deleteQuestion = async (req, res) => {
  await getOwnedQuiz(req.params.quizId, req.user._id);

  const question = await Question.findOneAndDelete({
    _id: req.params.questionId,
    quizId: req.params.quizId,
  });
  if (!question) throw new AppError('Question not found', 404);

  // Re-index remaining questions
  const remaining = await Question.find({ quizId: req.params.quizId }).sort({ order: 1 });
  const bulkOps = remaining.map((q, idx) => ({
    updateOne: { filter: { _id: q._id }, update: { order: idx } },
  }));
  if (bulkOps.length) await Question.bulkWrite(bulkOps);

  res.json({ success: true, message: 'Question deleted' });
};

/**
 * PATCH /api/quizzes/:quizId/questions/reorder
 * Body: { questions: [{ id, order }, ...] }
 *
 * Lets the host drag-and-drop reorder questions in the quiz builder.
 */
const reorderQuestions = async (req, res) => {
  await getOwnedQuiz(req.params.quizId, req.user._id);

  const { questions } = req.body;

  const bulkOps = questions.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id, quizId: req.params.quizId },
      update: { order },
    },
  }));
  await Question.bulkWrite(bulkOps);

  const updated = await Question.find({ quizId: req.params.quizId }).sort({ order: 1 });
  res.json({ success: true, questions: updated });
};

module.exports = {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
};
