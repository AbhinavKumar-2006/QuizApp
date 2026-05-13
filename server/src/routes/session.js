const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { validateCreateSession } = require('../validators');
const {
  createSession,
  getMySessions,
  getSession,
  lookupByCode,
  getLeaderboard,
  getSessionResults,
  deleteSession,
} = require('../controllers/sessionController');

// ── Public routes (no auth needed) ───────────────────────────────
// Participant uses this to validate join code before connecting via socket
router.get('/join/:code', lookupByCode);

// Leaderboard is public so participants can poll it
router.get('/:sessionId/leaderboard', getLeaderboard);

// ── Host-only routes ──────────────────────────────────────────────
router.use(protect);

router.route('/')
  .get(getMySessions)
  .post(validateCreateSession, createSession);

router.route('/:sessionId')
  .get(getSession)
  .delete(deleteSession);

router.get('/:sessionId/results', getSessionResults);

module.exports = router;
