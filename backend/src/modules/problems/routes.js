/**
 * Problems Routes
 * 
 * VISION:
 * Define RESTful API endpoints for problem management with proper authentication,
 * authorization, validation, and file upload handling.
 * 
 * WHY THIS EXISTS:
 * - Route Definition: Maps HTTP methods and paths to controller handlers
 * - Middleware Composition: Applies auth, role guards, validation, and file uploads
 * - Access Control: Different endpoints require different roles
 * - API Documentation: Serves as a reference for available problem endpoints
 * 
 * WHAT IT DOES:
 * - GET /api/problems: List published problems (public, cached)
 * - GET /api/problems/:slug: Get problem details (public)
 * - POST /api/problems: Create problem (problem_setter only)
 * - PUT /api/problems/:id: Update problem (owner only)
 * - POST /api/problems/:id/upload-tests: Upload test cases ZIP (owner only)
 * - POST /api/problems/:id/approve: Approve problem (admin only)
 * - POST /api/problems/:id/reject: Reject problem (admin only)
 * 
 * DESIGN DECISIONS:
 * 1. Public vs Protected Endpoints:
 *    - GET / and GET /:slug are public (no authGuard)
 *    - All other endpoints require authentication
 *    - Why? Users can browse problems without logging in
 * 
 * 2. Role-Based Access Control:
 *    - Create/Update: problem_setter or admin
 *    - Approve/Reject: admin only
 *    - Upload: problem_setter or admin (with ownership check in service)
 * 
 * 3. File Upload Configuration:
 *    - Multer with memory storage (no disk writes)
 *    - 10MB file size limit (reasonable for test case ZIPs)
 *    - Single file upload with field name 'testCases'
 * 
 * 4. Middleware Stack Order:
 *    - authGuard → Authenticates user (sets req.user)
 *    - roleGuard → Checks user role
 *    - validate → Validates request body
 *    - upload.single → Parses multipart/form-data
 *    - controller → Handles business logic
 * 
 * USAGE:
 * ```javascript
 * // Mount in Express app
 * const problemsRoutes = require('./modules/problems/routes');
 * app.use('/api/problems', problemsRoutes);
 * ```
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const problemsController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');
const { validate, schemas } = require('../../middleware/validate');

/**
 * Multer Configuration for File Uploads
 * 
 * - Storage: Memory storage (file buffer in req.file.buffer)
 * - Limit: 10MB maximum file size
 * - Why memory storage? Temporary buffer for S3 upload, no disk I/O
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * GET /api/problems
 * List all published problems (Redis cached, 60s TTL)
 * Public endpoint (no authentication required)
 */
router.get('/', problemsController.listProblems);

/**
 * GET /api/problems/:slug
 * Get problem details by slug
 * Public endpoint (no authentication required)
 * Hides S3 key from non-owners
 */
router.get('/:slug', problemsController.getProblemBySlug);

/**
 * POST /api/problems
 * Create a new problem (draft status)
 * Requires: Authentication + problem_setter or admin role
 * Validates: Problem schema (title, slug, description, etc.)
 */
router.post(
  '/',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  validate(schemas.createProblem),
  problemsController.createProblem
);

/**
 * PUT /api/problems/:id
 * Update an existing problem
 * Requires: Authentication + problem_setter or admin role
 * Ownership validation in service layer
 * Reverts to draft if test cases are updated
 */
router.put(
  '/:id',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  problemsController.updateProblem
);

/**
 * POST /api/problems/:id/upload-tests
 * Upload hidden test cases ZIP to S3
 * Requires: Authentication + problem_setter or admin role
 * Ownership validation in service layer
 * Multer parses multipart/form-data with field name 'testCases'
 */
router.post(
  '/:id/upload-tests',
  authGuard,
  roleGuard(['admin', 'problem_setter']),
  upload.single('testCases'), // Field name must be 'testCases'
  problemsController.uploadTestCases
);

/**
 * POST /api/problems/:id/approve
 * Approve problem and transition to published status
 * Requires: Authentication + admin role
 * Invalidates Redis cache
 */
router.post(
  '/:id/approve',
  authGuard,
  roleGuard(['admin']),
  problemsController.approveProblem
);

/**
 * POST /api/problems/:id/reject
 * Reject problem with reason
 * Requires: Authentication + admin role
 * Body: { rejectionReason: string }
 */
router.post(
  '/:id/reject',
  authGuard,
  roleGuard(['admin']),
  problemsController.rejectProblem
);

module.exports = router;
