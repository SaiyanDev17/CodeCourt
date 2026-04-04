// Submissions routes
// Endpoints: POST /, GET /:id, GET /problem/:problemId

const express = require('express');
const router = express.Router();
const submissionsController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { validate, schemas } = require('../../middleware/validate');

// POST /api/submissions - Submit code, enqueue job - authenticated users
router.post(
  '/',
  authGuard,
  validate(schemas.createSubmission),
  submissionsController.submit
);

// GET /api/submissions/:id - Get submission detail + verdict - owner only
router.get(
  '/:id',
  authGuard,
  submissionsController.getSubmission
);

// GET /api/submissions/problem/:problemId - List own submissions for a problem
router.get(
  '/problem/:problemId',
  authGuard,
  submissionsController.getSubmissionsByProblem
);

module.exports = router;
