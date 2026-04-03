// Auth service
// Business logic for authentication: registration, login, token management

class AuthService {
  async register(username, email, password) {
    // TODO: Check if username/email already exists
    // TODO: Hash password with bcrypt (cost 10)
    // TODO: Create user with role 'contestant'
    // TODO: Return user object
    throw new Error('Not implemented');
  }

  async login(email, password) {
    // TODO: Find user by email
    // TODO: Verify password with bcrypt
    // TODO: Generate access token (15min)
    // TODO: Generate refresh token (7d)
    // TODO: Store refresh token hash in Redis
    // TODO: Return { accessToken, refreshToken }
    throw new Error('Not implemented');
  }

  async refresh(refreshToken) {
    // TODO: Verify refresh token signature
    // TODO: Check if token is blacklisted in Redis
    // TODO: Generate new access token
    // TODO: Generate new refresh token
    // TODO: Blacklist old refresh token
    // TODO: Store new refresh token hash in Redis
    // TODO: Return { accessToken, refreshToken }
    throw new Error('Not implemented');
  }

  async logout(refreshToken) {
    // TODO: Add refresh token to Redis blacklist
    // TODO: Set TTL to match token expiry
    throw new Error('Not implemented');
  }

  async verifyAccessToken(token) {
    // TODO: Verify JWT signature
    // TODO: Check expiry
    // TODO: Return decoded payload
    throw new Error('Not implemented');
  }
}

module.exports = new AuthService();
