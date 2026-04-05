/**
 * Request Validation Middleware
 * 
 * VISION:
 * Provide robust, declarative input validation for all API endpoints using Joi schemas.
 * This middleware ensures data integrity, prevents invalid data from reaching the database,
 * and provides clear error messages to API consumers.
 * 
 * WHY THIS EXISTS:
 * - User input cannot be trusted (malicious or accidental invalid data)
 * - Database constraints are the last line of defense, not the first
 * - Validation logic scattered across controllers is hard to maintain
 * - Joi provides declarative, reusable validation schemas
 * - Clear validation errors improve developer experience (DX)
 * 
 * WHAT IT DOES:
 * 1. Validates req.body against a Joi schema before reaching the controller
 * 2. Returns 422 Unprocessable Entity with detailed errors if validation fails
 * 3. Strips unknown fields (security: prevents mass assignment attacks)
 * 4. Replaces req.body with validated/sanitized value
 * 5. Provides common validation schemas for auth, problems, submissions, contests
 * 
 * DESIGN DECISIONS:
 * - Uses Joi (industry-standard validation library)
 * - Factory function pattern: validate(schema) returns middleware
 * - abortEarly: false (returns all errors, not just first one)
 * - stripUnknown: true (removes extra fields, prevents mass assignment)
 * - Returns 422 (Unprocessable Entity) not 400 (Bad Request) - more semantic
 * - Detailed error format: { field, message } for each validation error
 * - Centralized schemas in exports.schemas for reusability
 * 
 * MIDDLEWARE STACK POSITION:
 * Validation should be placed AFTER body parser, BEFORE route handler:
 * ```javascript
 * app.use(express.json()); // Parse JSON body
 * router.post('/problems', validate(schemas.createProblem), createProblem); // Validate then handle
 * ```
 * 
 * USAGE:
 * ```javascript
 * const { validate, schemas } = require('./middleware/validate');
 * 
 * // Use predefined schema
 * router.post('/auth/register', validate(schemas.register), registerController);
 * 
 * // Define custom schema inline
 * const customSchema = Joi.object({
 *   name: Joi.string().required(),
 *   age: Joi.number().min(0).max(120)
 * });
 * router.post('/users', validate(customSchema), createUser);
 * 
 * // Access validated data in controller
 * exports.createProblem = async (req, res) => {
 *   // req.body is now validated and sanitized
 *   const problem = await Problem.create(req.body);
 *   res.json(problem);
 * };
 * ```
 * 
 * ERROR RESPONSE FORMAT (422):
 * ```json
 * {
 *   "error": "Validation Error",
 *   "details": [
 *     { "field": "email", "message": "\"email\" must be a valid email" },
 *     { "field": "password", "message": "\"password\" length must be at least 8 characters long" }
 *   ]
 * }
 * ```
 * 
 * VALIDATION FEATURES:
 * - Type checking (string, number, boolean, date, array, object)
 * - Length constraints (min, max)
 * - Pattern matching (regex, alphanum, email)
 * - Enum validation (valid values)
 * - Cross-field validation (endTime > startTime)
 * - Nested object validation
 * - Array validation (min items, item schema)
 * - Custom error messages
 * 
 * SECURITY BENEFITS:
 * - Prevents SQL injection (validates input types)
 * - Prevents NoSQL injection (validates MongoDB ObjectIds)
 * - Prevents mass assignment (strips unknown fields)
 * - Prevents XSS (validates string lengths and patterns)
 * - Prevents DoS (limits string/array sizes)
 */

const Joi = require('joi');

/**
 * Validate request body against Joi schema
 * 
 * Factory function that returns a middleware function. The returned middleware
 * validates req.body against the provided Joi schema.
 * 
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 * 
 * @example
 * const schema = Joi.object({ name: Joi.string().required() });
 * router.post('/users', validate(schema), createUser);
 */
exports.validate = (schema) => {
  return (req, res, next) => {
    // Validate req.body against schema
    const { error, value } = schema.validate(req.body, {
      // abortEarly: false - Return all validation errors, not just the first one
      // This provides better UX (user can fix all errors at once)
      abortEarly: false,
      
      // stripUnknown: true - Remove fields not defined in schema
      // Security: Prevents mass assignment attacks (e.g., user setting isAdmin: true)
      stripUnknown: true
    });
    
    // If validation failed, return 422 with detailed errors
    if (error) {
      // Transform Joi error details into user-friendly format
      // error.details is an array of { path, message, type, context }
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),  // e.g., 'sampleTestCases.0.input'
        message: detail.message         // e.g., '"input" is required'
      }));
      
      return res.status(422).json({
        error: 'Validation Error',
        details: errors
      });
    }
    
    // Replace req.body with validated and sanitized value
    // This ensures downstream code only sees valid data
    // Unknown fields have been stripped, types have been coerced
    req.body = value;
    
    // Continue to route handler
    next();
  };
};

