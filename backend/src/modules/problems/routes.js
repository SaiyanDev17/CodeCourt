// Problems routes
// Endpoints: GET /, GET /:slug, POST /, PUT /:id, POST /:id/upload-tests, POST /:id/approve, POST /:id/reject

const express = require('express');
const router = express.Router();
const multer = require('multer');
const problemsController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');
const { validate, schemas } = require('../../middleware/validate');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/problems - List published problems (cached)
router.get('/', problemsController.listProblems);

// GET /api/problems/:slug - Get problem detail
router.get('/:slug', problemsController.getProblemBySlug);

// POST /api/problems - Create problem (draft) - problem_setter only
router.post(
  '/',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  validate(schemas.createProblem),
  problemsController.createProblem
);

// PUT /api/problems/:id - Update problem - problem_setter (owner) only
router.put(
  '/:id',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  problemsController.updateProblem
);

// POST /api/problems/:id/upload-tests - Upload hidden test ZIP to S3 - problem_setter (owner) only
router.post(
  '/:id/upload-tests',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  upload.single('testCases'),
  problemsController.uploadTestCases
);

// POST /api/problems/:id/approve - Approve problem → published - admin only
router.post(
  '/:id/approve',
  authGuard,
  roleGuard(['admin']),
  problemsController.approveProblem
);

// POST /api/problems/:id/reject - Reject problem with reason - admin only
router.post(
  '/:id/reject',
  authGuard,
  roleGuard(['admin']),
  problemsController.rejectProblem
);

module.exports = router;
