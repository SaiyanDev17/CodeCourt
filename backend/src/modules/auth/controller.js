// Auth controller
// Handles HTTP request/response logic for authentication endpoints

const authService = require('./service');

class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;
      
      const user = await authService.register(username, email, password);
      
      res.status(201).json({
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const { accessToken, refreshToken, user } = await authService.login(email, password);
      
      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({
        message: 'Login successful',
        accessToken,
        user
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        const error = new Error('Refresh token not provided');
        error.statusCode = 401;
        throw error;
      }
      
      const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
      
      // Set new refresh token cookie
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

  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      
      // Clear cookie
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
