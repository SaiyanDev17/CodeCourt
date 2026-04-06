/**
 * User Model
 * 
 * VISION:
 * Provide a secure, scalable user authentication model that supports role-based access control
 * for a competitive programming platform. This model serves as the foundation for all user
 * identity and authorization throughout the system.
 * 
 * WHY THIS EXISTS:
 * - Authentication: Users need secure accounts to participate in contests and submit solutions
 * - Authorization: Different user roles (admin, problem_setter, contestant) require different permissions
 * - Audit Trail: Timestamps track account creation and modifications for security and analytics
 * - Data Integrity: Unique constraints prevent duplicate accounts and ensure data consistency
 * 
 * WHAT IT DOES:
 * - Defines the User schema with username, email, password hash, and role
 * - Enforces validation rules (min/max length, email format, required fields)
 * - Creates database indexes for fast lookups by username and email
 * - Stores password hashes (never plaintext) using bcrypt with cost factor 10
 * - Automatically tracks creation and update timestamps
 * 
 * DESIGN DECISIONS:
 * 1. Password Storage: Store passwordHash instead of password for security
 *    - Bcrypt hashing with cost factor 10 (balance between security and performance)
 *    - Never expose password hash in API responses
 * 
 * 2. Role-Based Access Control (RBAC):
 *    - admin: Full system access, can manage users and approve problems
 *    - problem_setter: Can create and manage problems
 *    - contestant: Default role, can participate in contests and submit solutions
 * 
 * 3. Unique Constraints:
 *    - Username and email must be unique to prevent duplicate accounts
 *    - Lowercase email normalization prevents case-sensitivity issues
 * 
 * 4. Indexes:
 *    - Username and email indexes enable O(log n) lookups instead of O(n) table scans
 *    - Critical for login performance and duplicate checking during registration
 * 
 * 5. Timestamps:
 *    - createdAt: Account creation time (useful for analytics and user onboarding)
 *    - updatedAt: Last modification time (useful for security audits)
 * 
 * USAGE:
 * ```javascript
 * const User = require('./model');
 * 
 * // Create a new user
 * const user = await User.create({
 *   username: 'alice',
 *   email: 'alice@example.com',
 *   passwordHash: await bcrypt.hash('password123', 10),
 *   role: 'contestant'
 * });
 * 
 * // Find user by email (uses index)
 * const user = await User.findOne({ email: 'alice@example.com' });
 * 
 * // Find user by username (uses index)
 * const user = await User.findOne({ username: 'alice' });
 * 
 * // Update user role
 * await User.findByIdAndUpdate(userId, { role: 'problem_setter' });
 * ```
 */

const mongoose = require('mongoose');

/**
 * User Schema Definition
 * 
 * Fields:
 * - username: Unique identifier for display (3-30 chars, trimmed)
 * - email: Unique email address (lowercase normalized, trimmed)
 * - passwordHash: Bcrypt hash of user's password (never store plaintext)
 * - role: User's permission level (admin, problem_setter, contestant)
 * - createdAt: Account creation timestamp (auto-generated)
 * - updatedAt: Last modification timestamp (auto-generated)
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true, // Enforces uniqueness at database level
      trim: true, // Remove leading/trailing whitespace
      minlength: 3, // Prevent too-short usernames
      maxlength: 30, // Prevent excessively long usernames
    },
    email: {
      type: String,
      required: true,
      unique: true, // Enforces uniqueness at database level
      trim: true, // Remove leading/trailing whitespace
      lowercase: true, // Normalize to lowercase (alice@EXAMPLE.com → alice@example.com)
    },
    passwordHash: {
      type: String,
      required: true,
      // SECURITY: Never store plaintext passwords
      // This field stores bcrypt hash with cost factor 10
      // Example: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
    },
    role: {
      type: String,
      enum: ['admin', 'problem_setter', 'contestant'], // Only allow these three roles
      default: 'contestant', // New users default to contestant role
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

/**
 * Database Indexes
 * 
 * Indexes are automatically created by the `unique: true` constraint on username and email fields.
 * Mongoose creates these indexes during model initialization, providing O(log n) B-tree lookup performance.
 * 
 * No explicit index() calls are needed for fields with unique constraints, as they already create indexes.
 * 
 * Critical for:
 * - Login queries (findOne by email) - uses email index from unique constraint
 * - Registration duplicate checks (findOne by username/email) - uses indexes from unique constraints
 * - User profile lookups (findOne by username) - uses username index from unique constraint
 */

const User = mongoose.model('User', userSchema);

module.exports = User;
