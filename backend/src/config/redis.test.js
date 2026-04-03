// Redis connection tests
const mockOn = jest.fn();
const mockQuit = jest.fn().mockResolvedValue('OK');
const mockDisconnect = jest.fn();
let capturedUrl = null;
let capturedOptions = null;

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation((url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return { on: mockOn, quit: mockQuit, disconnect: mockDisconnect, status: 'ready' };
  });
});

describe('Redis Configuration', () => {
  let redisClient, closeRedis, consoleLogSpy, consoleErrorSpy, consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOn.mockClear();
    mockQuit.mockClear();
    mockDisconnect.mockClear();
    capturedUrl = null;
    capturedOptions = null;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    jest.resetModules();
    const redis = require('./redis');
    redisClient = redis;
    closeRedis = redis.closeRedis;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Client Creation', () => {
    it('should create Redis client with default URL', () => {
      delete process.env.REDIS_URL;
      jest.resetModules();
      require('./redis');
      expect(capturedUrl).toBe('redis://localhost:6379');
      expect(capturedOptions.maxRetriesPerRequest).toBeNull();
    });

    it('should register event handlers', () => {
      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('reconnecting', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('end', expect.any(Function));
    });
  });

  describe('Retry Strategy', () => {
    it('should return increasing delays', () => {
      const strategy = capturedOptions.retryStrategy;
      expect(strategy(1)).toBe(5000);
      expect(strategy(2)).toBe(10000);
      expect(strategy(3)).toBe(15000);
    });

    it('should cap at 30 seconds for high retry counts', () => {
      const strategy = capturedOptions.retryStrategy;
      expect(strategy(4)).toBe(20000);
      expect(strategy(5)).toBe(25000);
    });

    it('should return null after max retries', () => {
      expect(capturedOptions.retryStrategy(6)).toBeNull();
    });
  });

  describe('closeRedis', () => {
    it('should close gracefully', async () => {
      await closeRedis();
      expect(mockQuit).toHaveBeenCalled();
    });

    it('should force disconnect on error', async () => {
      mockQuit.mockRejectedValueOnce(new Error('Quit failed'));
      await closeRedis();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
