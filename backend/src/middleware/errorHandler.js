/**
 * Global Error Handler Middleware
 * 
 * VISION:
 * Provide centralized, consistent error handling for all API endpoints. This middleware
 * catches all errors thrown in the application, formats them into user-friendly JSON
 * responses, and logs them for debugging and monitoring.
 * 
 * WHY THIS EXISTS:
 * - Without centralized error handling, each controller must handle errors individually
 * - Inconsistent error responses confuse frontend developers and API consumers
 * - Unhandled errors crash the Node.js process (bad user experience)
 * - Error logging should be centralized for monitoring and debugging
 * - Security: prevents leaking sensitive error details (stack traces) in production
 * 
 * WHAT IT DOES:
 * 1. Catches all errors thrown by route handlers and middleware
 * 2. Identifies error type (Mongoose validation, duplicate key, JWT, etc.)
 * 3. Formats error into consistent JSON response structure
 * 4. Returns appropriate HTTP status code (400, 401, 409, 500, etc.)
 * 5. Logs error to console for debugging
 * 6. Includes stack trace in development mode only (security)
 * 
 * DESIGN DECISIONS:
 * - Placed last in middleware stack (catches all errors)
 * - Handles Mongoose-specific errors (ValidationError, duplicate key)
 * - Handles JWT errors (though authGuard should catch these first)
 * - Returns 400 for validation errors (client error)
 * - Returns 409 for duplicate key errors (conflict)
 * - Returns 401 for authentication errors
 * - Returns 500 for unknown errors (server error)
 * - Includes stack trace only in development (prevents info leakage)
 * - Logs all errors to console (can be replaced with logging service)
 * 
 * MIDDLEWARE STACK POSITION:
 * This middleware MUST be placed LAST in the middleware stack:
 * ```javascript
 * app.use(express.json());
 * app.use(cors());
 * app.use('/api/auth', authRoutes);
 * app.use('/api/problems', problemRoutes);
 * // ... other routes ...
 * app.use(errorHandler); // MUST BE LAST
 * ```
 * 
 * USAGE:
 * ```javascript
 * // In route handlers - just throw errors
 * router.post('/problems', async (req, res, next) => {
 *   try {
 *     const problem = await Problem.create(req.body);
 *     res.json(problem);
 *   } catch (error) {
 *     next(error); // Pass error to errorHandler
 *   }
 * });
 * 
 * // Or use async error wrapper
 * router.post('/problems', asyncHandler(async (req, res) => {
 *   const problem = await Problem.create(req.body);
 *   res.json(problem);
 * }));
 * ```
 * 
 * ERROR RESPONSE FORMAT:
 * ```json
 * {
 *   "error": "Validation Error",
 *   "details": ["Title is required", "Time limit must be positive"],
 *   "stack": "Error: ...\n at ..." // Only in development
 * }
 * ```
 * 
 * HANDLED ERROR TYPES:
 * 1. Mongoose ValidationError (400) - Schema validation failed
 * 2. Mongoose Duplicate Key (409) - Unique constraint violated
 * 3. JsonWebTokenError (401) - Invalid JWT token
 * 4. TokenExpiredError (401) - Expired JWT token
 * 5. Custom errors with statusCode property
 * 6. Unknown errors (500) - Catch-all for unexpected errors
 */

/**
 * Global error handler - catch all errors and return structured JSON
 * 
 * This middleware has 4 parameters (err, req, res, next) which tells Express
 * it's an error handler. It must be registered after all other middleware.
 * 
 * @param {Error} err - Error object thrown by route handler or middleware
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function (unused in error handler)
 * @returns {void}
 */
exports.errorHandler = (err, req, res, next) => {
  // Log error to console for debugging
  // In production, this should be replaced with a logging service (Winston, Pino, etc.)
  console.error('Error:', err);
  
  // ============================================================================
  // MONGOOSE VALIDATION ERROR
  // ============================================================================
  // Thrown when Mongoose schema validation fails (e.g., required field missing)
  // Example: Creating a problem without title
  if (err.name === 'ValidationError') {
    // Extract all validation error messages
    // err.errors is an object: { title: { message: 'Title is required' }, ... }
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }
  
  // ============================================================================
  // MONGOOSE DUPLICATE KEY ERROR
  // ============================================================================
  // Thrown when unique constraint is violated (e.g., duplicate username/email)
  // Error code 11000 is MongoDB's duplicate key error code
  if (err.code === 11000) {
    // Extract field name from error
    // err.keyPattern is an object: { username: 1 } or { email: 1 }
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: `${field} already exists`
    });
  }
  
  // ============================================================================
  // JWT ERRORS
  // ============================================================================
  // These should normally be caught by authGuard, but we handle them here as fallback
  
  // Invalid JWT signature or malformed token
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Expired JWT token
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // ============================================================================
  // DEFAULT ERROR HANDLER
  // ============================================================================
  // Handles all other errors (custom errors, unexpected errors, etc.)
  
  // Use custom status code if provided, otherwise default to 500
  const statusCode = err.statusCode || 500;
  
  // Use custom error message if provided, otherwise generic message
  const message = err.message || 'Internal Server Error';
  
  // Build response object
  const response = {
    error: message
  };
  
  // Include stack trace only in development mode
  // Stack traces can leak sensitive information (file paths, code structure)
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};
