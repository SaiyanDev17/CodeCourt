/**
 * User Profile Controller
 * 
 * VISION:
 * Provide HTTP endpoints for accessing and managing user profiles with proper
 * access control and error handling.
 * 
 * WHY THIS EXISTS:
 * User profiles need to be publicly accessible (for leaderboards, submission history)
 * while role management must be restricted to administrators. This controller
 * implements the HTTP layer for these operations.
 * 
 * WHAT IT DOES:
 * - Exposes GET /api/users/:username for public profile access
 * - Exposes PUT /api/users/:id/role for admin-only role updates
 * - Handles HTTP status codes (200, 404, 500)
 * - Delegates business logic to the service layer
 * 
 * DESIGN DECISIONS:
 * 1. Public Profile Access:
 *    - No authentication required for viewing profiles
 *    - Enables public leaderboards and submission history
 *    - Service layer filters sensitive data (passwordHash)
 * 
 * 2. Admin-Only Role Updates:
 *    - Requires authentication (authGuard middleware)
 *    - Requires admin role (roleGuard middleware)
 *    - Prevents privilege escalation attacks
 * 
 * 3. Error Handling:
 *    - 404 for non-existent users (clear feedback)
 *    - Delegates to global error handler for unexpected errors
 *    - Service layer errors bubble up with proper context
 * 
 * USAGE:
 * ```javascript
 * // In routes.js
 * const userController = require('./controller');
 * 
 * // Public profile access
 * router.get('/:username', userController.getUserProfile);
 * 
 * // Admin-only role update
 * router.put('/:id/role', authGuard, roleGuard(['admin']), userController.updateUserRole);
 * ```
 */

const userService = require('./service');

/**
 * Get public user profile
 * 
 * Retrieves a user's public profile by username. This endpoint is unauthenticated
 * to enable public leaderboards and submission history viewing. The service layer
 * automatically filters sensitive data (passwordHash).
 * 
 * Route: GET /api/users/:username
 * Auth: None (public endpoint)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.username - Username to look up
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - User profile object
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error (via error handler)
 * 
 * @example
 * // GET /api/users/john_doe
 * // Response: { _id, username, email, role, createdAt, updatedAt }
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const profile = await userService.getUserProfile(username);
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return profile (cached if available)
    res.json(profile);
  } catch (error) {
    // Delegate to global error handler
    next(error);
  }
};

/**
 * Update user role (admin only)
 * 
 * Updates a user's role and invalidates their profile cache. This endpoint is
 * protected by both authentication and role-based access control to prevent
 * unauthorized privilege escalation.
 * 
 * Route: PUT /api/users/:id/role
 * Auth: Required (admin only)
 * Middleware: authGuard, roleGuard(['admin'])
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - User ID to update
 * @param {Object} req.body - Request body
 * @param {string} req.body.role - New role ('user', 'admin', or 'problem_setter')
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - Success message with updated user
 * @returns {Object} 404 - User not found
 * @returns {Object} 400 - Invalid role (via service layer)
 * @returns {Object} 500 - Server error (via error handler)
 * 
 * @example
 * // PUT /api/users/507f1f77bcf86cd799439011/role
 * // Body: { "role": "admin" }
 * // Response: { message: "User role updated successfully", user: {...} }
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Service layer validates role and updates user
    const updatedUser = await userService.updateUserRole(id, role);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return success message with updated user data
    res.json({ message: 'User role updated successfully', user: updatedUser });
  } catch (error) {
    // Delegate to global error handler (includes validation errors)
    next(error);
  }
};
