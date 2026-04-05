/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * VISION:
 * Implement fine-grained authorization by restricting API endpoints to specific user roles.
 * This middleware enables role-based permissions (admin, problem_setter, contestant) to
 * control access to sensitive operations like problem approval and user management.
 * 
 * WHY THIS EXISTS:
 * - Authentication (authGuard) verifies identity, but doesn't control permissions
 * - Different endpoints require different privilege levels (e.g., only admins can approve problems)
 * - Role-based access control is a security best practice (principle of least privilege)
 * - Centralized role checking prevents scattered authorization logic in controllers
 * 
 * WHAT IT DOES:
 * 1. Checks if req.user exists (ensures authGuard ran first)
 * 2. Verifies user's role is in the allowed roles array
 * 3. Returns 403 Forbidden if user lacks required role
 * 4. Calls next() if user has required role
 * 
 * DESIGN DECISIONS:
 * - Factory function pattern: roleGuard(roles) returns middleware function
 * - Accepts array of roles (allows multiple roles per endpoint)
 * - Returns 403 Forbidden (not 401) - user is authenticated but not authorized
 * - Includes helpful error message listing required roles
 * - Requires authGuard to run first (checks req.user existence)
 * 
 * MIDDLEWARE STACK POSITION:
 * This middleware MUST be placed AFTER:
 * - authGuard (requires req.user to be set)
 * 
 * This middleware should be placed BEFORE:
 * - Route handlers (protects the handler)
 * 
 * USAGE:
 * ```javascript
 * const { authGuard } = require('./middleware/authGuard');
 * const { roleGuard } = require('./middleware/roleGuard');
 * const { ROLES } = require('./config/constants');
 * 
 * // Admin-only endpoint
 * router.post('/users/:id/role', 
 *   authGuard, 
 *   roleGuard([ROLES.ADMIN]), 
 *   updateUserRole
 * );
 * 
 * // Problem setters and admins can create problems
 * router.post('/problems', 
 *   authGuard, 
 *   roleGuard([ROLES.PROBLEM_SETTER, ROLES.ADMIN]), 
 *   createProblem
 * );
 * 
 * // All authenticated users can submit (no roleGuard needed)
 * router.post('/submissions', 
 *   authGuard, 
 *   createSubmission
 * );
 * ```
 * 
 * ROLE HIERARCHY:
 * The system has a three-tier role hierarchy:
 * 1. ADMIN: Full system access (user management, problem approval, contest management)
 * 2. PROBLEM_SETTER: Can create and submit problems for approval
 * 3. CONTESTANT: Can participate in contests and submit solutions
 * 
 * Note: This middleware does NOT implement hierarchical roles automatically.
 * If an endpoint should be accessible to admins AND problem setters, you must
 * explicitly include both roles: roleGuard([ROLES.ADMIN, ROLES.PROBLEM_SETTER])
 * 
 * HTTP STATUS CODES:
 * - 401 Unauthorized: req.user not set (authGuard didn't run or failed)
 * - 403 Forbidden: User authenticated but lacks required role
 * 
 * ERROR HANDLING:
 * - Missing req.user: 401 "Authentication required"
 * - Insufficient role: 403 "Forbidden" with list of required roles
 */

/**
 * Check if user has required role
 * 
 * Factory function that returns a middleware function. The returned middleware
 * checks if the authenticated user's role is in the allowedRoles array.
 * 
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['admin', 'problem_setter'])
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Single role
 * router.post('/admin/users', authGuard, roleGuard(['admin']), handler);
 * 
 * @example
 * // Multiple roles
 * router.post('/problems', authGuard, roleGuard(['admin', 'problem_setter']), handler);
 */
exports.roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure authGuard ran first and set req.user
    // If req.user is missing, authGuard either didn't run or failed
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user's role is in the allowed roles array
    // Case-sensitive comparison (roles are lowercase in database)
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    
    // User has required role - continue to route handler
    next();
  };
};
