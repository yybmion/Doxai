// main.test.js
const path = require('path');

// Mock required modules
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));
jest.mock('@actions/github');
jest.mock('../github');
jest.mock('../ai-client');
jest.mock('../config', () => ({
  githubToken: 'mock-token',
  aiProvider: 'google',
  aiModel: 'gemini-1.5-flash',
  aiApiKey: 'mock-api-key',
  language: 'en',
  aiEndpoints: {
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    azure: 'https://mock-azure-endpoint.com'
  },
  templatePath: './templates'
}));
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Import mocked classes and functions
const GitHubClient = require('../github');
const AIClient = require('../ai-client');
const { docsPromptTemplates, createDocsPrompt } = require('../docs-prompt');
const fs = require('fs').promises;

// Setup mock objects
const mockGitHubClient = {
  getPRDetails: jest.fn(),
  getChangedFiles: jest.fn(),
  getFileContent: jest.fn(),
  createPRComment: jest.fn(),
  createBranch: jest.fn(),
  commitFile: jest.fn(),
  createPR: jest.fn()
};

const mockAIClient = {
  sendPrompt: jest.fn()
};

// Mock constructors
GitHubClient.mockImplementation(() => mockGitHubClient);
AIClient.mockImplementation(() => mockAIClient);

// Mock GitHub context and environment variables
process.env.GITHUB_EVENT_NAME = 'issue_comment';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
process.env.GITHUB_REPOSITORY_OWNER = 'test-owner';

// Import main module (after all mocks are set up)
const main = require('../main');

// Get exported functions
const { parseCommand } = main;

