// Hint model
const mongoose = require('mongoose');

const hintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true,
    index: true
  },
  hintText: {
    type: String,
    required: true
  },
  hintIndex: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
hintSchema.index({ userId: 1, problemId: 1 });

module.exports = mongoose.model('Hint', hintSchema);
