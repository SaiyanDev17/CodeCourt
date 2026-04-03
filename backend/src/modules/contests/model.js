// Contest models
// Mongoose schemas for Contest and ContestScore collections

const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'ended'],
      default: 'upcoming',
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    problemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
      },
    ],
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for fast lookups
contestSchema.index({ status: 1 });
contestSchema.index({ startTime: 1 });
contestSchema.index({ endTime: 1 });
contestSchema.index({ createdBy: 1 });

const contestScoreSchema = new mongoose.Schema(
  {
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    problemScores: [
      {
        problemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Problem',
          required: true,
        },
        solved: {
          type: Boolean,
          default: false,
        },
        attempts: {
          type: Number,
          default: 0,
        },
        firstAcTime: {
          type: Number,
          default: null, // minutes from contest start
        },
        penalty: {
          type: Number,
          default: 0, // 20 * attempts + firstAcTime
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups
contestScoreSchema.index({ contestId: 1, userId: 1 }, { unique: true });
contestScoreSchema.index({ contestId: 1, totalScore: -1 }); // For leaderboard sorting

const Contest = mongoose.model('Contest', contestSchema);
const ContestScore = mongoose.model('ContestScore', contestScoreSchema);

module.exports = { Contest, ContestScore };
