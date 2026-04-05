/**
 * Express Application Initialization
 * 
 * VISION:
 * Configure the Express application with middleware, routes, and error handling
 * to create a secure, performant REST API for the CodeCourt platform.
 * 
 * WHY THIS EXISTS:
 * Express requires careful middleware ordering and configuration:
 * - CORS must be configured before routes
 * - Body parsers must be before route handlers
 * - Error handler must be last in the middleware stack
 * - Rate limiting protects against abuse
 * 
 * This file centralizes all Express configuration in one place, making it easy
 * to understand the request processing pipeline.
 * 
 * WHAT IT DOES:
 * - Initializes Express application
 * - Configures CORS for frontend communication
 * - Sets up body parsers (JSON, URL-encoded)
 * - Applies global rate limiting
 * - Mounts API routes
 * - Serves Swagger documentation
 * - Handles 404 errors
 * - Applies global error handler
 * 
 * DESIGN DECISIONS:
 * 1. Middleware Order (CRITICAL):
 *    - CORS first (allows frontend requests)
 *    - Body parsers second (parse request bodies)
 *    - Rate limiter third (protect against abuse)
 *    - Routes fourth (handle business logic)
 *    - 404 handler fifth (catch unmatched routes)
 *    - Error handler last (catch all errors)
 * 
 * 2. CORS Configuration:
 *    - origin: FRONTEND_URL (localhost:3000 in dev, production URL in prod)
 *    - credentials: true (allows cookies for JWT refresh tokens)
 *    - Prevents CORS errors in browser
 * 
 * 3. Body Parser Limits:
 *    - JSON limit: 10mb (allows large code submissions)
 *    - URL-encoded: extended=true (supports nested objects)
 *    - Prevents DoS attacks via large payloads
 * 
 * 4. Global Rate Limiting:
 *    - Applied to all routes (10 requests / 15 minutes per IP)
 *    - Prevents brute force attacks
 *    - Redis-backed for distributed rate limiting
 * 
 * 5. Route Mounting:
 *    - All routes under /api/* prefix
 *    - Consistent API structure
 *    - Easy to version (future: /api/v2/*)
 * 
 * 6. Swagger Documentation:
 *    - Auto-generated from swagger.yaml
 *    - Available at /api-docs
 *    - Gracefully handles missing swagger file
 * 
 * 7. Error Handler Placement:
 *    - MUST be last middleware
 *    - Catches errors from all previous middleware
 *    - Returns consistent error responses
 * 
 * USAGE:
 * ```javascript
 * // In server.js
 * const app = require('./src/app');
 * const server = http.createServer(app);
 * server.listen(5000);
 * ```
 * 
 * MIDDLEWARE STACK ORDER:
 * 1. CORS (allow frontend)
 * 2. Body parsers (parse JSON/form data)
 * 3. Cookie parser (parse cookies)
 * 4. Rate limiter (prevent abuse)
 * 5. Health check (GET /health)
 * 6. API routes (business logic)
 * 7. Swagger docs (GET /api-docs)
 * 8. 404 handler (unmatched routes)
 * 9. Error handler (catch all errors)
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');
const { apiRateLimiter } = require('./middleware/rateLimit');

const app = express();

// ============================================================
// MIDDLEWARE CONFIGURATION
// ============================================================

// CORS configuration - MUST be first to allow frontend requests
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: FRONTEND_URL, // Allow requests from frontend
  credentials: true // Allow cookies (for JWT refresh tokens)
}));

// Body parsers - Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' })); // JSON parser with 10mb limit (large code submissions)
app.use(express.urlencoded({ extended: true })); // URL-encoded parser (form data)
app.use(cookieParser()); // Cookie parser (for JWT refresh tokens)

// Global rate limiter - Protect all routes from abuse
// 10 requests per 15 minutes per IP address
app.use(apiRateLimiter);

// ============================================================
// ROUTES
// ============================================================

// Health check endpoint - No authentication required
// Used by load balancers and monitoring tools
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes under /api/* prefix
// Each module has its own router with authentication/authorization middleware
app.use('/api/auth', require('./modules/auth/routes')); // Authentication (register, login, logout)
app.use('/api/problems', require('./modules/problems/routes')); // Problem management
app.use('/api/submissions', require('./modules/submissions/routes')); // Code submission and judging
app.use('/api/contests', require('./modules/contests/routes')); // Contest management
app.use('/api/users', require('./modules/users/routes')); // User profiles
app.use('/api/agent', require('./modules/agent/routes')); // AI agent integration

// ============================================================
// SWAGGER DOCUMENTATION
// ============================================================

// Serve Swagger UI at /api-docs
// Auto-generated API documentation from swagger.yaml
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

try {
  // Load swagger.yaml from backend/swagger/ directory
  const swaggerDocument = YAML.load(path.join(__dirname, '../swagger/swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('Swagger UI available at /api-docs');
} catch (error) {
  // Swagger file missing or invalid - log warning but don't crash
  console.warn('Swagger documentation not available:', error.message);
}

// ============================================================
// ERROR HANDLERS
// ============================================================

// 404 handler - Catch all unmatched routes
// Must be after all route definitions
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Global error handler - Catch all errors from middleware and routes
// MUST be last middleware in the stack
app.use(errorHandler);

// Export Express app for use in server.js
module.exports = app;
