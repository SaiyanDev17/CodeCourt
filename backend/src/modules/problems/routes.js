// Problems routes
// Endpoints: GET /, GET /:slug, POST /, PUT /:id, POST /:id/upload-tests, POST /:id/approve, POST /:id/reject

const express = require('express');
const router = express.Router();

// TODO: Import controller methods
// TODO: Import middleware (authGuard, roleGuard, validate)

// GET /api/problems - List published problems (cached)
router.get('/', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// GET /api/problems/:slug - Get problem detail
router.get('/:slug', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/problems - Create problem (draft) - problem_setter only
router.post('/', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// PUT /api/problems/:id - Update problem - problem_setter (owner) only
router.put('/:id', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/problems/:id/upload-tests - Upload hidden test ZIP to S3 - problem_setter (owner) only
router.post('/:id/upload-tests', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/problems/:id/approve - Approve problem → published - admin only
router.post('/:id/approve', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/problems/:id/reject - Reject problem with reason - admin only
router.post('/:id/reject', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
