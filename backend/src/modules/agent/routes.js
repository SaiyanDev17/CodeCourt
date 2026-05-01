// Agent routes - proxy to FastAPI AI service
const express = require('express');
const router = express.Router();
const agentController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');

// POST /api/agent/hint - Proxy hint request to FastAPI
router.post('/hint', authGuard, roleGuard(['contestant', 'admin', 'problem_setter']), agentController.getHint);

// GET /api/agent/hint-count - Get hint count for (user, problem)
// Note: Called internally by AI service, so we don't use authGuard
router.get('/hint-count', agentController.getHintCount);

// POST /api/agent/save-hint - Save hint and increment count
// Note: Called internally by AI service, so we don't use authGuard
router.post('/save-hint', agentController.saveHint);

// GET /api/agent/submissions - Get submission history
// Note: Called internally by AI service, so we don't use authGuard
router.get('/submissions', agentController.getSubmissionHistory);

module.exports = router;
