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
router.route('/')
  .get(getMyQuizzes)
  .post(validateCreateQuiz, createQuiz);

router.route('/:quizId')
  .get(getQuiz)
  .patch(validateUpdateQuiz, updateQuiz)
  .delete(deleteQuiz);

router.post('/:quizId/duplicate', duplicateQuiz);

// ── Question CRUD (nested under quiz) ────────────────────────────
// IMPORTANT: /reorder must be declared before /:questionId
// otherwise Express matches "reorder" as a questionId param
router.patch('/:quizId/questions/reorder', validateReorderQuestions, reorderQuestions);

router.route('/:quizId/questions')
  .get(getQuestions)
  .post(validateCreateQuestion, createQuestion);

router.route('/:quizId/questions/:questionId')
  .get(getQuestion)
  .patch(validateUpdateQuestion, updateQuestion)
  .delete(deleteQuestion);

module.exports = router;
