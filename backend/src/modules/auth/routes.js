/**
 * Authentication Routes
 * 
 * VISION:
 * Define RESTful API endpoints for authentication with proper validation,
 * rate limiting, and middleware composition.
 * 
 * WHY THIS EXISTS:
 * - Route Definition: Maps HTTP methods and paths to controller handlers
 * - Middleware Composition: Applies validation and rate limiting before controllers
 * - API Documentation: Serves as a reference for available auth endpoints
 * - Security: Rate limiting on login prevents brute force attacks
 * 
 * WHAT IT DOES:
 * - POST /api/auth/register: Create new user account
 * - POST /api/auth/login: Authenticate and get tokens (rate limited)
 * - POST /api/auth/refresh: Get new access token using refresh token
 * - POST /api/auth/logout: Revoke refresh token and clear cookie
 * 
 * DESIGN DECISIONS:
 * 1. Middleware Stack Order:
 *    - Rate limiter (if applicable) → Prevents abuse before validation
 *    - Validator → Validates request body before controller
 *    - Controller → Handles business logic
 * 
 * 2. Rate Limiting:
 *    - Only applied to /login endpoint (most vulnerable to brute force)
 *    - 10 attempts per 15 minutes per IP address
 *    - Redis-backed for distributed rate limiting
 * 
 * 3. Validation Schemas:
 *    - register: Validates username (3-30 chars), email, password (8+ chars)
 *    - login: Validates email and password presence
 *    - refresh/logout: No validation needed (token in cookie)
 * 
 * 4. No Authentication Required:
 *    - All auth endpoints are public (no authGuard middleware)
 *    - Users must be able to register/login without existing tokens
 * 
 * USAGE:
 * ```javascript
 * // Mount in Express app
 * const authRoutes = require('./modules/auth/routes');
 * app.use('/api/auth', authRoutes);
 * 
 * // Available endpoints:
 * // POST /api/auth/register
 * // POST /api/auth/login
 * // POST /api/auth/refresh
 * // POST /api/auth/logout
 * ```
 * 
 * ENDPOINT DETAILS:
 * 
 * POST /api/auth/register
 * - Body: { username: string, email: string, password: string }
 * - Validation: username (3-30 chars), email (valid format), password (8+ chars)
 * - Response: 201 Created with user object
 * - Errors: 409 if username/email exists, 400 if validation fails
 * 
 * POST /api/auth/login
 * - Body: { email: string, password: string }
 * - Rate Limit: 10 attempts per 15 minutes per IP
 * - Response: 200 OK with accessToken and user object
 * - Side Effect: Sets refreshToken in HTTP-only cookie
 * - Errors: 401 if credentials invalid, 429 if rate limited
 * 
 * POST /api/auth/refresh
 * - Cookie: refreshToken (HTTP-only)
 * - Response: 200 OK with new accessToken
 * - Side Effect: Sets new refreshToken in HTTP-only cookie (token rotation)
 * - Errors: 401 if token invalid/expired/blacklisted
 * 
 * POST /api/auth/logout
 * - Cookie: refreshToken (HTTP-only)
 * - Response: 200 OK
 * - Side Effect: Blacklists refreshToken and clears cookie
 * - Errors: None (best-effort operation)
 */

const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { validate, schemas } = require('../../middleware/validate');
const { loginRateLimiter } = require('../../middleware/rateLimit');

/**
 * POST /api/auth/register
 * 
 * Create a new user account
 * Middleware: validate(schemas.register)
 * Handler: authController.register
 */
router.post('/register', validate(schemas.register), authController.register);

/**
 * POST /api/auth/login
 * 
 * Authenticate user and issue tokens
 * Middleware: loginRateLimiter (10 attempts / 15 min), validate(schemas.login)
 * Handler: authController.login
 * 
 * Rate limiting prevents brute force password attacks
 */
router.post('/login', loginRateLimiter, validate(schemas.login), authController.login);

/**
 * POST /api/auth/refresh
 * 
 * Refresh access token using refresh token from cookie
 * Middleware: None (token in HTTP-only cookie)
 * Handler: authController.refresh
 */
router.post('/refresh', authController.refresh);

/**
 * POST /api/auth/logout
 * 
 * Revoke refresh token and clear cookie
 * Middleware: None (best-effort operation)
 * Handler: authController.logout
 */
router.post('/logout', authController.logout);

module.exports = router;
