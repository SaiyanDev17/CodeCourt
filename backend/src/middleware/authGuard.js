/**
 * Authentication Guard Middleware
 * 
 * VISION:
 * Protect API endpoints by verifying JWT tokens and attaching authenticated user
 * information to the request object. This middleware is the foundation of the
 * security layer, ensuring only authenticated users can access protected resources.
 * 
 * WHY THIS EXISTS:
 * - Most API endpoints require authentication (submissions, contests, profile)
 * - JWT tokens provide stateless authentication (no session storage needed)
 * - Middleware pattern allows reusable authentication logic across all routes
 * - Attaching user to req.user enables downstream handlers to access user info
 * 
 * WHAT IT DOES:
 * 1. Extracts JWT token from Authorization header (Bearer scheme)
 * 2. Verifies token signature and expiry using ACCESS_TOKEN_SECRET
 * 3. Fetches user from database to ensure user still exists
 * 4. Attaches user object to req.user for use in controllers
 * 5. Returns 401 Unauthorized if token is missing, invalid, or expired
 * 
 * DESIGN DECISIONS:
 * - Uses Bearer token scheme (industry standard for JWT)
 * - Fetches user from database (ensures user wasn't deleted after token issued)
 * - Excludes passwordHash from user object (security best practice)
 * - Attaches minimal user info to req.user (id, username, email, role)
 * - Distinguishes between invalid token and expired token (better UX)
 * - Passes other errors to error handler (centralized error handling)
 * 
 * MIDDLEWARE STACK POSITION:
 * This middleware should be placed AFTER:
 * - Body parser (express.json())
 * - CORS middleware
 * 
 * This middleware should be placed BEFORE:
 * - roleGuard (requires req.user)
 * - Route handlers (requires req.user)
 * 
 * USAGE:
 * ```javascript
 * const { authGuard } = require('./middleware/authGuard');
 * 
 * // Protect single route
 * router.get('/profile', authGuard, (req, res) => {
 *   res.json({ user: req.user });
 * });
 * 
 * // Protect all routes in router
 * router.use(authGuard);
 * router.get('/submissions', getSubmissions);
 * router.post('/submissions', createSubmission);
 * 
 * // Access user in controller
 * const userId = req.user.id;
 * const userRole = req.user.role;
 * ```
 * 
 * REQUEST/RESPONSE MODIFICATIONS:
 * - Reads: req.headers.authorization
 * - Writes: req.user = { id, username, email, role }
 * - Returns: 401 if authentication fails
 * 
 * ERROR HANDLING:
 * - No token: 401 "No token provided"
 * - Invalid token: 401 "Invalid token" (signature mismatch, malformed)
 * - Expired token: 401 "Token expired" (user should refresh)
 * - User not found: 401 "User not found" (user deleted after token issued)
 * - Other errors: Passed to error handler middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../modules/auth/model');

// JWT secret for verifying access tokens
// In production, this MUST be a strong random string (32+ characters)
// Should be different from REFRESH_TOKEN_SECRET
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'changeme_access';

/**
 * Verify Bearer JWT token and attach user to req.user
 * 
 * This middleware implements the standard Bearer token authentication flow:
 * 1. Extract token from "Authorization: Bearer <token>" header
 * 2. Verify token signature and expiry
 * 3. Fetch user from database
 * 4. Attach user to req.user
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 */
exports.authGuard = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Expected format: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists and uses Bearer scheme
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Extract token by removing 'Bearer ' prefix (7 characters)
    const token = authHeader.substring(7);
    
    // Verify token signature and expiry
    // Throws JsonWebTokenError if signature invalid
    // Throws TokenExpiredError if token expired
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    
    // Fetch user from database to ensure user still exists
    // User might have been deleted after token was issued
    // .select('-passwordHash') excludes password hash from result (security)
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request object for use in downstream middleware/controllers
    // Only include necessary fields (principle of least privilege)
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Handle JWT-specific errors with appropriate messages
    if (error.name === 'JsonWebTokenError') {
      // Token signature invalid or malformed
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      // Token expired - client should refresh token
      return res.status(401).json({ error: 'Token expired' });
    }
    // Pass other errors to centralized error handler
    next(error);
  }
};
