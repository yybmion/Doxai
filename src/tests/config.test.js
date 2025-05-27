// Mock @actions/core before importing Config
jest.mock('@actions/core', () => ({
  getInput: jest.fn()
}));

const core = require('@actions/core');

describe('Config', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear module cache to ensure fresh import
    delete require.cache[require.resolve('../../src/config')];

    // Clear all mocks
    jest.clearAllMocks();

    // Set default mock values for successful initialization
    core.getInput.mockImplementation((name) => {
      const defaults = {
        'github-token': 'test-github-token',
        'ai-provider': 'google',
        'ai-model': 'gemini-1.5-flash',
        'ai-api-key': 'test-api-key',
        'language': 'en'
      };
      return defaults[name] || '';
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clear module cache after each test
    delete require.cache[require.resolve('../../src/config')];
  });

  describe('initialization with defaults', () => {
    it('should initialize with default values', () => {
      const Config = require('../../src/config');

      expect(Config.githubToken).toBe('test-github-token');
      expect(Config.aiProvider).toBe('google');
      expect(Config.aiModel).toBe('gemini-1.5-flash');
      expect(Config.aiApiKey).toBe('test-api-key');
      expect(Config.language).toBe('en');
    });

    it('should have correct file configuration', () => {
      const Config = require('../../src/config');

      expect(Config.fileConfig.documentableExtensions).toContain('js');
      expect(Config.fileConfig.documentableExtensions).toContain('py');
      expect(Config.fileConfig.documentableExtensions).toContain('java');

      expect(Config.fileConfig.excludePatterns).toContain('node_modules/');
      expect(Config.fileConfig.excludePatterns).toContain('.git/');

      expect(Config.fileConfig.specialFiles).toContain('dockerfile');
      expect(Config.fileConfig.specialFiles).toContain('makefile');
    });
  });

  describe('AI provider configurations', () => {
    it('should have configurations for all supported providers', () => {
      const Config = require('../../src/config');

      expect(Config.aiProviderConfig.openai).toBeDefined();
      expect(Config.aiProviderConfig.anthropic).toBeDefined();
      expect(Config.aiProviderConfig.google).toBeDefined();
    });

    it('should have correct endpoint URLs', () => {
      const Config = require('../../src/config');

      expect(Config.aiProviderConfig.openai.endpoint).toBe('https://api.openai.com/v1/chat/completions');
      expect(Config.aiProviderConfig.anthropic.endpoint).toBe('https://api.anthropic.com/v1/messages');
      expect(Config.aiProviderConfig.google.endpoint).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    });

    it('should have correct model lists', () => {
      const Config = require('../../src/config');

      expect(Config.aiProviderConfig.openai.models).toContain('gpt-4');
      expect(Config.aiProviderConfig.anthropic.models).toContain('claude-3-opus');
      expect(Config.aiProviderConfig.google.models).toContain('gemini-1.5-flash');
    });
  });

  describe('helper methods', () => {
    it('should return correct AI endpoint', () => {
      const Config = require('../../src/config');

      expect(Config.getAIEndpoint()).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    });

    it('should return correct AI headers', () => {
      const Config = require('../../src/config');

      const headers = Config.getAIHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-goog-api-key']).toBe('test-api-key');
    });

    it('should validate model correctly', () => {
      const Config = require('../../src/config');

      expect(Config.isValidModel('gemini-1.5-flash')).toBe(true);
      expect(Config.isValidModel('invalid-model')).toBe(false);
    });
  });

  describe('different AI providers', () => {
    it('should work with OpenAI configuration', () => {
      const Config = require('../../src/config');

      // Test that OpenAI config structure is correct
      const openaiConfig = Config.aiProviderConfig.openai;
      expect(openaiConfig.endpoint).toBe('https://api.openai.com/v1/chat/completions');
      expect(openaiConfig.models).toContain('gpt-4');

      const headers = openaiConfig.headers('test-key');
      expect(headers['Authorization']).toBe('Bearer test-key');
    });

    it('should work with Anthropic configuration', () => {
      const Config = require('../../src/config');

      const anthropicConfig = Config.aiProviderConfig.anthropic;
      expect(anthropicConfig.endpoint).toBe('https://api.anthropic.com/v1/messages');
      expect(anthropicConfig.models).toContain('claude-3-opus');

      const headers = anthropicConfig.headers('test-key');
      expect(headers['x-api-key']).toBe('test-key');
      expect(headers['anthropic-version']).toBe('2025-05-01');
    });

    it('should work with Google configuration', () => {
      const Config = require('../../src/config');

      const googleConfig = Config.aiProviderConfig.google;
      expect(googleConfig.endpoint).toBe('https://generativelanguage.googleapis.com/v1beta/models');
      expect(googleConfig.models).toContain('gemini-1.5-flash');

      const headers = googleConfig.headers('test-key');
      expect(headers['x-goog-api-key']).toBe('test-key');
    });
  });

  describe('file configuration details', () => {
    it('should include all expected documentable extensions', () => {
      const Config = require('../../src/config');
      const extensions = Config.fileConfig.documentableExtensions;

      // Programming languages
      expect(extensions).toContain('js');
      expect(extensions).toContain('ts');
      expect(extensions).toContain('py');
      expect(extensions).toContain('java');
      expect(extensions).toContain('cpp');
      expect(extensions).toContain('rs');
      expect(extensions).toContain('go');

      // Web technologies
      expect(extensions).toContain('html');
      expect(extensions).toContain('css');
      expect(extensions).toContain('vue');

      // Configuration files
      expect(extensions).toContain('json');
      expect(extensions).toContain('yaml');
      expect(extensions).toContain('toml');

      // Documentation
      expect(extensions).toContain('md');
      expect(extensions).toContain('adoc');
    });

    it('should include all expected exclude patterns', () => {
      const Config = require('../../src/config');
      const patterns = Config.fileConfig.excludePatterns;

      expect(patterns).toContain('node_modules/');
      expect(patterns).toContain('dist/');
      expect(patterns).toContain('build/');
      expect(patterns).toContain('.git/');
      expect(patterns).toContain('.vscode/');
      expect(patterns).toContain('.idea/');
      expect(patterns).toContain('package-lock.json');
      expect(patterns).toContain('.env');
    });

    it('should include all expected special files', () => {
      const Config = require('../../src/config');
      const specialFiles = Config.fileConfig.specialFiles;

      expect(specialFiles).toContain('dockerfile');
      expect(specialFiles).toContain('makefile');
      expect(specialFiles).toContain('rakefile');
      expect(specialFiles).toContain('gemfile');
      expect(specialFiles).toContain('podfile');
    });
  });

  describe('template path configuration', () => {
    it('should have correct template path', () => {
      const Config = require('../../src/config');

      expect(Config.templatePath).toBeDefined();
      expect(Config.templatePath).toContain('templates');
    });
  });
});
