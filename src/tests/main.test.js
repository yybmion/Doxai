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

jest.mock('@actions/github', () => ({
  context: {
    payload: {
      issue: { number: 123, pull_request: {} },
      comment: {
        body: '!doxai',
        user: { login: 'test-user' }
      }
    }
  }
}));

jest.mock('../../src/github');
jest.mock('../../src/ai-client');

jest.mock('../../src/config', () => ({
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

jest.mock('../../src/docs-prompt', () => ({
  docsPromptTemplates: {
    en: 'English template mock for testing',
    ko: 'Korean template mock for testing'
  },
  createDocsPrompt: jest.fn().mockReturnValue('Test docs prompt'),
  createUpdateDocsPrompt: jest.fn().mockReturnValue('Test update prompt')
}));

// Import mocked classes and functions
const GitHubClient = require('../../src/github');
const AIClient = require('../../src/ai-client');
const { docsPromptTemplates, createDocsPrompt, createUpdateDocsPrompt } = require('../../src/docs-prompt');

// Setup mock objects with updated methods
const mockGitHubClient = {
  getPRDetails: jest.fn(),
  getChangedFiles: jest.fn(),
  getFileContent: jest.fn(),
  createPRComment: jest.fn(),
  createOrGetDocsBranch: jest.fn(), // Updated method
  commitFile: jest.fn(),
  createPR: jest.fn(),
  findExistingDocsPR: jest.fn(), // New method
  branchExists: jest.fn() // New method
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
const main = require('../../src/main');
const github = require('@actions/github');

// Get exported functions
const { parseCommand, filterFilesByScope } = main;

describe('Main script functionality - Updated Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables to default values
    process.env.GITHUB_EVENT_NAME = 'issue_comment';

    // Update GitHub context through the mock
    github.context.payload = {
      issue: { number: 123, pull_request: {} },
      comment: {
        body: '!doxai',
        user: { login: 'test-user' }
      }
    };
  });

  describe('parseCommand function', () => {
    it('should correctly parse command with default options', () => {
      const result = parseCommand('!doxai');

      expect(result).toEqual({
        project: 'doxai',
        scope: 'all',
        lang: 'en'
      });
    });

    it('should parse scope option correctly', () => {
      const result = parseCommand('!doxai --scope include:file1.js,file2.js');

      expect(result).toEqual({
        project: 'doxai',
        scope: 'include:file1.js,file2.js',
        lang: 'en'
      });
    });

    it('should parse language option correctly', () => {
      const result = parseCommand('!doxai --lang ko');

      expect(result).toEqual({
        project: 'doxai',
        scope: 'all',
        lang: 'ko'
      });
    });

    it('should parse multiple options correctly', () => {
      const result = parseCommand('!doxai --scope exclude:test.js --lang ko');

      expect(result).toEqual({
        project: 'doxai',
        scope: 'exclude:test.js',
        lang: 'ko'
      });
    });

    it('should return null for non-doxai commands', () => {
      const result = parseCommand('!other-tool');
      expect(result).toBeNull();
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
      { filename: 'test/test.js', status: 'modified' },
      { filename: 'package.json', status: 'modified' },
      { filename: 'README.md', status: 'modified' }
    ];

    it('should return all files when scope is "all"', () => {
      const result = filterFilesByScope(testFiles, 'all');
      expect(result).toEqual(testFiles);
    });

    it('should filter files by include scope', () => {
      const result = filterFilesByScope(testFiles, 'include:file1.js');
      expect(result).toEqual([{ filename: 'src/file1.js', status: 'modified' }]);
    });

    it('should filter files by include pattern', () => {
      const result = filterFilesByScope(testFiles, 'include:src/');
      expect(result).toEqual([
        { filename: 'src/file1.js', status: 'modified' },
        { filename: 'src/file2.js', status: 'added' }
      ]);
    });

    it('should filter files by exclude scope', () => {
      const result = filterFilesByScope(testFiles, 'exclude:test.js');
      expect(result).toEqual([
        { filename: 'src/file1.js', status: 'modified' },
        { filename: 'src/file2.js', status: 'added' },
        { filename: 'package.json', status: 'modified' },
        { filename: 'README.md', status: 'modified' }
      ]);
    });

    it('should handle multiple include patterns', () => {
      const result = filterFilesByScope(testFiles, 'include:file1.js,README.md');
      expect(result).toEqual([
        { filename: 'src/file1.js', status: 'modified' },
        { filename: 'README.md', status: 'modified' }
      ]);
    });

    it('should handle multiple exclude patterns', () => {
      const result = filterFilesByScope(testFiles, 'exclude:test.js,package.json');
      expect(result).toEqual([
        { filename: 'src/file1.js', status: 'modified' },
        { filename: 'src/file2.js', status: 'added' },
        { filename: 'README.md', status: 'modified' }
      ]);
    });
  });

  describe('Main workflow process - Updated Implementation', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Reset environment variables to default values
      process.env.GITHUB_EVENT_NAME = 'issue_comment';

      // Update GitHub context through the mock
      github.context.payload = {
        issue: { number: 123, pull_request: {} },
        comment: {
          body: '!doxai',
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
      github.context.payload.comment.body = 'not a documentation command';

      await main.main();

      expect(mockGitHubClient.getPRDetails).not.toHaveBeenCalled();
    });

    it('should check if PR is merged', async () => {
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

    it('should process files when PR is merged - New PR scenario', async () => {
      // Set up mock data for new PR scenario
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

      // Mock new PR scenario (no existing PR)
      mockGitHubClient.createOrGetDocsBranch.mockResolvedValue({
        branchName: 'docs/doxai-pr-123',
        created: true,
        existingPR: null
      });

      mockGitHubClient.getFileContent.mockResolvedValue('const test = "file content";');
      mockAIClient.sendPrompt.mockResolvedValue('Generated documentation content');
      mockGitHubClient.commitFile.mockResolvedValue({});
      mockGitHubClient.createPR.mockResolvedValue({
        number: 456,
        html_url: 'https://github.com/test-owner/test-repo/pull/456'
      });

      // Run test
      await main.main();

      // Verify new implementation methods were called
      expect(mockGitHubClient.getChangedFiles).toHaveBeenCalledWith(123);
      expect(mockGitHubClient.createOrGetDocsBranch).toHaveBeenCalledWith(
          'main',
          'docs/doxai-pr-123',
          123,
          'doxai'
      );
      expect(mockGitHubClient.getFileContent).toHaveBeenCalledWith('src/file1.js', 'feature-branch');
      expect(mockAIClient.sendPrompt).toHaveBeenCalled();
      expect(mockGitHubClient.commitFile).toHaveBeenCalled();
      expect(mockGitHubClient.createPR).toHaveBeenCalled();
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('Documentation generation completed')
      );
    });

    it('should process files when PR is merged - Existing PR scenario', async () => {
      // Set up mock data for existing PR scenario
      const mockExistingPR = {
        number: 456,
        title: 'docs: Generate documentation for doxai (PR #123)',
        url: 'https://github.com/test-owner/test-repo/pull/456',
        head: 'docs/doxai-pr-123',
        base: 'main'
      };

      mockGitHubClient.getPRDetails.mockResolvedValue({
        number: 123,
        title: 'Test PR',
        author: 'test-user',
        merged: true,
        base: 'main',
        head: 'feature-branch'
      });

      mockGitHubClient.getChangedFiles.mockResolvedValue([
        { filename: 'src/file1.js', status: 'modified' },
        { filename: 'src/file2.js', status: 'added' }
      ]);

      // Mock existing PR scenario
      mockGitHubClient.createOrGetDocsBranch.mockResolvedValue({
        branchName: 'docs/doxai-pr-123',
        created: false,
        existingPR: mockExistingPR
      });

      mockGitHubClient.getFileContent
      .mockResolvedValueOnce('const file1 = "content";')
      .mockResolvedValueOnce('const file2 = "content";');

      mockAIClient.sendPrompt.mockResolvedValue('Generated documentation');
      mockGitHubClient.commitFile.mockResolvedValue({});

      await main.main();

      // Verify that createPR was NOT called (existing PR scenario)
      expect(mockGitHubClient.createPR).not.toHaveBeenCalled();

      // Verify comment was created on original PR
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('Updated documentation')
      );
    });

    it('should handle smart file skipping', async () => {
      // Mock the hasSourceFileChanged function to return false for one file
      const originalMain = jest.requireActual('../../src/main');
      const hasSourceFileChangedSpy = jest.spyOn(originalMain, 'hasSourceFileChanged')
      .mockResolvedValueOnce(false) // First file - no changes
      .mockResolvedValueOnce(true);  // Second file - has changes

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

      mockGitHubClient.createOrGetDocsBranch.mockResolvedValue({
        branchName: 'docs/doxai-pr-123',
        created: false,
        existingPR: null
      });

      // Mock existing documentation for both files
      mockGitHubClient.getFileContent
      .mockResolvedValueOnce('existing doc content') // For doc file check
      .mockResolvedValueOnce('const file2 = "content";'); // For source file

      mockAIClient.sendPrompt.mockResolvedValue('Updated documentation for file2');
      mockGitHubClient.commitFile.mockResolvedValue({});
      mockGitHubClient.createPR.mockResolvedValue({
        number: 456,
        html_url: 'https://github.com/test-owner/test-repo/pull/456'
      });

      await main.main();

      // Verify that only one file was processed (the changed one)
      expect(mockAIClient.sendPrompt).toHaveBeenCalledTimes(1);
      expect(mockGitHubClient.commitFile).toHaveBeenCalledTimes(1);

      // Verify comment mentions skipped files
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('Skipped')
      );

      hasSourceFileChangedSpy.mockRestore();
    });

    it('should handle empty file list', async () => {
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

    it('should handle file processing errors gracefully', async () => {
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

      mockGitHubClient.createOrGetDocsBranch.mockResolvedValue({
        branchName: 'docs/doxai-pr-123',
        created: true,
        existingPR: null
      });

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

      // Verify that one file was processed successfully and one failed
      expect(mockAIClient.sendPrompt).toHaveBeenCalledTimes(1);
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('completed')
      );
    });

    it('should handle catastrophic errors', async () => {
      // Simulate severe error
      mockGitHubClient.getPRDetails.mockRejectedValue(new Error('Critical error'));

      await main.main();

      // Verify error handling
      const core = require('@actions/core');
      expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Documentation generation failed')
      );

      // Verify error message comment was created
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('error')
      );
    });

    it('should handle AI API failures', async () => {
      mockGitHubClient.getPRDetails.mockResolvedValue({
        number: 123,
        merged: true,
        base: 'main',
        head: 'feature-branch'
      });

      mockGitHubClient.getChangedFiles.mockResolvedValue([
        { filename: 'src/file1.js', status: 'modified' }
      ]);

      mockGitHubClient.createOrGetDocsBranch.mockResolvedValue({
        branchName: 'docs/doxai-pr-123',
        created: true,
        existingPR: null
      });

      mockGitHubClient.getFileContent.mockResolvedValue('const test = "content";');

      // Mock AI failure
      mockAIClient.sendPrompt.mockRejectedValue(new Error('AI API rate limit exceeded'));

      await main.main();

      // Verify that the failure was handled gracefully
      expect(mockGitHubClient.createPRComment).toHaveBeenCalledWith(
          123,
          expect.stringContaining('failed')
      );
    });

    it('should handle different language options', async () => {
      github.context.payload.comment.body = '!doxai --lang ko';

      mockGitHubClient.getPRDetails.mockResolvedValue({
        number: 123,
        merged: true,
        base: 'main',
        head: 'feature-branch'
      });

      mockGitHubClient.getChangedFiles.mockResolvedValue([
        { filename: 'src/file1.js', status: 'modified' }
      ]);

      mockGitHubClient.createOrGetDocsBranch.mockResolvedValue({
        branchName: 'docs/doxai-pr-123',
        created: true,
        existingPR: null
      });

      mockGitHubClient.getFileContent.mockResolvedValue('const test = "content";');
      mockAIClient.sendPrompt.mockResolvedValue('Korean documentation');
      mockGitHubClient.commitFile.mockResolvedValue({});
      mockGitHubClient.createPR.mockResolvedValue({
        number: 456,
        html_url: 'https://github.com/test-owner/test-repo/pull/456'
      });

      await main.main();

      // Verify that Korean template was used
      expect(mockAIClient.sendPrompt).toHaveBeenCalledWith(
          docsPromptTemplates.ko,
          expect.any(String)
      );
    });
  });

  describe('File type filtering - New Feature', () => {
    // Tests for shouldDocumentFile function if implemented
    it('should filter documentable file types', () => {
      const testFiles = [
        { filename: 'src/app.js', status: 'modified' },
        { filename: 'src/utils.py', status: 'modified' },
        { filename: 'logo.png', status: 'added' },
        { filename: 'package-lock.json', status: 'modified' },
        { filename: 'Dockerfile', status: 'modified' },
        { filename: 'node_modules/lib/file.js', status: 'modified' }
      ];

      // If shouldDocumentFile is implemented, this test would verify filtering
      // For now, this serves as a placeholder for when file filtering is added
      const expectedFilteredFiles = [
        { filename: 'src/app.js', status: 'modified' },
        { filename: 'src/utils.py', status: 'modified' },
        { filename: 'Dockerfile', status: 'modified' }
      ];

      // This would be the actual test when file filtering is implemented:
      // const result = filterFilesByScope(testFiles, 'all');
      // expect(result).toEqual(expectedFilteredFiles);
    });
  });
});
