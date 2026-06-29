const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const {
  validateCreateQuiz,
  validateUpdateQuiz,
  validateCreateQuestion,
  validateUpdateQuestion,
  validateReorderQuestions,
} = require('../validators');
const {
  getMyQuizzes,
  createQuiz,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz,
} = require('../controllers/quizController');
const {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} = require('../controllers/questionController');

// All quiz routes require authentication
router.use(protect);

// ── Quiz CRUD ──────────────────────────────────────────────────────
router.get('/', getMyQuizzes);
router.post('/', validateCreateQuiz, createQuiz);

router.get('/:quizId', getQuiz);
router.patch('/:quizId', validateUpdateQuiz, updateQuiz);
router.delete('/:quizId', deleteQuiz);

router.post('/:quizId/duplicate', duplicateQuiz);

// ── Question CRUD (nested under quiz) ────────────────────────────
// IMPORTANT: /reorder must be declared before /:questionId
// otherwise Express matches "reorder" as a questionId param
router.patch('/:quizId/questions/reorder', validateReorderQuestions, reorderQuestions);

router.get('/:quizId/questions', getQuestions);
router.post('/:quizId/questions', validateCreateQuestion, createQuestion);

router.get('/:quizId/questions/:questionId', getQuestion);
router.patch('/:quizId/questions/:questionId', validateUpdateQuestion, updateQuestion);
router.delete('/:quizId/questions/:questionId', deleteQuestion);

module.exports = router;