/**
 * Common Validation Schemas
 * 
 * Centralized Joi schemas for common API endpoints. These schemas define
 * the expected structure and constraints for request bodies.
 * 
 * Benefits of centralized schemas:
 * - Single source of truth for validation rules
 * - Easy to update validation logic across multiple endpoints
 * - Reusable across different routes
 * - Self-documenting API contracts
 */
exports.schemas = {
  // ============================================================================
  // AUTH SCHEMAS
  // ============================================================================
  
  /**
   * Registration schema
   * 
   * Validates user registration data:
   * - username: 3-30 alphanumeric characters (no special chars for simplicity)
   * - email: Valid email format (RFC 5322)
   * - password: Minimum 8 characters (OWASP recommendation)
   * 
   * Example valid input:
   * { username: 'john123', email: 'john@example.com', password: 'SecurePass123' }
   */
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),
  
  /**
   * Login schema
   * 
   * Validates login credentials:
   * - email: Valid email format
   * - password: Any string (we don't validate length here to avoid leaking info)
   * 
   * Example valid input:
   * { email: 'john@example.com', password: 'SecurePass123' }
   */
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  // ============================================================================
  // PROBLEM SCHEMAS
  // ============================================================================
  
  /**
   * Create problem schema
   * 
   * Validates problem creation data:
   * - title: 3-200 characters (e.g., "Two Sum")
   * - slug: URL-friendly identifier (e.g., "two-sum")
   * - description: Problem statement (Markdown supported)
   * - constraints: Input constraints (e.g., "1 <= n <= 10^5")
   * - timeLimit: 100-10000 ms (0.1s to 10s)
   * - memoryLimit: 16-512 MB
   * - difficulty: easy, medium, or hard
   * - sampleTestCases: At least 1 sample test case with input/output
   * 
   * Example valid input:
   * {
   *   title: "Two Sum",
   *   slug: "two-sum",
   *   description: "Given an array of integers...",
   *   constraints: "2 <= nums.length <= 10^4",
   *   timeLimit: 1000,
   *   memoryLimit: 256,
   *   difficulty: "easy",
   *   sampleTestCases: [
   *     { input: "2 7 11 15\n9", output: "0 1" }
   *   ]
   * }
   */
  createProblem: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
    description: Joi.string().required(),
    constraints: Joi.string().required(),
    timeLimit: Joi.number().integer().min(100).max(10000).required(),
    memoryLimit: Joi.number().integer().min(16).max(512).required(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
    sampleTestCases: Joi.array().items(
      Joi.object({
        input: Joi.string().required(),
        output: Joi.string().required()
      })
    ).min(1).required()
  }),
  
  // ============================================================================
  // SUBMISSION SCHEMAS
  // ============================================================================
  
  /**
   * Create submission schema
   * 
   * Validates code submission data:
   * - problemId: Valid MongoDB ObjectId (24 hex characters)
   * - contestId: Optional MongoDB ObjectId (for contest submissions)
   * - language: cpp or python
   * - code: 1-50000 characters (prevents DoS from huge submissions)
   * 
   * Example valid input:
   * {
   *   problemId: "507f1f77bcf86cd799439011",
   *   language: "cpp",
   *   code: "#include <iostream>\nint main() { ... }"
   * }
   */
  createSubmission: Joi.object({
    problemId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    contestId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    language: Joi.string().valid('cpp', 'python').required(),
    code: Joi.string().min(1).max(50000).required()
  }),
  
  // ============================================================================
  // CONTEST SCHEMAS
  // ============================================================================
  
  /**
   * Create contest schema
   * 
   * Validates contest creation data:
   * - title: 3-200 characters (e.g., "Weekly Contest #42")
   * - startTime: ISO 8601 date string (e.g., "2024-01-15T10:00:00Z")
   * - endTime: ISO 8601 date string, must be after startTime
   * - problemIds: Array of at least 1 valid MongoDB ObjectId
   * 
   * Cross-field validation:
   * - endTime must be greater than startTime (prevents invalid contests)
   * 
   * Example valid input:
   * {
   *   title: "Weekly Contest #42",
   *   startTime: "2024-01-15T10:00:00Z",
   *   endTime: "2024-01-15T12:00:00Z",
   *   problemIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
   * }
   */
  createContest: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
    problemIds: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).min(1).required()
  })
};
