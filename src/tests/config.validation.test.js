// config.validation.test.js - 별도 파일로 분리
jest.mock('@actions/core', () => ({
  getInput: jest.fn()
}));

const core = require('@actions/core');

describe('Config Validation', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error for missing github-token', () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'github-token') return '';
      if (name === 'ai-api-key') return 'test-key';
      if (name === 'ai-provider') return 'google';
      if (name === 'ai-model') return 'gemini-1.5-flash';
      if (name === 'language') return 'en';
      return '';
    });

    expect(() => {
      require('../../src/config');
    }).toThrow('Required input \'github-token\' is missing');
  });

  it('should throw error for missing ai-api-key', () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'github-token') return 'test-token';
      if (name === 'ai-api-key') return '';
      if (name === 'ai-provider') return 'google';
      if (name === 'ai-model') return 'gemini-1.5-flash';
      if (name === 'language') return 'en';
      return '';
    });

    expect(() => {
      require('../../src/config');
    }).toThrow('Required input \'ai-api-key\' is missing');
  });

  it('should throw error for unsupported AI provider', () => {
    core.getInput.mockImplementation((name) => {
      const values = {
        'github-token': 'test-token',
        'ai-provider': 'unsupported-provider',
        'ai-api-key': 'test-key',
        'ai-model': 'some-model',
        'language': 'en'
      };
      return values[name] || '';
    });

    expect(() => {
      require('../../src/config');
    }).toThrow('Unsupported AI provider: unsupported-provider');
  });

  it('should throw error for unsupported language', () => {
    core.getInput.mockImplementation((name) => {
      const values = {
        'github-token': 'test-token',
        'ai-api-key': 'test-key',
        'ai-provider': 'google',
        'ai-model': 'gemini-1.5-flash',
        'language': 'fr'
      };
      return values[name] || '';
    });

    expect(() => {
      require('../../src/config');
    }).toThrow('Unsupported language: fr');
  });
});
