/**
 * Authentication Controller
 * 
 * VISION:
 * Handle HTTP request/response logic for authentication endpoints, providing a clean
 * REST API interface for user registration, login, token refresh, and logout.
 * 
 * WHY THIS EXISTS:
 * - Separation of Concerns: Controller handles HTTP, service handles business logic
 * - HTTP-Specific Logic: Cookie management, status codes, response formatting
 * - Error Handling: Delegates errors to Express error handler middleware
 * - Security: Sets secure cookie options (httpOnly, secure, sameSite)
 * 
 * WHAT IT DOES:
 * - register(): Handle POST /api/auth/register (HTTP 201 Created)
 * - login(): Handle POST /api/auth/login (sets refresh token cookie)
 * - refresh(): Handle POST /api/auth/refresh (rotates refresh token cookie)
 * - logout(): Handle POST /api/auth/logout (clears refresh token cookie)
 * 
 * DESIGN DECISIONS:
 * 1. Refresh Token Storage:
 *    - Store in HTTP-only cookie (not localStorage)
 *    - Why: Prevents XSS attacks (JavaScript cannot access httpOnly cookies)
 *    - Access token sent in response body (client stores in memory)
 * 
 * 2. Cookie Security Options:
 *    - httpOnly: true → Prevents JavaScript access (XSS protection)
 *    - secure: true (production) → HTTPS only (MITM protection)
 *    - sameSite: 'strict' → Prevents CSRF attacks
 *    - maxAge: 7 days → Matches refresh token expiry
 * 
 * 3. HTTP Status Codes:
 *    - 201 Created: Successful registration
 *    - 200 OK: Successful login/refresh/logout
 *    - 401 Unauthorized: Invalid credentials or tokens (handled by service)
 *    - 409 Conflict: Duplicate username/email (handled by service)
 * 
 * 4. Error Handling:
 *    - All errors delegated to next(error)
 *    - Express error handler middleware formats error responses
 *    - Consistent error format across all endpoints
 * 
 * USAGE:
 * ```javascript
 * // Client-side usage examples
 * 
 * // Register
 * const response = await fetch('/api/auth/register', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ username: 'alice', email: 'alice@example.com', password: 'password123' })
 * });
 * const { user } = await response.json();
 * 
 * // Login (refresh token set in cookie automatically)
 * const response = await fetch('/api/auth/login', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
 *   credentials: 'include' // Important: Include cookies
 * });
 * const { accessToken, user } = await response.json();
 * 
 * // Refresh (send cookie, get new tokens)
 * const response = await fetch('/api/auth/refresh', {
 *   method: 'POST',
 *   credentials: 'include' // Important: Include cookies
 * });
 * const { accessToken } = await response.json();
 * 
 * // Logout (clear cookie)
 * await fetch('/api/auth/logout', {
 *   method: 'POST',
 *   credentials: 'include' // Important: Include cookies
 * });
 * ```
 */

const authService = require('./service');

class AuthController {
  /**
   * Handle user registration
   * 
   * POST /api/auth/register
   * Body: { username, email, password }
   * Response: 201 Created with user object (no password)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;
      
      // Delegate business logic to service layer
      const user = await authService.register(username, email, password);
      
      // HTTP 201 Created: Resource successfully created
      res.status(201).json({
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      // Delegate error handling to Express error handler middleware
      // Service throws errors with statusCode property (e.g., 409 for duplicates)
      next(error);
    }
  }

  /**
   * Handle user login
   * 
   * POST /api/auth/login
   * Body: { email, password }
   * Response: 200 OK with accessToken and user object
   * Side Effect: Sets refresh token in HTTP-only cookie
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      // Delegate authentication to service layer
      const { accessToken, refreshToken, user } = await authService.login(email, password);
      
      // Set refresh token as HTTP-only cookie
      // Security features:
      // - httpOnly: Prevents JavaScript access (XSS protection)
      // - secure: HTTPS only in production (MITM protection)
      // - sameSite: 'strict' prevents CSRF attacks
      // - maxAge: 7 days (matches refresh token expiry)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true, // Cannot be accessed by JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // Strict CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      });
      
      // Return access token in response body (client stores in memory)
      res.json({
        message: 'Login successful',
        accessToken, // Client includes this in Authorization header
        user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle token refresh (with token rotation)
   * 
   * POST /api/auth/refresh
   * Cookie: refreshToken (HTTP-only)
   * Response: 200 OK with new accessToken
   * Side Effect: Sets new refresh token in HTTP-only cookie
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async refresh(req, res, next) {
    try {
      // Extract refresh token from HTTP-only cookie
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        const error = new Error('Refresh token not provided');
        error.statusCode = 401;
        throw error;
      }
      
      // Delegate token rotation to service layer
      // Service returns new access token AND new refresh token (rotation)
      const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
      
      // Set new refresh token cookie (token rotation)
      // Old refresh token is blacklisted by service
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({
        message: 'Token refreshed successfully',
        accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle user logout
   * 
   * POST /api/auth/logout
   * Cookie: refreshToken (HTTP-only)
   * Response: 200 OK
   * Side Effect: Clears refresh token cookie and blacklists token in Redis
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async logout(req, res, next) {
    try {
      // Extract refresh token from HTTP-only cookie
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        // Delegate token blacklisting to service layer
        // Service adds token to Redis blacklist
        await authService.logout(refreshToken);
      }
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
