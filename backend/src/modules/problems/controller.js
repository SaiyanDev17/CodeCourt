// Problems controller
// Handles HTTP request/response logic for problem management endpoints

const problemService = require('./service');

class ProblemsController {
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

  async getProblemBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      
      const problem = await problemService.getBySlug(slug);
      
      if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Don't expose S3 key to non-owners
      if (!req.user || problem.authorId._id.toString() !== req.user.id) {
        delete problem.hiddenTestCasesS3Key;
      }
      
      res.json({ problem });
    } catch (error) {
      next(error);
    }
  }

  async createProblem(req, res, next) {
    try {
      const problemData = req.body;
      const authorId = req.user.id;
      
      const problem = await problemService.create(problemData, authorId);
      
      res.status(201).json({
        message: 'Problem created successfully',
        problem
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProblem(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;
      
      const problem = await problemService.update(id, updateData, userId);
      
      res.json({
        message: 'Problem updated successfully',
        problem
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadTestCases(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Verify it's a ZIP file
      if (req.file.mimetype !== 'application/zip' && !req.file.originalname.endsWith('.zip')) {
        return res.status(400).json({ error: 'File must be a ZIP archive' });
      }
      
      const result = await problemService.uploadTestCases(id, req.file.buffer, userId);
      
      res.json({
        message: 'Test cases uploaded successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

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
