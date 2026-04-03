// Agent controller - proxy to AI service
const axios = require('axios');
const Hint = require('./model');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Proxy hint request to FastAPI AI service
 * POST /api/agent/hint
 */
exports.getHint = async (req, res, next) => {
  try {
    const { problem_id, problem_slug } = req.body;
    const user_id = req.user.id;
    
    // Forward request to AI service
    const response = await axios.post(`${AI_SERVICE_URL}/hint`, {
      user_id,
      problem_id,
      problem_slug
    });
    
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      // Forward error from AI service
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
};

/**
 * Get hint count for (user, problem) pair
 * GET /api/agent/hint-count?user_id=...&problem_id=...
 */
exports.getHintCount = async (req, res, next) => {
  try {
    const { user_id, problem_id } = req.query;
    
    const count = await Hint.countDocuments({ userId: user_id, problemId: problem_id });
    
    res.json({ hint_count: count });
  } catch (error) {
    next(error);
  }
};

/**
 * Save hint and increment count
 * POST /api/agent/save-hint
 */
exports.saveHint = async (req, res, next) => {
  try {
    const { user_id, problem_id, hint_text } = req.body;
    
    // Get current count
    const count = await Hint.countDocuments({ userId: user_id, problemId: problem_id });
    
    // Create new hint
    const hint = await Hint.create({
      userId: user_id,
      problemId: problem_id,
      hintText: hint_text,
      hintIndex: count + 1
    });
    
    res.status(201).json({ 
      message: 'Hint saved successfully',
      hint_index: hint.hintIndex 
    });
  } catch (error) {
    next(error);
  }
};
