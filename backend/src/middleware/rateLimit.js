/**
 * Rate Limiting Middleware
 * 
 * VISION:
 * Protect the API from abuse, brute force attacks, and denial-of-service (DoS) attempts
 * by limiting the number of requests per IP address. This ensures fair resource usage
 * and maintains system availability for all users.
 * 
 * WHY THIS EXISTS:
 * - Brute force attacks: Attackers try thousands of password combinations
 * - DoS attacks: Malicious users overwhelm the server with requests
 * - Resource exhaustion: Buggy clients or scripts can accidentally overload the API
 * - Fair usage: Prevents single users from monopolizing server resources
 * - Cost control: Reduces unnecessary database/Redis queries from spam requests
 * 
 * WHAT IT DOES:
 * 1. Tracks request count per IP address using Redis
 * 2. Enforces different limits for different endpoints (login vs general API)
 * 3. Returns 429 Too Many Requests when limit exceeded
 * 4. Includes rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
 * 5. Automatically resets counters after time window expires
 * 
 * DESIGN DECISIONS:
 * - Uses Redis for distributed rate limiting (works across multiple server instances)
 * - Different limits for different endpoints (login is more restrictive)
 * - Tracks by IP address (simple, works for anonymous users)
 * - Login: 10 attempts / 15 minutes (prevents brute force)
 * - General API: 100 requests / 1 minute (prevents DoS)
 * - Includes standard rate limit headers (RFC 6585)
 * - Graceful degradation: if Redis fails, rate limiting is bypassed (availability over security)
 * 
 * RATE LIMIT STRATEGIES:
 * 
 * 1. Login Rate Limiter (Strict):
 *    - 10 attempts per IP per 15 minutes
 *    - Prevents brute force password attacks
 *    - Applied only to POST /api/auth/login
 * 
 * 2. General API Rate Limiter (Lenient):
 *    - 100 requests per IP per minute
 *    - Prevents DoS and resource exhaustion
 *    - Applied to all API endpoints (optional)
 * 
 * MIDDLEWARE STACK POSITION:
 * Rate limiters should be placed EARLY in the middleware stack:
 * ```javascript
 * app.use(express.json());
 * app.use(cors());
 * app.use('/api', apiRateLimiter); // Apply to all API routes
 * app.post('/api/auth/login', loginRateLimiter, loginHandler); // Specific endpoint
 * ```
 * 
 * USAGE:
 * ```javascript
 * const { loginRateLimiter, apiRateLimiter } = require('./middleware/rateLimit');
 * 
 * // Protect login endpoint
 * router.post('/login', loginRateLimiter, loginController);
 * 
 * // Protect all API routes
 * app.use('/api', apiRateLimiter);
 * 
 * // Or protect specific router
 * router.use(apiRateLimiter);
 * ```
 * 
 * RESPONSE HEADERS:
 * When rate limit is active, these headers are included:
 * - RateLimit-Limit: Maximum requests allowed in window (e.g., 10)
 * - RateLimit-Remaining: Requests remaining in current window (e.g., 7)
 * - RateLimit-Reset: Unix timestamp when window resets (e.g., 1699564800)
 * 
 * ERROR RESPONSE (429 Too Many Requests):
 * ```json
 * {
 *   "error": "Too Many Requests",
 *   "message": "Too many login attempts. Please try again later."
 * }
 * ```
 * 
 * REDIS KEY STRUCTURE:
 * - Login: `rl:login:{ip}` → count (TTL: 15 minutes)
 * - API: `rl:api:{ip}` → count (TTL: 1 minute)
 * 
 * SECURITY CONSIDERATIONS:
 * - IP-based tracking can be bypassed with VPNs/proxies
 * - For authenticated endpoints, consider tracking by user ID instead
 * - Adjust limits based on your traffic patterns and server capacity
 * - Monitor rate limit hits to detect attack patterns
 * 
 * FALLBACK BEHAVIOR:
 * If Redis is unavailable, rate limiting is bypassed (fail open).
 * This prioritizes availability over security. For stricter security,
 * configure the rate limiter to fail closed (reject requests if Redis down).
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

/**
 * Login rate limiter - 10 attempts per IP per 15 minutes
 * 
 * Protects the login endpoint from brute force attacks. With 10 attempts
 * per 15 minutes, an attacker would need 150 minutes (2.5 hours) to try
 * 100 passwords, making brute force attacks impractical.
 * 
 * Applied to: POST /api/auth/login
 * 
 * Example attack scenario:
 * - Attacker tries 10 passwords → Rate limited
 * - Must wait 15 minutes before trying again
 * - To try 1000 passwords: 1000/10 × 15min = 25 hours
 * 
 * Legitimate use case:
 * - User forgets password, tries 3-4 times → Still has 6-7 attempts left
 * - User locked out after 10 attempts → Wait 15 minutes or use password reset
 */
exports.loginRateLimiter = rateLimit({
  // Use Redis to store rate limit counters
  // This enables distributed rate limiting across multiple server instances
  store: new RedisStore({
    // sendCommand adapter for ioredis client
    sendCommand: (...args) => redis.call(...args),
    // Redis key prefix: rl:login:{ip}
    prefix: 'rl:login:'
  }),
  
  // Time window: 15 minutes (in milliseconds)
  windowMs: 15 * 60 * 1000,
  
  // Maximum requests per window: 10 attempts
  max: 10,
  
  // Error message returned when limit exceeded
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again later.'
  },
  
  // Include standard rate limit headers (RateLimit-*)
  standardHeaders: true,
  
  // Disable legacy headers (X-RateLimit-*)
  legacyHeaders: false
});

/**
 * General API rate limiter - 100 requests per IP per minute
 * 
 * Protects all API endpoints from DoS attacks and resource exhaustion.
 * 100 requests per minute is generous for normal usage but prevents abuse.
 * 
 * Applied to: All API routes (optional, can be applied globally or per-router)
 * 
 * Example legitimate usage:
 * - User browsing problems: ~10 requests/minute
 * - User submitting code: ~5 requests/minute
 * - Frontend polling leaderboard: ~6 requests/minute (every 10s)
 * - Total: ~20 requests/minute (well under limit)
 * 
 * Example abuse scenario:
 * - Attacker sends 1000 requests/minute → Rate limited after 100
 * - Must wait 1 minute before continuing
 * - Prevents server overload and database exhaustion
 */
exports.apiRateLimiter = rateLimit({
  // Use Redis to store rate limit counters
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    // Redis key prefix: rl:api:{ip}
    prefix: 'rl:api:'
  }),
  
  // Time window: 1 minute (in milliseconds)
  windowMs: 60 * 1000,
  
  // Maximum requests per window: 100 requests
  max: 100,
  
  // Error message returned when limit exceeded
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down.'
  },
  
  // Include standard rate limit headers (RateLimit-*)
  standardHeaders: true,
  
  // Disable legacy headers (X-RateLimit-*)
  legacyHeaders: false
});
