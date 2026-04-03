// Auth routes
// Endpoints: POST /register, POST /login, POST /refresh, POST /logout

const express = require('express');
const router = express.Router();

// TODO: Import controller methods
// TODO: Import middleware (authGuard, validate)

// POST /api/auth/register
router.post('/register', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