describe('Main script functionality', () => {
  // Initialize mock objects before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up GitHub context
    require('@actions/github').context.payload = {
      issue: {
        number: 123,
        pull_request: {}
      },
      comment: {
        body: '@(test-project) --scope all --lang en',
        user: {
          login: 'test-user'
        }
      }
    };
  });

  describe('parseCommand function', () => {
    it('should correctly parse command with default options', () => {
      const result = parseCommand('@(test-project)');

      expect(result).toEqual({
        project: 'test-project',
        scope: 'all',
        lang: 'en'
      });
    });

    it('should parse scope option correctly', () => {
      const result = parseCommand('@(test-project) --scope include:file1.js,file2.js');

      expect(result).toEqual({
        project: 'test-project',
        scope: 'include:file1.js,file2.js',
        lang: 'en'
      });
    });

    it('should parse language option correctly', () => {
      const result = parseCommand('@(test-project) --lang ko');

      expect(result).toEqual({
        project: 'test-project',
        scope: 'all',
        lang: 'ko'
      });
    });

    it('should parse multiple options correctly', () => {
      const result = parseCommand('@(test-project) --scope exclude:test.js --lang ko');

      expect(result).toEqual({
        project: 'test-project',
        scope: 'exclude:test.js',
        lang: 'ko'
      });
    });

    it('should return null for invalid command format', () => {
      const result = parseCommand('not a valid command');
      expect(result).toBeNull();
    });
  });

  describe('filterFilesByScope function', () => {
    const testFiles = [
      { filename: 'src/file1.js', status: 'modified' },
      { filename: 'src/file2.js', status: 'added' },
      { filename: 'test/test.js', status: 'modified' }
    ];

    it('should return all files when scope is "all"', () => {
      const result = main.filterFilesByScope(testFiles, 'all');
      expect(result).toEqual(testFiles);
    });

    it('should filter files by include scope', () => {
      const result = main.filterFilesByScope(testFiles, 'include:file1.js');
      expect(result).toEqual([{ filename: 'src/file1.js', status: 'modified' }]);
    });

    it('should filter files by exclude scope', () => {
      const result = main.filterFilesByScope(testFiles, 'exclude:test.js');
      expect(result).toEqual([
        { filename: 'src/file1.js', status: 'modified' },
        { filename: 'src/file2.js', status: 'added' }
      ]);
    });
  });

  describe('Main workflow process', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Reset environment variables to default values
      process.env.GITHUB_EVENT_NAME = 'issue_comment';

      // Set default GitHub context
      require('@actions/github').context.payload = {
        issue: { number: 123, pull_request: {} },
        comment: {
          body: '@(test-project)',
          user: { login: 'test-user' }
        }
      };
    });

    it('should exit early if event is not a PR comment', async () => {
      // Set GitHub context to non-PR comment event
      process.env.GITHUB_EVENT_NAME = 'push';

      // Call main function directly
      await main.main();

      // Verify that GitHubClient methods were not called
      expect(mockGitHubClient.getPRDetails).not.toHaveBeenCalled();
    });

    it('should exit if comment is not a documentation command', async () => {
      require('@actions/github').context.payload.comment.body = 'not a documentation command';

      await main.main();

      expect(mockGitHubClient.getPRDetails).not.toHaveBeenCalled();
    });

    it('should check if PR is merged', async () => {
      // Set up GitHub context
      require('@actions/github').context.payload = {
        issue: { number: 123, pull_request: {} },
        comment: {
          body: '@(test-project)',
          user: { login: 'test-user' }
        }
      };

      // Set PR as not merged
      mockGitHubClient.getPRDetails.mockResolvedValue({
        number: 123,
        merged: false
      });

      // Run main function
      await main.main();

      // Verify PR status check method was called
      expect(mockGitHubClient.getPRDetails).toHaveBeenCalledWith(123);

      // Verify comment creation (error message for unmerged PR)
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('merged PR')
      );
    });

    it('should process files and generate documentation when PR is merged', async () => {
      // Set up mock data
      require('@actions/github').context.payload = {
        issue: { number: 123, pull_request: {} },
        comment: {
          body: '@(test-project)',
          user: { login: 'test-user' }
        }
      };

      mockGitHubClient.getPRDetails.mockResolvedValue({
        number: 123,
        title: 'Test PR',
        author: 'test-user',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        merged: true,
        mergedAt: '2023-01-02T00:00:00Z',
        mergedBy: 'merger-user',
        base: 'main',
        head: 'feature-branch'
      });

      mockGitHubClient.getChangedFiles.mockResolvedValue([
        {
          filename: 'src/file1.js',
          status: 'modified',
          additions: 10,
          deletions: 5
        }
      ]);

      mockGitHubClient.getFileContent.mockResolvedValue('const test = "file content";');
      mockAIClient.sendPrompt.mockResolvedValue('Generated documentation content');
      mockGitHubClient.createBranch.mockResolvedValue({});
      mockGitHubClient.commitFile.mockResolvedValue({});
      mockGitHubClient.createPR.mockResolvedValue({
        number: 456,
        html_url: 'https://github.com/test-owner/test-repo/pull/456'
      });

      // Run test
      await main.main();

      // Verify
      expect(mockGitHubClient.getChangedFiles).toHaveBeenCalledWith(123);
      expect(mockGitHubClient.createBranch).toHaveBeenCalledWith('main', expect.stringContaining('docs/test-project'));
      expect(mockGitHubClient.getFileContent).toHaveBeenCalledWith('src/file1.js', 'feature-branch');
      expect(mockAIClient.sendPrompt).toHaveBeenCalled();
      expect(mockGitHubClient.commitFile).toHaveBeenCalled();
      expect(mockGitHubClient.createPR).toHaveBeenCalled();
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('Documentation generation completed')
      );
    });

    it('should handle empty file list', async () => {
      require('@actions/github').context.payload = {
        issue: { number: 123, pull_request: {} },
        comment: {
          body: '@(test-project)',
          user: { login: 'test-user' }
        }
      };

      mockGitHubClient.getPRDetails.mockResolvedValue({
        number: 123,
        merged: true,
        base: 'main'
      });

      mockGitHubClient.getChangedFiles.mockResolvedValue([]);

      await main.main();

      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('No files to document')
      );
    });

    it('should handle file processing errors', async () => {
      require('@actions/github').context.payload = {
        issue: { number: 123, pull_request: {} },
        comment: {
          body: '@(test-project)',
          user: { login: 'test-user' }
        }
      };

      mockGitHubClient.getPRDetails.mockResolvedValue({
        number: 123,
        merged: true,
        base: 'main',
        head: 'feature-branch'
      });

      mockGitHubClient.getChangedFiles.mockResolvedValue([
        { filename: 'src/file1.js', status: 'modified' },
        { filename: 'src/file2.js', status: 'modified' }
      ]);

      mockGitHubClient.createBranch.mockResolvedValue({});

      // First file succeeds, second file fails
      mockGitHubClient.getFileContent
      .mockResolvedValueOnce('const file1 = "content";')
      .mockRejectedValueOnce(new Error('File not found'));

      mockAIClient.sendPrompt.mockResolvedValue('Generated documentation for file1');
      mockGitHubClient.commitFile.mockResolvedValue({});
      mockGitHubClient.createPR.mockResolvedValue({
        number: 456,
        html_url: 'https://github.com/test-owner/test-repo/pull/456'
      });

      await main.main();

      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringMatching(/failed/)
      );
    });

    it('should handle catastrophic errors', async () => {
      require('@actions/github').context.payload = {
        issue: { number: 123, pull_request: {} },
        comment: {
          body: '@(test-project)',
          user: { login: 'test-user' }
        }
      };

      // Simulate severe error
      mockGitHubClient.getPRDetails.mockRejectedValue(new Error('Critical error'));

      await main.main();

      // Verify error message comment was created
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('error')
      );
    });
  });
});
