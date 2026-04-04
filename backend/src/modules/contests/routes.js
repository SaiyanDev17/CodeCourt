// Contest routes
// Endpoints: GET /, GET /:id, POST /, POST /:id/register, GET /:id/leaderboard

const express = require('express');
const router = express.Router();
const contestController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');
const { validate, schemas } = require('../../middleware/validate');

// GET /api/contests - List all contests
router.get('/', contestController.listContests);

// GET /api/contests/:id - Get contest detail
router.get('/:id', contestController.getContest);

// POST /api/contests - Create contest (admin or problem_setter)
router.post(
  '/',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  validate(schemas.createContest),
  contestController.createContest
);

// POST /api/contests/:id/register - Register for contest
router.post(
  '/:id/register',
  authGuard,
  contestController.registerForContest
);

// GET /api/contests/:id/leaderboard - Get leaderboard (cached)
router.get('/:id/leaderboard', contestController.getLeaderboard);

module.exports = router;
