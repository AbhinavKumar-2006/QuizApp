const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      trim: true,
      maxlength: [30, 'Nickname cannot exceed 30 characters'],
    },
    // Updated on each socket reconnect
    socketId: {
      type: String,
      default: null,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    // Computed and stored after each question reveal
    rank: {
      type: Number,
      default: null,
    },
    isConnected: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique nickname per session — no two players can have the same name
participantSchema.index({ sessionId: 1, nickname: 1 }, { unique: true });

// Leaderboard sort
participantSchema.index({ sessionId: 1, totalScore: -1 });

module.exports = mongoose.model('Participant', participantSchema);
