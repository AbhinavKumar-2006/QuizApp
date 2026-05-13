/**
 * Lightweight validation middleware — no external library needed.
 * Each validator returns an express middleware function.
 * On failure it responds 400 immediately; on success it calls next().
 */

const createError = (res, message) => res.status(400).json({ success: false, message });

// ── Auth ───────────────────────────────────────────────────────────

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return createError(res, 'name, email and password are required');
  if (name.trim().length < 2) return createError(res, 'Name must be at least 2 characters');
  if (!/^\S+@\S+\.\S+$/.test(email)) return createError(res, 'Invalid email format');
  if (password.length < 6) return createError(res, 'Password must be at least 6 characters');
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return createError(res, 'email and password are required');
  next();
};

// ── Quiz ──────────────────────────────────────────────────────────

const validateCreateQuiz = (req, res, next) => {
  const { title } = req.body;
  if (!title || !title.trim()) return createError(res, 'title is required');
  if (title.trim().length > 100) return createError(res, 'title cannot exceed 100 characters');
  next();
};

const validateUpdateQuiz = (req, res, next) => {
  const allowed = ['title', 'description', 'status', 'defaultTimeLimit'];
  const keys = Object.keys(req.body);
  const invalid = keys.filter((k) => !allowed.includes(k));
  if (invalid.length) return createError(res, `Invalid fields: ${invalid.join(', ')}`);

  if (req.body.title !== undefined && !req.body.title.trim()) {
    return createError(res, 'title cannot be empty');
  }
  if (
    req.body.defaultTimeLimit !== undefined &&
    (req.body.defaultTimeLimit < 5 || req.body.defaultTimeLimit > 120)
  ) {
    return createError(res, 'defaultTimeLimit must be between 5 and 120 seconds');
  }
  next();
};

// ── Question ──────────────────────────────────────────────────────

const validateCreateQuestion = (req, res, next) => {
  const { text, options, type } = req.body;

  if (!text || !text.trim()) return createError(res, 'text is required');

  if (!Array.isArray(options) || options.length < 2) {
    return createError(res, 'options must be an array with at least 2 items');
  }

  for (const [i, opt] of options.entries()) {
    if (!opt.text || !opt.text.trim()) {
      return createError(res, `options[${i}].text is required`);
    }
  }

  const questionType = type || 'mcq';
  if (!['mcq', 'true_false', 'poll'].includes(questionType)) {
    return createError(res, 'type must be one of: mcq, true_false, poll');
  }

  if (questionType !== 'poll' && !options.some((o) => o.isCorrect === true)) {
    return createError(res, 'At least one option must be marked as correct');
  }

  if (questionType === 'true_false' && options.length !== 2) {
    return createError(res, 'true_false questions must have exactly 2 options');
  }

  next();
};

const validateUpdateQuestion = (req, res, next) => {
  const { options, type } = req.body;

  if (options !== undefined) {
    if (!Array.isArray(options) || options.length < 2) {
      return createError(res, 'options must be an array with at least 2 items');
    }
    for (const [i, opt] of options.entries()) {
      if (!opt.text || !opt.text.trim()) {
        return createError(res, `options[${i}].text is required`);
      }
    }
    const questionType = type || req.body.type;
    if (questionType !== 'poll' && !options.some((o) => o.isCorrect === true)) {
      return createError(res, 'At least one option must be marked as correct');
    }
  }
  next();
};

const validateReorderQuestions = (req, res, next) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return createError(res, 'questions must be a non-empty array of { id, order }');
  }
  for (const [i, item] of questions.entries()) {
    if (!item.id) return createError(res, `questions[${i}].id is required`);
    if (typeof item.order !== 'number') return createError(res, `questions[${i}].order must be a number`);
  }
  next();
};

// ── Session ───────────────────────────────────────────────────────

const validateCreateSession = (req, res, next) => {
  const { quizId } = req.body;
  if (!quizId) return createError(res, 'quizId is required');
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateQuiz,
  validateUpdateQuiz,
  validateCreateQuestion,
  validateUpdateQuestion,
  validateReorderQuestions,
  validateCreateSession,
};
