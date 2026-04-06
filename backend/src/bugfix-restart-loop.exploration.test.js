/**
 * Bug Condition Exploration Test - Backend Restart Loop
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * PURPOSE:
 * This test explores the bug condition by checking for:
 * 1. Mongoose duplicate index warnings during startup
 * 2. Redis configured with wrong eviction policy (allkeys-lru instead of noeviction)
 * 3. Backend startup behavior that could trigger restart loops
 * 
 * EXPECTED OUTCOME ON UNFIXED CODE:
 * - Test FAILS (this is correct - it proves the bug exists)
 * - Counterexamples found:
 *   - Mongoose warnings: "Index with name: username_1 already exists with different options"
 *   - Redis policy: maxmemory-policy is "allkeys-lru" instead of "noeviction"
 *   - Duplicate index definitions in User and Problem models
 * 
 * EXPECTED OUTCOME ON FIXED CODE:
 * - Test PASSES (confirms bug is fixed)
 * - No Mongoose warnings
 * - Redis uses "noeviction" policy
 * - No duplicate index definitions
 */

const mongoose = require('mongoose');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

describe('Bug Condition Exploration: Backend Restart Loop', () => {
  let redisClient;
  
  beforeAll(async () => {
    // Connect to Redis to check configuration
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl);
  });
  
  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });

  /**
   * Property 1: Bug Condition - Mongoose Duplicate Index Detection
   * 
   * This test checks if the User and Problem models have duplicate index definitions
   * that would cause Mongoose to emit warnings during startup.
   * 
   * Bug Condition: userSchemaHasUniqueFieldAndExplicitIndex('username')
   *                OR userSchemaHasUniqueFieldAndExplicitIndex('email')
   *                OR problemSchemaHasUniqueFieldAndExplicitIndex('slug')
   * 
   * Expected Behavior (after fix): No duplicate index definitions
   */
  test('should detect duplicate Mongoose index definitions in User model', () => {
    // Read the User model source code
    const userModelPath = path.join(__dirname, 'modules/auth/model.js');
    const userModelSource = fs.readFileSync(userModelPath, 'utf8');
    
    // Check for duplicate username index
    // Bug: Both `username: { unique: true }` AND `userSchema.index({ username: 1 })`
    const hasUniqueUsername = userModelSource.includes('username:') && 
                              userModelSource.includes('unique: true');
    const hasExplicitUsernameIndex = userModelSource.includes('userSchema.index({ username: 1 })');
    
    const hasDuplicateUsernameIndex = hasUniqueUsername && hasExplicitUsernameIndex;
    
    // Check for duplicate email index
    // Bug: Both `email: { unique: true }` AND `userSchema.index({ email: 1 })`
    const hasUniqueEmail = userModelSource.includes('email:') && 
                           userModelSource.includes('unique: true');
    const hasExplicitEmailIndex = userModelSource.includes('userSchema.index({ email: 1 })');
    
    const hasDuplicateEmailIndex = hasUniqueEmail && hasExplicitEmailIndex;
    
    // Document counterexamples
    if (hasDuplicateUsernameIndex) {
      console.log('COUNTEREXAMPLE: User model has duplicate username index');
      console.log('  - Field definition: username: { unique: true }');
      console.log('  - Explicit index: userSchema.index({ username: 1 })');
    }
    
    if (hasDuplicateEmailIndex) {
      console.log('COUNTEREXAMPLE: User model has duplicate email index');
      console.log('  - Field definition: email: { unique: true }');
      console.log('  - Explicit index: userSchema.index({ email: 1 })');
    }
    
    // EXPECTED TO FAIL on unfixed code (duplicate indexes exist)
    // EXPECTED TO PASS on fixed code (duplicate indexes removed)
    expect(hasDuplicateUsernameIndex).toBe(false);
    expect(hasDuplicateEmailIndex).toBe(false);
  });

  test('should detect duplicate Mongoose index definitions in Problem model', () => {
    // Read the Problem model source code
    const problemModelPath = path.join(__dirname, 'modules/problems/model.js');
    const problemModelSource = fs.readFileSync(problemModelPath, 'utf8');
    
    // Check for duplicate slug index
    // Bug: Both `slug: { unique: true }` AND `problemSchema.index({ slug: 1 })`
    const hasUniqueSlug = problemModelSource.includes('slug:') && 
                          problemModelSource.includes('unique: true');
    const hasExplicitSlugIndex = problemModelSource.includes('problemSchema.index({ slug: 1 })');
    
    const hasDuplicateSlugIndex = hasUniqueSlug && hasExplicitSlugIndex;
    
    // Document counterexample
    if (hasDuplicateSlugIndex) {
      console.log('COUNTEREXAMPLE: Problem model has duplicate slug index');
      console.log('  - Field definition: slug: { unique: true }');
      console.log('  - Explicit index: problemSchema.index({ slug: 1 })');
    }
    
    // EXPECTED TO FAIL on unfixed code (duplicate index exists)
    // EXPECTED TO PASS on fixed code (duplicate index removed)
    expect(hasDuplicateSlugIndex).toBe(false);
  });

  /**
   * Property 1: Bug Condition - Redis Eviction Policy Detection
   * 
   * This test checks if Redis is configured with the wrong eviction policy.
   * 
   * Bug Condition: redisEvictionPolicy == 'allkeys-lru' AND applicationUsesBullMQ == true
   * 
   * Expected Behavior (after fix): redisEvictionPolicy == 'noeviction'
   */
  test('should detect Redis wrong eviction policy (allkeys-lru instead of noeviction)', async () => {
    // Query Redis for its maxmemory-policy configuration
    const config = await redisClient.config('GET', 'maxmemory-policy');
    const evictionPolicy = config[1]; // config returns ['maxmemory-policy', 'value']
    
    // Document counterexample
    if (evictionPolicy === 'allkeys-lru') {
      console.log('COUNTEREXAMPLE: Redis is configured with wrong eviction policy');
      console.log(`  - Current policy: ${evictionPolicy}`);
      console.log('  - Expected policy: noeviction');
      console.log('  - Impact: BullMQ job data can be evicted, causing job loss');
    }
    
    // EXPECTED TO FAIL on unfixed code (policy is allkeys-lru)
    // EXPECTED TO PASS on fixed code (policy is noeviction)
    expect(evictionPolicy).toBe('noeviction');
  });

  /**
   * Property 1: Bug Condition - Docker Compose Configuration Check
   * 
   * This test verifies the docker-compose.yml has the correct Redis configuration.
   */
  test('should detect wrong Redis eviction policy in docker-compose.yml', () => {
    // Read docker-compose.yml
    const dockerComposePath = path.join(__dirname, '../../docker-compose.yml');
    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
    
    // Check if Redis service uses allkeys-lru
    const hasWrongPolicy = dockerComposeContent.includes('--maxmemory-policy') &&
                           dockerComposeContent.includes('allkeys-lru');
    
    const hasCorrectPolicy = dockerComposeContent.includes('--maxmemory-policy') &&
                             dockerComposeContent.includes('noeviction');
    
    // Document counterexample
    if (hasWrongPolicy) {
      console.log('COUNTEREXAMPLE: docker-compose.yml has wrong Redis eviction policy');
      console.log('  - Found: --maxmemory-policy allkeys-lru');
      console.log('  - Expected: --maxmemory-policy noeviction');
    }
    
    // EXPECTED TO FAIL on unfixed code (allkeys-lru in config)
    // EXPECTED TO PASS on fixed code (noeviction in config)
    expect(hasWrongPolicy).toBe(false);
    expect(hasCorrectPolicy).toBe(true);
  });

  /**
   * Property 1: Bug Condition - Nodemon Configuration Check
   * 
   * This test checks if nodemon has proper watch configuration to prevent
   * unnecessary restarts from non-code file changes.
   */
  test('should detect missing or incorrect nodemon configuration', () => {
    const nodemonConfigPath = path.join(__dirname, '../nodemon.json');
    
    // Check if nodemon.json exists
    const nodemonConfigExists = fs.existsSync(nodemonConfigPath);
    
    if (!nodemonConfigExists) {
      console.log('COUNTEREXAMPLE: nodemon.json does not exist');
      console.log('  - Impact: nodemon uses default watch patterns');
      console.log('  - Risk: May watch non-code files (logs, temp files) causing unnecessary restarts');
    }
    
    // If config exists, check if it has proper watch patterns
    if (nodemonConfigExists) {
      const nodemonConfig = JSON.parse(fs.readFileSync(nodemonConfigPath, 'utf8'));
      
      const hasWatchConfig = nodemonConfig.watch && Array.isArray(nodemonConfig.watch);
      const hasIgnoreConfig = nodemonConfig.ignore && Array.isArray(nodemonConfig.ignore);
      const hasDelay = nodemonConfig.delay && nodemonConfig.delay >= 1000;
      
      if (!hasWatchConfig || !hasIgnoreConfig || !hasDelay) {
        console.log('COUNTEREXAMPLE: nodemon.json has incomplete configuration');
        if (!hasWatchConfig) console.log('  - Missing: watch patterns');
        if (!hasIgnoreConfig) console.log('  - Missing: ignore patterns');
        if (!hasDelay) console.log('  - Missing: restart delay (should be >= 1000ms)');
      }
      
      // EXPECTED TO PASS on fixed code (proper config exists)
      expect(hasWatchConfig).toBe(true);
      expect(hasIgnoreConfig).toBe(true);
      expect(hasDelay).toBe(true);
    } else {
      // EXPECTED TO FAIL on unfixed code (config doesn't exist)
      expect(nodemonConfigExists).toBe(true);
    }
  });
});
