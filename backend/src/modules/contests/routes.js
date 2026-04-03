// Contest routes
// Endpoints: GET /, GET /:id, POST /, POST /:id/register, GET /:id/leaderboard

const express = require('express');
const router = express.Router();

// TODO: Import controller methods
// TODO: Import middleware (authGuard, roleGuard, validate)

// GET /api/contests - List all contests
router.get('/', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// GET /api/contests/:id - Get contest detail
router.get('/:id', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/contests - Create contest (admin or problem_setter)
router.post('/', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/contests/:id/register - Register for contest (contestant)
router.post('/:id/register', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// GET /api/contests/:id/leaderboard - Get leaderboard (cached)
router.get('/:id/leaderboard', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
