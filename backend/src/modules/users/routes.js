// User routes
const express = require('express');
const router = express.Router();
const userController = require('./controller');
const { authGuard } = require('../../middleware/authGuard');
const { roleGuard } = require('../../middleware/roleGuard');

// GET /api/users/:username - Get public user profile (cached)
router.get('/:username', userController.getUserProfile);

// PUT /api/users/:id/role - Update user role (admin only)
router.put('/:id/role', authGuard, roleGuard(['admin']), userController.updateUserRole);

module.exports = router;
