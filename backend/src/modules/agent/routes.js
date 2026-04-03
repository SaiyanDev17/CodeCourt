// Agent routes - proxy to FastAPI AI service
const express = require('express');
const router = express.Router();
const agentController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');

// POST /api/agent/hint - Proxy hint request to FastAPI
router.post('/hint', authGuard, roleGuard(['contestant']), agentController.getHint);

// GET /api/agent/hint-count - Get hint count for (user, problem)
router.get('/hint-count', authGuard, agentController.getHintCount);

// POST /api/agent/save-hint - Save hint and increment count
router.post('/save-hint', agentController.saveHint);

module.exports = router;
