/**
 * Problems Controller
 * 
 * VISION:
 * Handle HTTP request/response logic for problem management endpoints, providing a clean
 * REST API interface for problem CRUD operations, approval workflows, and test case uploads.
 * 
 * WHY THIS EXISTS:
 * - Separation of Concerns: Controller handles HTTP, service handles business logic
 * - HTTP-Specific Logic: Status codes, file uploads (multer), response formatting
 * - Access Control: Hides S3 keys from non-owners
 * - Error Handling: Delegates errors to Express error handler middleware
 * 
 * WHAT IT DOES:
 * - listProblems(): GET /api/problems (public, cached)
 * - getProblemBySlug(): GET /api/problems/:slug (public)
 * - createProblem(): POST /api/problems (problem_setter only)
 * - updateProblem(): PUT /api/problems/:id (owner only)
 * - uploadTestCases(): POST /api/problems/:id/upload-tests (owner only, multer)
 * - approveProblem(): POST /api/problems/:id/approve (admin only)
 * - rejectProblem(): POST /api/problems/:id/reject (admin only)
 * 
 * DESIGN DECISIONS:
 * 1. S3 Key Security:
 *    - Hide hiddenTestCasesS3Key from non-owners
 *    - Only problem author sees S3 key in getProblemBySlug()
 *    - Prevents unauthorized test case downloads
 * 
 * 2. File Upload Handling:
 *    - Use multer for multipart/form-data parsing
 *    - Validate file type (must be ZIP)
 *    - Pass buffer to service layer for S3 upload
 * 
 * 3. HTTP Status Codes:
 *    - 200 OK: Successful GET/PUT/POST operations
 *    - 201 Created: Successful problem creation
 *    - 400 Bad Request: Missing file or invalid file type
 *    - 403 Forbidden: Ownership validation failure (handled by service)
 *    - 404 Not Found: Problem not found
 *    - 409 Conflict: Duplicate slug (handled by service)
 * 
 * USAGE:
 * See routes.js for endpoint definitions and middleware composition
 */

const problemService = require('./service');

class ProblemsController {
  /**
   * List all published problems (Redis cached)
   * GET /api/problems
   * Public endpoint (no authentication required)
   */
  async listProblems(req, res, next) {
    try {
      const problems = await problemService.listPublished();
      
      res.json({
        count: problems.length,
        problems
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get problem details by slug
   * GET /api/problems/:slug
   * Public endpoint (no authentication required)
   * Hides S3 key from non-owners for security
   */
  async getProblemBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      
      const problem = await problemService.getBySlug(slug);
      
      if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Don't expose S3 key to non-owners (security)
      // Only problem author can see hiddenTestCasesS3Key
      if (!req.user || problem.authorId?._id?.toString() !== req.user.id) {
        delete problem.hiddenTestCasesS3Key;
      }
      
      res.json({ problem });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new problem (draft status)
   * POST /api/problems
   * Requires authentication and problem_setter role
   */
  async createProblem(req, res, next) {
    try {
      const problemData = req.body;
      const authorId = req.user.id; // From authGuard middleware
      
      const problem = await problemService.create(problemData, authorId);
      
      res.status(201).json({
        message: 'Problem created successfully',
        problem
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing problem
   * PUT /api/problems/:id
   * Requires authentication and ownership validation
   * Reverts to draft if test cases are updated
   */
  async updateProblem(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id; // From authGuard middleware
      const userRole = req.user.role;
      
      const problem = await problemService.update(id, updateData, userId, userRole);
      
      res.json({
        message: 'Problem updated successfully',
        problem
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload hidden test cases ZIP to S3
   * POST /api/problems/:id/upload-tests
   * Requires authentication and ownership validation
   * Uses multer for file upload handling
   */
  async uploadTestCases(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From authGuard middleware
      const userRole = req.user.role;
      
      // Check if file was uploaded (multer middleware)
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Verify it's a ZIP file
      if (req.file.mimetype !== 'application/zip' && !req.file.originalname.endsWith('.zip')) {
        return res.status(400).json({ error: 'File must be a ZIP archive' });
      }
      
      const result = await problemService.uploadTestCases(id, req.file.buffer, userId, userRole);
      
      res.json({
        message: 'Test cases uploaded successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve problem and transition to published status
   * POST /api/problems/:id/approve
   * Requires authentication and admin role
   */
  async approveProblem(req, res, next) {
    try {
      const { id } = req.params;
      
      const problem = await problemService.approve(id);
      
      res.json({
        message: 'Problem approved and published',
        problem
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject problem with reason
   * POST /api/problems/:id/reject
   * Requires authentication and admin role
   */
  async rejectProblem(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      
      if (!rejectionReason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      
      const problem = await problemService.reject(id, rejectionReason);
      
      res.json({
        message: 'Problem rejected',
        problem
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProblemsController();
