// Auth controller
// Handles HTTP request/response logic for authentication endpoints

class AuthController {
  async register(req, res, next) {
    try {
      // TODO: Validate request body
      // TODO: Call AuthService.register()
      // TODO: Return 201 with success message
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      // TODO: Validate credentials
      // TODO: Call AuthService.login()
      // TODO: Set refresh token cookie
      // TODO: Return access token
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      // TODO: Extract refresh token from cookie
      // TODO: Call AuthService.refresh()
      // TODO: Set new refresh token cookie
      // TODO: Return new access token
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      // TODO: Extract refresh token from cookie
      // TODO: Call AuthService.logout()
      // TODO: Clear cookie
      // TODO: Return 200
      res.status(501).json({ message: 'Not implemented' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
