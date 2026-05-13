const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      maxlength: [200, 'Option text cannot exceed 200 characters'],
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'true_false', 'poll'],
      default: 'mcq',
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [500, 'Question text cannot exceed 500 characters'],
    },
    options: {
      type: [optionSchema],
      validate: [
        {
          validator: function (opts) {
            return opts.length >= 2;
          },
          message: 'A question must have at least 2 options',
        },
        {
          validator: function (opts) {
            // poll type does not require a correct answer
            if (this.type === 'poll') return true;
            return opts.some((o) => o.isCorrect === true);
          },
          message: 'Non-poll questions must have at least one correct option',
        },
      ],
    },
    order: {
      type: Number,
      required: true,
    },
    // Overrides quiz-level defaultTimeLimit when set
    timeLimit: {
      type: Number,
      min: [5, 'Time limit must be at least 5 seconds'],
      max: [120, 'Time limit cannot exceed 120 seconds'],
      default: null,
    },
    // Max points awarded for a correct answer
    points: {
      type: Number,
      default: 1000,
      min: [0, 'Points cannot be negative'],
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: fetching questions for a quiz sorted by order
questionSchema.index({ quizId: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);
