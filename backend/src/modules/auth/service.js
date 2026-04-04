// Auth service
// Business logic for authentication: registration, login, token management

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./model');
const redis = require('../../config/redis');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'changeme_access';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'changeme_refresh';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

class AuthService {
  async register(username, email, password) {
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      const field = existingUser.username === username ? 'username' : 'email';
      const error = new Error(`${field} already exists`);
      error.statusCode = 409;
      throw error;
    }
    
    // Hash password with bcrypt (cost 10)
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user with role 'contestant'
    const user = await User.create({
      username,
      email,
      passwordHash,
      role: 'contestant'
    });
    
    // Return user object without password
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  async login(email, password) {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }
    
    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }
    
    // Generate access token (15min)
    const accessToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    
    // Generate refresh token (7d)
    const refreshToken = jwt.sign(
      { userId: user._id.toString(), type: 'refresh' },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    
    // Store refresh token hash in Redis with 7 day TTL
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

  async refresh(refreshToken) {
    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }
    
    if (decoded.type !== 'refresh') {
      const error = new Error('Invalid token type');
      error.statusCode = 401;
      throw error;
    }
    
    // Check if token is blacklisted in Redis
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const isBlacklisted = await redis.get(`blacklist:${tokenHash}`);
    
    if (isBlacklisted) {
      const error = new Error('Token has been revoked');
      error.statusCode = 401;
      throw error;
    }
    
    // Verify stored token matches
    const storedHash = await redis.get(`refresh:${decoded.userId}`);
    if (storedHash !== tokenHash) {
      const error = new Error('Token mismatch');
      error.statusCode = 401;
      throw error;
    }
    
    // Get user to include role in new token
    const user = await User.findById(decoded.userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    
    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, type: 'refresh' },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    
    // Blacklist old refresh token (7 day TTL)
    await redis.setex(`blacklist:${tokenHash}`, 7 * 24 * 60 * 60, '1');
    
    // Store new refresh token hash in Redis
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await redis.setex(`refresh:${decoded.userId}`, 7 * 24 * 60 * 60, newTokenHash);
    
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken) {
    // Verify token to get userId
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      // Even if token is invalid, we'll try to blacklist it
      // This is a best-effort operation
    }
    
    // Add refresh token to Redis blacklist (7 day TTL)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await redis.setex(`blacklist:${tokenHash}`, 7 * 24 * 60 * 60, '1');
    
    // Remove from active refresh tokens if we have userId
    if (decoded && decoded.userId) {
      await redis.del(`refresh:${decoded.userId}`);
    }
  }

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
