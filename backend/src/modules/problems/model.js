// Problem model
// Mongoose schema for Problem collection

const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    constraints: {
      type: String,
      required: true,
    },
    timeLimit: {
      type: Number,
      required: true,
      min: 100, // milliseconds
    },
    memoryLimit: {
      type: Number,
      required: true,
      min: 16, // megabytes
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    sampleTestCases: [
      {
        input: { type: String, required: true },
        output: { type: String, required: true },
      },
    ],
    hiddenTestCasesS3Key: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'rejected'],
      default: 'draft',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    authorId: {
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
problemSchema.index({ slug: 1 });
problemSchema.index({ status: 1 });
problemSchema.index({ authorId: 1 });

const Problem = mongoose.model('Problem', problemSchema);

module.exports = Problem;
