// Submissions routes
// Endpoints: POST /, GET /:id, GET /problem/:problemId

const express = require('express');
const router = express.Router();

// TODO: Import controller methods
// TODO: Import middleware (authGuard, validate)

// POST /api/submissions - Submit code, enqueue job - contestant only
router.post('/', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// GET /api/submissions/:id - Get submission detail + verdict - owner only
router.get('/:id', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// GET /api/submissions/problem/:problemId - List own submissions for a problem - contestant only
router.get('/problem/:problemId', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
