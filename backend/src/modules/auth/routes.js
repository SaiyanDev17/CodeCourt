// Auth routes
// Endpoints: POST /register, POST /login, POST /refresh, POST /logout

const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { validate, schemas } = require('../../middleware/validate');
const { loginRateLimiter } = require('../../middleware/rateLimit');

// POST /api/auth/register
router.post('/register', validate(schemas.register), authController.register);

// POST /api/auth/login (with rate limiting)
router.post('/login', loginRateLimiter, validate(schemas.login), authController.login);

// POST /api/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.logout);

module.exports = router;
