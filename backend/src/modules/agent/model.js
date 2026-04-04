// Hint model
// Mongoose schema for Hint collection

const mongoose = require('mongoose');

const hintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    problemId: {
      type: String,
      required: true,
      index: true,
    },
    hintText: {
      type: String,
      required: true,
    },
    hintIndex: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound index for fast lookups of user's hints for a specific problem
hintSchema.index({ userId: 1, problemId: 1, createdAt: -1 });

const Hint = mongoose.model('Hint', hintSchema);

module.exports = Hint;
