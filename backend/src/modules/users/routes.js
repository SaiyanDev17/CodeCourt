/**
 * User Profile Routes
 * 
 * VISION:
 * Define HTTP routes for user profile access and management with appropriate
 * authentication and authorization controls.
 * 
 * WHY THIS EXISTS:
 * User profiles need different access levels:
 * - Public viewing (for leaderboards, submission history)
 * - Admin-only role management (for access control)
 * 
 * WHAT IT DOES:
 * - Mounts GET /api/users/:username (public profile access)
 * - Mounts PUT /api/users/:id/role (admin-only role updates)
 * - Applies authentication and authorization middleware
 * 
 * DESIGN DECISIONS:
 * 1. Public Profile Endpoint:
 *    - No authentication required
 *    - Enables public leaderboards and user discovery
 *    - Service layer filters sensitive data
 * 
 * 2. Role Update Endpoint:
 *    - Requires authGuard (JWT validation)
 *    - Requires roleGuard(['admin']) (admin-only access)
 *    - Prevents unauthorized privilege escalation
 * 
 * 3. Route Parameters:
 *    - Profile lookup uses :username (user-friendly URLs)
 *    - Role update uses :id (MongoDB ObjectId for precision)
 * 
 * USAGE:
 * ```javascript
 * // In app.js
 * const userRoutes = require('./modules/users/routes');
 * app.use('/api/users', userRoutes);
 * 
 * // Public profile access
 * // GET /api/users/john_doe
 * 
 * // Admin role update
 * // PUT /api/users/507f1f77bcf86cd799439011/role
 * // Headers: { Authorization: "Bearer <admin_jwt>" }
 * // Body: { "role": "admin" }
 * ```
 */

const express = require('express');
const router = express.Router();
const userController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');

// GET /api/users/:username - Get public user profile (cached, no auth required)
// This endpoint is public to enable leaderboards and submission history viewing
router.get('/:username', userController.getUserProfile);

// PUT /api/users/:id/role - Update user role (admin only)
// Protected by authGuard (JWT validation) and roleGuard (admin-only access)
// Automatically invalidates user profile cache on success
router.put('/:id/role', authGuard, roleGuard(['admin']), userController.updateUserRole);

module.exports = router;
