// S3 client configuration tests
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock S3Client before requiring the module
const mockS3Client = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: mockS3Client,
}));

describe('S3 Configuration', () => {
  let s3Client, getBucketName, createS3Client;
  let consoleLogSpy, consoleWarnSpy;
  let capturedConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    
    // Mock S3Client constructor to capture config
    mockS3Client.mockImplementation((config) => {
      capturedConfig = config;
      return { config };
    });

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Reset module cache to get fresh instance
    jest.resetModules();
    const s3 = require('./s3');
    s3Client = s3;
    getBucketName = s3.getBucketName;
    createS3Client = s3.createS3Client;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Client Creation', () => {
    it('should create S3 client with credentials from environment', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.AWS_REGION = 'us-west-2';

      jest.resetModules();
      jest.clearAllMocks();
      mockS3Client.mockImplementation((config) => {
        capturedConfig = config;
        return { config };
      });
      require('./s3');

      expect(mockS3Client).toHaveBeenCalled();
      expect(capturedConfig.region).toBe('us-west-2');
      expect(capturedConfig.credentials).toEqual({
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      });

      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
    });

    it('should use default region when AWS_REGION is not set', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      delete process.env.AWS_REGION;

      jest.resetModules();
      mockS3Client.mockImplementation((config) => {
        capturedConfig = config;
        return { config };
      });
      require('./s3');

      expect(capturedConfig.region).toBe('us-east-1');

      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
    });

    it('should warn when credentials are missing', () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      jest.resetModules();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      require('./s3');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AWS credentials not configured')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY')
      );
    });

    it('should create client with undefined credentials when missing', () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      jest.resetModules();
      mockS3Client.mockImplementation((config) => {
        capturedConfig = config;
        return { config };
      });
      require('./s3');

      expect(capturedConfig.credentials).toBeUndefined();
    });

    it('should log successful initialization', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.AWS_REGION = 'eu-west-1';

      jest.resetModules();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      require('./s3');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('S3 client initialized (region: eu-west-1)')
      );

      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
    });
  });

  describe('getBucketName', () => {
    it('should return bucket name from environment', () => {
      process.env.S3_BUCKET_NAME = 'my-test-bucket';

      const bucketName = getBucketName();

      expect(bucketName).toBe('my-test-bucket');

      delete process.env.S3_BUCKET_NAME;
    });

    it('should return default bucket name when not set', () => {
      delete process.env.S3_BUCKET_NAME;

      const bucketName = getBucketName();

      expect(bucketName).toBe('codecourt-test-cases');
    });
  });

  describe('Module Exports', () => {
    it('should export s3Client as default', () => {
      expect(s3Client).toBeDefined();
      expect(s3Client.config).toBeDefined();
    });

    it('should export getBucketName function', () => {
      expect(getBucketName).toBeDefined();
      expect(typeof getBucketName).toBe('function');
    });

    it('should export createS3Client function', () => {
      expect(createS3Client).toBeDefined();
      expect(typeof createS3Client).toBe('function');
    });
  });

  describe('createS3Client function', () => {
    it('should create a new S3 client instance', () => {
      process.env.AWS_ACCESS_KEY_ID = 'new-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'new-secret';
      process.env.AWS_REGION = 'ap-south-1';

      const newClient = createS3Client();

      expect(newClient).toBeDefined();
      expect(mockS3Client).toHaveBeenCalled();

      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
    });
  });
});
