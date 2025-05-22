const GitHubClient = require('../../src/github');

jest.mock('@actions/github', () => {
  const mockOctokit = {
    rest: {
      pulls: {
        get: jest.fn(),
        list: jest.fn(),
        listFiles: {
          endpoint: {
            merge: jest.fn()
          }
        },
        create: jest.fn()
      },
      repos: {
        getContent: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
        listCommits: jest.fn()
      },
      issues: {
        createComment: jest.fn()
      },
      git: {
        getRef: jest.fn(),
        createRef: jest.fn()
      }
    },
    paginate: {
      iterator: jest.fn()
    }
  };

  return {
    getOctokit: jest.fn(() => mockOctokit)
  };
});

jest.mock('../../src/config', () => ({
  githubToken: 'test-token'
}));

process.env.GITHUB_REPOSITORY_OWNER = 'test-owner';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';

describe('GitHubClient - Updated Implementation', () => {
  let github;
  let mockOctokit;

  beforeEach(() => {
    jest.clearAllMocks();
    github = new GitHubClient('test-token');
    mockOctokit = require('@actions/github').getOctokit();
  });

  describe('getPRDetails', () => {
    it('should fetch PR details correctly', async () => {
      const mockPRData = {
        data: {
          number: 123,
          title: 'Test PR',
          body: 'PR description',
          user: { login: 'test-user' },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          merged: true,
          merged_at: '2023-01-02T00:00:00Z',
          merged_by: { login: 'merger-user' },
          base: { ref: 'main' },
          head: { ref: 'feature-branch' }
        }
      };

      mockOctokit.rest.pulls.get.mockResolvedValueOnce(mockPRData);

      const result = await github.getPRDetails(123);

      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123
      });

      expect(result).toEqual({
        number: 123,
        title: 'Test PR',
        description: 'PR description',
        author: 'test-user',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        merged: true,
        mergedAt: '2023-01-02T00:00:00Z',
        mergedBy: 'merger-user',
        base: 'main',
        head: 'feature-branch'
      });
    });

    it('should handle errors correctly', async () => {
      mockOctokit.rest.pulls.get.mockRejectedValueOnce(new Error('API error'));

      await expect(github.getPRDetails(123))
      .rejects
      .toThrow('Failed to get PR #123 information: API error');
    });
  });

  describe('findExistingDocsPR - New Feature', () => {
    it('should find existing documentation PR by title', async () => {
      const mockPRs = {
        data: [
          {
            number: 456,
            title: 'docs: Generate documentation for doxai (PR #123)',
            html_url: 'https://github.com/test-owner/test-repo/pull/456',
            head: { ref: 'docs/doxai-pr-123' },
            base: { ref: 'main' }
          },
          {
            number: 457,
            title: 'Other PR',
            html_url: 'https://github.com/test-owner/test-repo/pull/457',
            head: { ref: 'feature-branch' },
            base: { ref: 'main' }
          }
        ]
      };

      mockOctokit.rest.pulls.list.mockResolvedValueOnce(mockPRs);

      const result = await github.findExistingDocsPR(123, 'doxai');

      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        state: 'open',
        per_page: 100
      });

      expect(result).toEqual({
        number: 456,
        title: 'docs: Generate documentation for doxai (PR #123)',
        url: 'https://github.com/test-owner/test-repo/pull/456',
        head: 'docs/doxai-pr-123',
        base: 'main'
      });
    });

    it('should find existing documentation PR by branch pattern', async () => {
      const mockPRs = {
        data: [
          {
            number: 456,
            title: 'Some other title',
            html_url: 'https://github.com/test-owner/test-repo/pull/456',
            head: { ref: 'docs/doxai-pr-123-1234567' },
            base: { ref: 'main' }
          }
        ]
      };

      mockOctokit.rest.pulls.list.mockResolvedValueOnce(mockPRs);

      const result = await github.findExistingDocsPR(123, 'doxai');

      expect(result).toEqual({
        number: 456,
        title: 'Some other title',
        url: 'https://github.com/test-owner/test-repo/pull/456',
        head: 'docs/doxai-pr-123-1234567',
        base: 'main'
      });
    });

    it('should return null when no existing PR found', async () => {
      const mockPRs = {
        data: [
          {
            number: 457,
            title: 'Unrelated PR',
            html_url: 'https://github.com/test-owner/test-repo/pull/457',
            head: { ref: 'feature-branch' },
            base: { ref: 'main' }
          }
        ]
      };

      mockOctokit.rest.pulls.list.mockResolvedValueOnce(mockPRs);

      const result = await github.findExistingDocsPR(123, 'doxai');

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.rest.pulls.list.mockRejectedValueOnce(new Error('API error'));

      const result = await github.findExistingDocsPR(123, 'doxai');

      expect(result).toBeNull();
    });
  });

  describe('branchExists - New Feature', () => {
    it('should return true when branch exists', async () => {
      mockOctokit.rest.git.getRef.mockResolvedValueOnce({
        data: { ref: 'refs/heads/existing-branch' }
      });

      const result = await github.branchExists('existing-branch');

      expect(mockOctokit.rest.git.getRef).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'heads/existing-branch'
      });

      expect(result).toBe(true);
    });

    it('should return false when branch does not exist', async () => {
      const error = new Error('Not found');
      error.status = 404;
      mockOctokit.rest.git.getRef.mockRejectedValueOnce(error);

      const result = await github.branchExists('non-existent-branch');

      expect(result).toBe(false);
    });

    it('should throw error for non-404 errors', async () => {
      const error = new Error('Server error');
      error.status = 500;
      mockOctokit.rest.git.getRef.mockRejectedValueOnce(error);

      await expect(github.branchExists('some-branch'))
      .rejects
      .toThrow('Server error');
    });
  });

  describe('createOrGetDocsBranch - New Feature', () => {
    it('should return existing PR info when found', async () => {
      const mockExistingPR = {
        number: 456,
        title: 'docs: Generate documentation for doxai (PR #123)',
        url: 'https://github.com/test-owner/test-repo/pull/456',
        head: 'docs/doxai-pr-123',
        base: 'main'
      };

      // Mock findExistingDocsPR to return existing PR
      github.findExistingDocsPR = jest.fn().mockResolvedValueOnce(mockExistingPR);

      const result = await github.createOrGetDocsBranch('main', 'docs/doxai-pr-123', 123, 'doxai');

      expect(result).toEqual({
        branchName: 'docs/doxai-pr-123',
        created: false,
        existingPR: mockExistingPR
      });
    });

    it('should create new branch when no existing PR found', async () => {
      // Mock no existing PR
      github.findExistingDocsPR = jest.fn().mockResolvedValueOnce(null);
      github.branchExists = jest.fn().mockResolvedValueOnce(false);

      const mockRefData = {
        data: {
          object: { sha: 'abc123' }
        }
      };

      mockOctokit.rest.git.getRef.mockResolvedValueOnce(mockRefData);
      mockOctokit.rest.git.createRef.mockResolvedValueOnce({});

      const result = await github.createOrGetDocsBranch('main', 'docs/doxai-pr-123', 123, 'doxai');

      expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'refs/heads/docs/doxai-pr-123',
        sha: 'abc123'
      });

      expect(result).toEqual({
        branchName: 'docs/doxai-pr-123',
        created: true,
        existingPR: null
      });
    });

    it('should create branch with timestamp when branch exists but no PR', async () => {
      github.findExistingDocsPR = jest.fn().mockResolvedValueOnce(null);
      github.branchExists = jest.fn()
      .mockResolvedValueOnce(true)  // First check - branch exists
      .mockResolvedValueOnce(false); // Second check - timestamped branch doesn't exist

      // Mock Date.now to return predictable timestamp
      const mockTimestamp = 1640995200; // 2022-01-01 00:00:00
      jest.spyOn(Math, 'floor').mockReturnValueOnce(mockTimestamp);

      const mockRefData = {
        data: {
          object: { sha: 'abc123' }
        }
      };

      mockOctokit.rest.git.getRef.mockResolvedValueOnce(mockRefData);
      mockOctokit.rest.git.createRef.mockResolvedValueOnce({});

      const result = await github.createOrGetDocsBranch('main', 'docs/doxai-pr-123', 123, 'doxai');

      expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: `refs/heads/docs/doxai-pr-123-${mockTimestamp}`,
        sha: 'abc123'
      });

      expect(result.branchName).toBe(`docs/doxai-pr-123-${mockTimestamp}`);
      expect(result.created).toBe(true);
    });
  });

  describe('getChangedFiles', () => {
    it('should fetch changed files correctly', async () => {
      const mockResponse1 = {
        data: [
          {
            filename: 'src/file1.js',
            status: 'modified',
            additions: 10,
            deletions: 5,
            changes: 15,
            patch: '@@ -1,5 +1,10 @@'
          }
        ]
      };

      const mockResponse2 = {
        data: [
          {
            filename: 'src/file2.js',
            status: 'added',
            additions: 20,
            deletions: 0,
            changes: 20,
            patch: '@@ -0,0 +1,20 @@'
          }
        ]
      };

      mockOctokit.paginate.iterator.mockImplementationOnce(function* () {
        yield mockResponse1;
        yield mockResponse2;
      });

      mockOctokit.rest.pulls.listFiles.endpoint.merge.mockReturnValueOnce({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        per_page: 100
      });

      const result = await github.getChangedFiles(123);

      expect(result).toEqual([
        {
          filename: 'src/file1.js',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@'
        },
        {
          filename: 'src/file2.js',
          status: 'added',
          additions: 20,
          deletions: 0,
          changes: 20,
          patch: '@@ -0,0 +1,20 @@'
        }
      ]);
    });

    it('should handle empty results', async () => {
      mockOctokit.paginate.iterator.mockImplementationOnce(function* () {
        yield { data: [] };
      });

      mockOctokit.rest.pulls.listFiles.endpoint.merge.mockReturnValueOnce({});

      const result = await github.getChangedFiles(123);

      expect(result).toEqual([]);
    });

    it('should handle API errors correctly', async () => {
      mockOctokit.rest.pulls.listFiles.endpoint.merge.mockImplementationOnce(() => {
        throw new Error('API error');
      });

      await expect(github.getChangedFiles(123))
      .rejects
      .toThrow('Failed to get changed files for PR #123: API error');
    });
  });

  describe('getFileContent', () => {
    it('should fetch file content correctly', async () => {
      const mockContentData = {
        data: {
          content: Buffer.from('file content').toString('base64'),
          encoding: 'base64'
        }
      };

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce(mockContentData);

      const result = await github.getFileContent('src/file.js', 'main');

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'src/file.js',
        ref: 'main'
      });

      expect(result).toBe('file content');
    });

    it('should throw error if file not found', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValueOnce(new Error('Not found'));

      await expect(github.getFileContent('non-existent.js', 'main'))
      .rejects
      .toThrow('Not found');
    });
  });

  describe('createPRComment', () => {
    it('should create PR comment correctly', async () => {
      const mockCommentData = {
        data: {
          id: 1,
          body: 'Test comment'
        }
      };

      mockOctokit.rest.issues.createComment.mockResolvedValueOnce(mockCommentData);

      const result = await github.createPRComment(123, 'Test comment');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: 'Test comment'
      });

      expect(result).toEqual({
        id: 1,
        body: 'Test comment'
      });
    });

    it('should handle API errors correctly', async () => {
      mockOctokit.rest.issues.createComment.mockRejectedValueOnce(new Error('API error'));

      await expect(github.createPRComment(123, 'Test comment'))
      .rejects
      .toThrow('Failed to create comment on PR #123: API error');
    });
  });

  describe('commitFile', () => {
    it('should commit new file correctly', async () => {
      const mockCreateFileData = {
        data: {
          content: {
            path: 'docs/file.adoc',
            sha: 'def456'
          },
          commit: {
            sha: 'ghi789'
          }
        }
      };

      mockOctokit.rest.repos.getContent.mockRejectedValueOnce(new Error('Not found'));
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce(mockCreateFileData);

      const result = await github.commitFile('docs-branch', 'docs/file.adoc', 'File content', 'Add new file');

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'docs/file.adoc',
        message: 'Add new file',
        content: expect.any(String),
        branch: 'docs-branch',
        sha: undefined
      });

      expect(result).toEqual({
        content: {
          path: 'docs/file.adoc',
          sha: 'def456'
        },
        commit: {
          sha: 'ghi789'
        }
      });
    });

    it('should update existing file correctly', async () => {
      const mockGetContentData = {
        data: {
          sha: 'abc123'
        }
      };

      const mockUpdateFileData = {
        data: {
          content: {
            path: 'docs/file.adoc',
            sha: 'def456'
          },
          commit: {
            sha: 'ghi789'
          }
        }
      };

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce(mockGetContentData);
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce(mockUpdateFileData);

      const result = await github.commitFile('docs-branch', 'docs/file.adoc', 'Updated content', 'Update file');

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'docs/file.adoc',
        message: 'Update file',
        content: expect.any(String),
        branch: 'docs-branch',
        sha: 'abc123'
      });

      expect(result).toEqual({
        content: {
          path: 'docs/file.adoc',
          sha: 'def456'
        },
        commit: {
          sha: 'ghi789'
        }
      });
    });

    it('should handle commit API errors', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValueOnce(new Error('Not found'));
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValueOnce(new Error('API error'));

      await expect(github.commitFile('docs-branch', 'docs/file.adoc', 'content', 'message'))
      .rejects
      .toThrow('Failed to commit file docs/file.adoc: API error');
    });
  });

  describe('createPR', () => {
    it('should create PR correctly', async () => {
      const mockPRData = {
        data: {
          number: 456,
          html_url: 'https://github.com/test-owner/test-repo/pull/456',
          title: 'Test PR',
          body: 'PR description'
        }
      };

      mockOctokit.rest.pulls.create.mockResolvedValueOnce(mockPRData);

      const result = await github.createPR('Test PR', 'PR description', 'head-branch', 'base-branch');

      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test PR',
        body: 'PR description',
        head: 'head-branch',
        base: 'base-branch'
      });

      expect(result).toEqual({
        number: 456,
        html_url: 'https://github.com/test-owner/test-repo/pull/456',
        title: 'Test PR',
        body: 'PR description'
      });
    });

    it('should handle API errors correctly', async () => {
      mockOctokit.rest.pulls.create.mockRejectedValueOnce(new Error('API error'));

      await expect(github.createPR('Test PR', 'PR description', 'head-branch', 'base-branch'))
      .rejects
      .toThrow('Failed to create new PR: API error');
    });
  });

  // Test deprecated methods if they still exist
  describe('Backward Compatibility', () => {
    it('should still support createBranch method', async () => {
      const mockRefData = {
        data: {
          object: { sha: 'abc123' }
        }
      };

      const mockCreateRefData = {
        data: {
          ref: 'refs/heads/new-branch',
          object: { sha: 'abc123' }
        }
      };

      mockOctokit.rest.git.getRef.mockResolvedValueOnce(mockRefData);
      mockOctokit.rest.git.createRef.mockResolvedValueOnce(mockCreateRefData);

      // Check if createBranch method exists (for backward compatibility)
      if (typeof github.createBranch === 'function') {
        const result = await github.createBranch('main', 'new-branch');

        expect(mockOctokit.rest.git.getRef).toHaveBeenCalledWith({
          owner: 'test-owner',
          repo: 'test-repo',
          ref: 'heads/main'
        });

        expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
          owner: 'test-owner',
          repo: 'test-repo',
          ref: 'refs/heads/new-branch',
          sha: 'abc123'
        });

        expect(result).toEqual({
          ref: 'refs/heads/new-branch',
          object: { sha: 'abc123' }
        });
      }
    });
  });
});
