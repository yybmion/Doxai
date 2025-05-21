const GitHubClient = require('../../src/github');

jest.mock('@actions/github', () => {
  const mockOctokit = {
    rest: {
      pulls: {
        get: jest.fn(),
        listFiles: {
          endpoint: {
            merge: jest.fn()
          }
        },
        create: jest.fn()
      },
      repos: {
        getContent: jest.fn(),
        createOrUpdateFileContents: jest.fn()
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

process.env.GITHUB_REPOSITORY_OWNER = 'test-owner';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';

describe('GitHubClient', () => {
  let github;
  let mockOctokit;

  beforeEach(() => {
    jest.clearAllMocks();
    github = new GitHubClient('test-token');
    mockOctokit = require('@actions/github').getOctokit();
  });

  describe('getPRDetails', () => {
    it('should fetch PR details correctly', async () => {
      // Mock data
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
      // Setup mock to throw error
      mockOctokit.rest.pulls.get.mockRejectedValueOnce(new Error('API error'));

      await expect(github.getPRDetails(123))
      .rejects
      .toThrow('Failed to get PR #123 information: API error');
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

      expect(mockOctokit.rest.pulls.listFiles.endpoint.merge).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        per_page: 100
      });

      expect(mockOctokit.paginate.iterator).toHaveBeenCalled();

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
      // Mock data
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

    it('should return null if file not found', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValueOnce(new Error('Not found'));

      const result = await github.getFileContent('non-existent.js', 'main');

      expect(result).toBeNull();
    });

    it('should handle non-base64 content (for testing purposes)', async () => {
      const testContent = 'plain text content';
      const mockContentData = {
        data: {
          content: Buffer.from(testContent).toString('base64'),
          encoding: 'base64'
        }
      };

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce(mockContentData);
      const result = await github.getFileContent('src/file.js', 'main');

      expect(result).toBe(testContent);
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

  describe('createBranch', () => {
    it('should create branch correctly', async () => {
      const mockRefData = {
        data: {
          object: {
            sha: 'abc123'
          }
        }
      };

      const mockCreateRefData = {
        data: {
          ref: 'refs/heads/new-branch',
          object: {
            sha: 'abc123'
          }
        }
      };

      mockOctokit.rest.git.getRef.mockResolvedValueOnce(mockRefData);
      mockOctokit.rest.git.createRef.mockResolvedValueOnce(mockCreateRefData);

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
        object: {
          sha: 'abc123'
        }
      });
    });

    it('should handle get reference API errors', async () => {
      mockOctokit.rest.git.getRef.mockRejectedValueOnce(new Error('API error'));

      await expect(github.createBranch('main', 'new-branch'))
      .rejects
      .toThrow('Failed to create branch new-branch: API error');
    });

    it('should handle create reference API errors', async () => {
      const mockRefData = {
        data: {
          object: {
            sha: 'abc123'
          }
        }
      };

      mockOctokit.rest.git.getRef.mockResolvedValueOnce(mockRefData);
      mockOctokit.rest.git.createRef.mockRejectedValueOnce(new Error('API error'));

      await expect(github.createBranch('main', 'new-branch'))
      .rejects
      .toThrow('Failed to create branch new-branch: API error');
    });
  });

  describe('commitFile', () => {
    it('should commit new file correctly', async () => {
      // Mock data
      const mockCreateFileData = {
        data: {
          content: {
            path: 'docs/file.md',
            sha: 'def456'
          },
          commit: {
            sha: 'ghi789'
          }
        }
      };

      mockOctokit.rest.repos.getContent.mockRejectedValueOnce(new Error('Not found'));
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce(mockCreateFileData);

      const result = await github.commitFile('docs-branch', 'docs/file.md', 'File content', 'Add new file');

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'docs/file.md',
        ref: 'docs-branch'
      });

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'docs/file.md',
        message: 'Add new file',
        content: expect.any(String),
        branch: 'docs-branch',
        sha: undefined
      });

      expect(result).toEqual({
        content: {
          path: 'docs/file.md',
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
            path: 'docs/file.md',
            sha: 'def456'
          },
          commit: {
            sha: 'ghi789'
          }
        }
      };

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce(mockGetContentData);
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce(mockUpdateFileData);

      const result = await github.commitFile('docs-branch', 'docs/file.md', 'Updated content', 'Update file');

      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'docs/file.md',
        message: 'Update file',
        content: expect.any(String),
        branch: 'docs-branch',
        sha: 'abc123'
      });

      expect(result).toEqual({
        content: {
          path: 'docs/file.md',
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

      await expect(github.commitFile('docs-branch', 'docs/file.md', 'content', 'message'))
      .rejects
      .toThrow('Failed to commit file docs/file.md: API error');
    });
  });

  describe('createPR', () => {
    it('should create PR correctly', async () => {
      // Mock data
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
});
