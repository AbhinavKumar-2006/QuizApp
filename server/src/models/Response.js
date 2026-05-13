const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    // null means timed out / skipped
    selectedOptionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
      default: 0,
    },
    // Milliseconds from question start to answer submission — used for tiebreaking
    responseTimeMs: {
      type: Number,
      default: null,
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Per-session leaderboard aggregation
responseSchema.index({ sessionId: 1, participantId: 1 });

// Per-question answer analytics
responseSchema.index({ sessionId: 1, questionId: 1 });

// One answer per participant per question — prevent duplicates at DB level
responseSchema.index(
  { sessionId: 1, participantId: 1, questionId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Response', responseSchema);
