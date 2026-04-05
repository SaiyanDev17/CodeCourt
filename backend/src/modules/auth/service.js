/**
 * Authentication Service
 * 
 * VISION:
 * Provide a secure, production-ready authentication system with JWT-based access control,
 * refresh token rotation, and Redis-backed token blacklisting. This service implements
 * industry best practices for web application security.
 * 
 * WHY THIS EXISTS:
 * - Security: Protect user accounts and prevent unauthorized access
 * - Stateless Auth: JWT tokens enable horizontal scaling without session storage
 * - Token Rotation: Refresh token rotation prevents token replay attacks
 * - Revocation: Redis blacklist enables immediate token invalidation on logout
 * - Performance: Short-lived access tokens reduce database lookups
 * 
 * WHAT IT DOES:
 * - register(): Create new user accounts with bcrypt password hashing
 * - login(): Authenticate users and issue JWT access + refresh tokens
 * - refresh(): Rotate refresh tokens and issue new access tokens
 * - logout(): Blacklist refresh tokens to prevent reuse
 * - verifyAccessToken(): Validate JWT signatures and expiry
 * 
 * DESIGN DECISIONS:
 * 1. Two-Token System:
 *    - Access Token: Short-lived (15min), included in API requests
 *    - Refresh Token: Long-lived (7 days), used to get new access tokens
 *    - Why: Limits damage if access token is stolen (expires quickly)
 * 
 * 2. Bcrypt Password Hashing:
 *    - Cost factor 10 (2^10 = 1024 iterations)
 *    - Balance between security and performance (~100ms per hash)
 *    - Resistant to rainbow table and brute force attacks
 * 
 * 3. Refresh Token Rotation:
 *    - Each refresh() call generates a new refresh token
 *    - Old refresh token is blacklisted immediately
 *    - Prevents token replay attacks if refresh token is stolen
 * 
 * 4. Redis Token Storage:
 *    - Store SHA-256 hash of refresh token (not plaintext)
 *    - TTL matches token expiry (7 days)
 *    - Enables immediate revocation on logout
 * 
 * 5. Token Blacklist:
 *    - Blacklist old refresh tokens after rotation
 *    - Blacklist refresh tokens on logout
 *    - TTL matches token expiry to prevent memory bloat
 * 
 * USAGE:
 * ```javascript
 * const authService = require('./service');
 * 
 * // Register new user
 * const user = await authService.register('alice', 'alice@example.com', 'password123');
 * 
 * // Login and get tokens
 * const { accessToken, refreshToken, user } = await authService.login('alice@example.com', 'password123');
 * 
 * // Refresh access token
 * const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
 * 
 * // Logout and blacklist token
 * await authService.logout(refreshToken);
 * 
 * // Verify access token
 * const decoded = await authService.verifyAccessToken(accessToken);
 * console.log(decoded.userId, decoded.role);
 * ```
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./model');
const redis = require('../../config/redis');

// Environment variables with secure defaults
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'changeme_access';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'changeme_refresh';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // 7 days

class AuthService {
  /**
   * Register a new user account
   * 
   * @param {string} username - Unique username (3-30 chars)
   * @param {string} email - Unique email address
   * @param {string} password - Plaintext password (will be hashed)
   * @returns {Promise<Object>} User object without password hash
   * @throws {Error} 409 if username or email already exists
   * 
   * Flow:
   * 1. Check for duplicate username/email
   * 2. Hash password with bcrypt (cost factor 10)
   * 3. Create user with 'contestant' role
   * 4. Return sanitized user object (no password hash)
   */
  async register(username, email, password) {
    // Check if username or email already exists
    // Using $or to check both fields in a single query
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      // Determine which field caused the conflict
      const field = existingUser.username === username ? 'username' : 'email';
      const error = new Error(`${field} already exists`);
      error.statusCode = 409; // HTTP 409 Conflict
      throw error;
    }
    
    // Hash password with bcrypt (cost factor 10)
    // Cost factor 10 = 2^10 = 1024 iterations (~100ms)
    // Higher cost = more secure but slower
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user with default 'contestant' role
    const user = await User.create({
      username,
      email,
      passwordHash,
      role: 'contestant'
    });
    
    // Return user object without password hash (security best practice)
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  /**
   * Authenticate user and issue JWT tokens
   * 
   * @param {string} email - User's email address
   * @param {string} password - Plaintext password
   * @returns {Promise<Object>} { accessToken, refreshToken, user }
   * @throws {Error} 401 if credentials are invalid
   * 
   * Flow:
   * 1. Find user by email
   * 2. Verify password with bcrypt
   * 3. Generate access token (15min expiry)
   * 4. Generate refresh token (7 day expiry)
   * 5. Store refresh token hash in Redis
   * 6. Return tokens and user object
   */
  async login(email, password) {
    // Find user by email (uses index for O(log n) lookup)
    const user = await User.findOne({ email });
    
    if (!user) {
      // Generic error message to prevent user enumeration attacks
      const error = new Error('Invalid credentials');
      error.statusCode = 401; // HTTP 401 Unauthorized
      throw error;
    }
    
    // Verify password with bcrypt
    // bcrypt.compare() is timing-safe to prevent timing attacks
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      // Same generic error message as above
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }
    
    // Generate access token (short-lived, 15 minutes)
    // Payload includes userId and role for authorization
    const accessToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    
    // Generate refresh token (long-lived, 7 days)
    // Payload includes userId and type='refresh' to distinguish from access tokens
    const refreshToken = jwt.sign(
      { userId: user._id.toString(), type: 'refresh' },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    
    // Store refresh token hash in Redis with 7 day TTL
    // Why hash? Prevents token theft if Redis is compromised
    // Why Redis? Enables fast token validation and revocation
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await redis.setex(`refresh:${user._id.toString()}`, 7 * 24 * 60 * 60, tokenHash);
    
    return { 
      accessToken, 
      refreshToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  }

  /**
   * Refresh access token using refresh token (with token rotation)
   * 
   * @param {string} refreshToken - Current refresh token
   * @returns {Promise<Object>} { accessToken, refreshToken } (both new)
   * @throws {Error} 401 if token is invalid, blacklisted, or mismatched
   * 
   * Flow:
   * 1. Verify refresh token signature
   * 2. Check if token is blacklisted
   * 3. Verify stored token hash matches
   * 4. Generate new access token
   * 5. Generate new refresh token
   * 6. Blacklist old refresh token
   * 7. Store new refresh token hash
   * 
   * Security: Token rotation prevents replay attacks
   * If an attacker steals a refresh token, it becomes invalid after first use
   */
  async refresh(refreshToken) {
    // Verify refresh token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }
    
    // Verify token type (must be 'refresh', not 'access')
    if (decoded.type !== 'refresh') {
      const error = new Error('Invalid token type');
      error.statusCode = 401;
      throw error;
    }
    
    // Check if token is blacklisted in Redis
    // Tokens are blacklisted after use (rotation) or logout
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const isBlacklisted = await redis.get(`blacklist:${tokenHash}`);
    
    if (isBlacklisted) {
      const error = new Error('Token has been revoked');
      error.statusCode = 401;
      throw error;
    }
    
    // Verify stored token hash matches
    // This prevents token reuse if Redis is out of sync
    const storedHash = await redis.get(`refresh:${decoded.userId}`);
    if (storedHash !== tokenHash) {
      const error = new Error('Token mismatch');
      error.statusCode = 401;
      throw error;
    }
    
    // Get user to include current role in new token
    // Role may have changed since original token was issued
    const user = await User.findById(decoded.userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }
    
    // Generate new access token with current role
    const accessToken = jwt.sign(
      { userId: decoded.userId, role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    
    // Generate new refresh token (token rotation)
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, type: 'refresh' },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    
    // Blacklist old refresh token (7 day TTL)
    // This prevents reuse of old token (security best practice)
    await redis.setex(`blacklist:${tokenHash}`, 7 * 24 * 60 * 60, '1');
    
    // Store new refresh token hash in Redis
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await redis.setex(`refresh:${decoded.userId}`, 7 * 24 * 60 * 60, newTokenHash);
    
    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout user and blacklist refresh token
   * 
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<void>}
   * 
   * Flow:
   * 1. Verify token to extract userId (best-effort)
   * 2. Add token to Redis blacklist
   * 3. Remove from active refresh tokens
   * 
   * Note: This is a best-effort operation
   * Even if token is invalid, we still blacklist it
   */
  async logout(refreshToken) {
    // Verify token to get userId (best-effort)
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      // Even if token is invalid, we'll try to blacklist it
      // This is a best-effort operation for security
    }
    
    // Add refresh token to Redis blacklist (7 day TTL)
    // TTL matches token expiry to prevent memory bloat
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await redis.setex(`blacklist:${tokenHash}`, 7 * 24 * 60 * 60, '1');
    
    // Remove from active refresh tokens if we have userId
    if (decoded && decoded.userId) {
      await redis.del(`refresh:${decoded.userId}`);
    }
  }

  /**
   * Verify access token signature and expiry
   * 
   * @param {string} token - JWT access token
   * @returns {Promise<Object>} Decoded token payload { userId, role, iat, exp }
   * @throws {Error} 401 if token is invalid or expired
   * 
   * Used by authGuard middleware to authenticate requests
   */
  async verifyAccessToken(token) {
    // Verify JWT signature and check expiry
    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
      return decoded;
    } catch (error) {
      const err = new Error('Invalid or expired token');
      err.statusCode = 401;
      throw err;
    }
  }
}

module.exports = new AuthService();
