const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 6-char uppercase code participants use to join
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'paused', 'ended'],
      default: 'waiting',
      index: true,
    },
    // Tracks which question is currently live
    currentQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      default: null,
    },
    // -1 = lobby (not yet started)
    currentQuestionIndex: {
      type: Number,
      default: -1,
    },
    questionStartedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
