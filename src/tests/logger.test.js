const Logger = require('../../src/logger');

// Mock @actions/core
jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const core = require('@actions/core');

describe('Logger', () => {
  let logger;
  let originalEnv;
  let consoleSpy;

  beforeEach(() => {
    originalEnv = process.env;
    logger = new Logger('TestContext');

    // Spy on console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('info logging', () => {
    it('should log info messages to console', () => {
      logger.info('Test info message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('INFO [TestContext] Test info message')
      );
    });
  });

  describe('warn logging', () => {
    it('should log warning messages to console and core', () => {
      logger.warn('Test warning');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('WARN [TestContext] Test warning')
      );
      expect(core.warning).toHaveBeenCalledWith(
          expect.stringContaining('Test warning')
      );
    });

    it('should include data in warning messages', () => {
      logger.warn('Warning message', 'additional data');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('Warning message - additional data')
      );
    });
  });

  describe('error logging', () => {
    it('should log error messages to console and core', () => {
      logger.error('Test error');

      expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('ERROR [TestContext] Test error')
      );
      expect(core.error).toHaveBeenCalledWith(
          expect.stringContaining('Test error')
      );
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error object');
      logger.error('Error occurred', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('Error occurred - Test error object')
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(error.stack);
    });

    it('should handle errors without stack trace', () => {
      const errorLikeObject = { message: 'Error message' };
      logger.error('Error occurred', errorLikeObject);

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('debug logging', () => {
    it('should log debug messages when RUNNER_DEBUG is enabled', () => {
      process.env.RUNNER_DEBUG = '1';

      logger.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('DEBUG [TestContext] Debug message')
      );
      expect(core.debug).toHaveBeenCalledWith(
          expect.stringContaining('Debug message')
      );
    });

    it('should not log debug messages when RUNNER_DEBUG is disabled', () => {
      delete process.env.RUNNER_DEBUG;

      logger.debug('Debug message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(core.debug).not.toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('should format messages with timestamp and context', () => {
      logger.info('Test message');

      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO \[TestContext\] Test message/);
    });

    it('should handle logger without context', () => {
      const contextlessLogger = new Logger();
      contextlessLogger.info('No context message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('INFO  No context message')
      );
    });

    it('should format Error objects correctly', () => {
      const error = new Error('Test error');
      logger.formatMessage('ERROR', 'Something failed', error);

      const result = logger.formatMessage('ERROR', 'Something failed', error);
      expect(result).toContain('Something failed - Test error');
    });

    it('should format objects as JSON', () => {
      const data = { key: 'value', number: 42 };
      const result = logger.formatMessage('INFO', 'Object data', data);

      expect(result).toContain('"key": "value"');
      expect(result).toContain('"number": 42');
    });

    it('should format primitive data types', () => {
      const result = logger.formatMessage('INFO', 'Primitive data', 'string value');
      expect(result).toContain('Primitive data - string value');
    });
  });

  describe('createChild', () => {
    it('should create child logger with extended context', () => {
      const childLogger = logger.createChild('ChildContext');
      childLogger.info('Child message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('[TestContext:ChildContext] Child message')
      );
    });

    it('should create child logger from contextless parent', () => {
      const parentLogger = new Logger();
      const childLogger = parentLogger.createChild('OnlyChild');

      childLogger.info('Child message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('[OnlyChild] Child message')
      );
    });

    it('should chain multiple child loggers', () => {
      const childLogger = logger.createChild('Child');
      const grandChildLogger = childLogger.createChild('GrandChild');

      grandChildLogger.info('Nested message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('[TestContext:Child:GrandChild] Nested message')
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex logging scenario', () => {
      const fileLogger = logger.createChild('FileProcessor');

      fileLogger.info('Starting file processing');
      fileLogger.warn('File not found', { filename: 'test.js' });

      const error = new Error('Processing failed');
      fileLogger.error('Failed to process file', error);

      expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('[TestContext:FileProcessor] Starting file processing')
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('[TestContext:FileProcessor] File not found')
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[TestContext:FileProcessor] Failed to process file')
      );
    });

    it('should maintain separate contexts for different loggers', () => {
      const logger1 = new Logger('Context1');
      const logger2 = new Logger('Context2');

      logger1.info('Message from context 1');
      logger2.info('Message from context 2');

      expect(consoleSpy.log).toHaveBeenNthCalledWith(1,
          expect.stringContaining('[Context1] Message from context 1')
      );
      expect(consoleSpy.log).toHaveBeenNthCalledWith(2,
          expect.stringContaining('[Context2] Message from context 2')
      );
    });
  });
});
