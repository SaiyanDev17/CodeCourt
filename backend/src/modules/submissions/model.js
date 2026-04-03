// Submission model
// Mongoose schema for Submission collection

const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
      index: true,
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      default: null,
      index: true,
    },
    language: {
      type: String,
      enum: ['cpp', 'python'],
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    verdict: {
      type: String,
      enum: ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING'],
      default: 'PENDING',
    },
    executionTime: {
      type: Number, // milliseconds
      default: null,
    },
    memoryUsed: {
      type: Number, // megabytes
      default: null,
    },
    compilerError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for fast lookups
submissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });
submissionSchema.index({ contestId: 1, createdAt: -1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
