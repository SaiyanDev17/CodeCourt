/**
 * Problem Model
 * 
 * VISION:
 * Provide a flexible, scalable problem management system with approval workflows,
 * S3-backed test case storage, and Redis caching for high-performance problem listings.
 * 
 * WHY THIS EXISTS:
 * - Content Management: Store competitive programming problems with metadata
 * - Approval Workflow: Draft → Published/Rejected state machine for quality control
 * - Test Case Storage: Separate sample (public) and hidden (S3) test cases
 * - Performance: Indexes enable fast queries by slug, status, and author
 * 
 * WHAT IT DOES:
 * - Defines Problem schema with title, description, constraints, test cases
 * - Implements status state machine (draft → published/rejected)
 * - Stores S3 keys for hidden test cases (not the test cases themselves)
 * - Tracks problem author and rejection reasons
 * - Creates indexes for fast lookups
 * 
 * DESIGN DECISIONS:
 * 1. Status State Machine:
 *    - draft: Initial state, not visible to contestants
 *    - published: Approved by admin, visible to all users
 *    - rejected: Rejected by admin with reason, author can revise
 * 
 * 2. Test Case Storage:
 *    - sampleTestCases: Stored in MongoDB (visible to users for understanding)
 *    - hiddenTestCasesS3Key: S3 key pointing to ZIP file (used by judge, not exposed)
 *    - Why separate? Sample cases are small, hidden cases can be large (100+ test files)
 * 
 * 3. Slug-Based URLs:
 *    - Unique slug for SEO-friendly URLs (/problems/two-sum)
 *    - Lowercase normalized to prevent case-sensitivity issues
 *    - Indexed for O(log n) lookups
 * 
 * 4. Resource Limits:
 *    - timeLimit: Minimum 100ms (prevents unrealistic constraints)
 *    - memoryLimit: Minimum 16MB (prevents unrealistic constraints)
 *    - Stored in milliseconds and megabytes for consistency
 * 
 * 5. Difficulty Levels:
 *    - easy, medium, hard (standard competitive programming categories)
 *    - Used for filtering and user experience
 * 
 * USAGE:
 * ```javascript
 * const Problem = require('./model');
 * 
 * // Create a new problem (draft status)
 * const problem = await Problem.create({
 *   title: 'Two Sum',
 *   slug: 'two-sum',
 *   description: 'Given an array of integers...',
 *   constraints: '1 <= nums.length <= 10^4',
 *   timeLimit: 1000, // 1 second
 *   memoryLimit: 256, // 256 MB
 *   difficulty: 'easy',
 *   sampleTestCases: [
 *     { input: '2 7 11 15\n9', output: '0 1' }
 *   ],
 *   authorId: userId,
 *   status: 'draft'
 * });
 * 
 * // Find problem by slug (uses index)
 * const problem = await Problem.findOne({ slug: 'two-sum' });
 * 
 * // List published problems (uses index)
 * const problems = await Problem.find({ status: 'published' });
 * 
 * // Approve problem
 * await Problem.findByIdAndUpdate(problemId, { status: 'published' });
 * ```
 */

const mongoose = require('mongoose');

/**
 * Problem Schema Definition
 * 
 * Fields:
 * - title: Display name of the problem
 * - slug: URL-friendly identifier (unique, lowercase)
 * - description: Problem statement with examples
 * - constraints: Input constraints and limits
 * - timeLimit: Maximum execution time in milliseconds
 * - memoryLimit: Maximum memory usage in megabytes
 * - difficulty: Problem difficulty (easy, medium, hard)
 * - sampleTestCases: Public test cases visible to users
 * - hiddenTestCasesS3Key: S3 key for hidden test cases ZIP
 * - status: Approval status (draft, published, rejected)
 * - rejectionReason: Admin feedback if rejected
 * - authorId: User who created the problem
 * - createdAt: Problem creation timestamp (auto-generated)
 * - updatedAt: Last modification timestamp (auto-generated)
 */
const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true, // Remove leading/trailing whitespace
    },
    slug: {
      type: String,
      required: true,
      unique: true, // Enforces uniqueness at database level
      trim: true,
      lowercase: true, // Normalize to lowercase (Two-Sum → two-sum)
    },
    description: {
      type: String,
      required: true,
      // Contains problem statement, examples, and explanation
    },
    constraints: {
      type: String,
      required: true,
      // Example: "1 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9"
    },
    timeLimit: {
      type: Number,
      required: true,
      min: 100, // Minimum 100ms (prevents unrealistic constraints)
      // Stored in milliseconds (e.g., 1000 = 1 second)
    },
    memoryLimit: {
      type: Number,
      required: true,
      min: 16, // Minimum 16MB (prevents unrealistic constraints)
      // Stored in megabytes (e.g., 256 = 256 MB)
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'], // Only allow these three levels
      required: true,
    },
    sampleTestCases: [
      {
        // Public test cases visible to users for understanding
        // Stored in MongoDB (small size, frequently accessed)
        input: { type: String, required: true },
        output: { type: String, required: true },
      },
    ],
    hiddenTestCasesS3Key: {
      type: String,
      default: null,
      // S3 key pointing to ZIP file with hidden test cases
      // Example: "test-cases/507f1f77bcf86cd799439011/hidden.zip"
      // Not exposed to users, only used by judge system
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'rejected'], // State machine
      default: 'draft',
      // draft: Initial state, not visible to contestants
      // published: Approved by admin, visible to all
      // rejected: Rejected by admin, author can revise
    },
    rejectionReason: {
      type: String,
      default: null,
      // Admin feedback if problem is rejected
      // Helps author understand what needs improvement
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to User model
      required: true,
      // Tracks who created the problem (for ownership checks)
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

/**
 * Database Indexes
 * 
 * These indexes dramatically improve query performance:
 * - slug index: Fast lookups for /problems/:slug endpoint
 * - status index: Fast filtering for published problems list
 * - authorId index: Fast queries for "my problems" page
 * 
 * Performance impact:
 * - Without index: O(n) full table scan
 * - With index: O(log n) B-tree lookup
 */
problemSchema.index({ slug: 1 }); // Ascending index on slug (unique lookups)
problemSchema.index({ status: 1 }); // Ascending index on status (filtering)
problemSchema.index({ authorId: 1 }); // Ascending index on authorId (ownership queries)

const Problem = mongoose.model('Problem', problemSchema);

module.exports = Problem;
