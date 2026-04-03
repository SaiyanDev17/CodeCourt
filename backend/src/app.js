// Express app initialization
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');
const { apiRateLimiter } = require('./middleware/rateLimit');

const app = express();

// CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global rate limiter
app.use(apiRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api/problems', require('./modules/problems/routes'));
app.use('/api/submissions', require('./modules/submissions/routes'));
app.use('/api/contests', require('./modules/contests/routes'));
app.use('/api/users', require('./modules/users/routes'));
app.use('/api/agent', require('./modules/agent/routes'));

// Swagger documentation
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const YAML = require('yamljs');
  const path = require('path');
  
  try {
    const swaggerDocument = YAML.load(path.join(__dirname, '../swagger/swagger.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (error) {
    console.warn('Swagger documentation not available:', error.message);
  }
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
