// User controller
const userService = require('./service');

/**
 * Get public user profile
 * GET /api/users/:username
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const profile = await userService.getUserProfile(username);
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (admin only)
 * PUT /api/users/:id/role
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const updatedUser = await userService.updateUserRole(id, role);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully', user: updatedUser });
  } catch (error) {
    next(error);
  }
};
