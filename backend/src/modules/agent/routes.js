// Agent routes - proxy to FastAPI AI service
const express = require('express');
const router = express.Router();
const agentController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');

// POST /api/agent/hint - Proxy hint request to FastAPI
router.post('/hint', authGuard, roleGuard(['contestant', 'admin', 'problem_setter']), agentController.getHint);

// GET /api/agent/my-hints - Get saved hints for the logged-in user
router.get('/my-hints', authGuard, roleGuard(['contestant', 'admin', 'problem_setter']), agentController.getMyHints);

// GET /api/agent/hint-count - Get hint count for (user, problem)
// Note: Called internally by AI service, so we don't use authGuard
router.get('/hint-count', agentController.getHintCount);

// GET /api/agent/hints - Get previous hints for (user, problem)
// Note: Called internally by AI service, so we don't use authGuard
router.get('/hints', agentController.getHints);

// POST /api/agent/save-hint - Save hint and increment count
// Note: Called internally by AI service, so we don't use authGuard
router.post('/save-hint', agentController.saveHint);

// GET /api/agent/submissions - Get submission history
// Note: Called internally by AI service, so we don't use authGuard
router.get('/submissions', agentController.getSubmissionHistory);

module.exports = router;
