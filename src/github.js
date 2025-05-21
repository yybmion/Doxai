const { getOctokit } = require('@actions/github');
const core = require('@actions/core');
const config = require('./config');

/**
 * GitHub API related utilities
 */
class GitHubClient {
  constructor(token = config.githubToken) {
    this.octokit = getOctokit(token);
    this.context = {
      owner: process.env.GITHUB_REPOSITORY_OWNER,
      repo: process.env.GITHUB_REPOSITORY.split('/')[1],
    };
  }

  /**
   * Get PR details
   * @param {number} prNumber - PR number
   * @returns {Promise<object>} - PR information
   */
  async getPRDetails(prNumber) {
    try {
      const { data: prData } = await this.octokit.rest.pulls.get({
        ...this.context,
        pull_number: prNumber
      });

      return {
        number: prNumber,
        title: prData.title,
        description: prData.body || '',
        author: prData.user.login,
        createdAt: prData.created_at,
        updatedAt: prData.updated_at,
        merged: prData.merged,
        mergedAt: prData.merged_at,
        mergedBy: prData.merged_by?.login,
        base: prData.base.ref,
        head: prData.head.ref
      };
    } catch (error) {
      console.error('Failed to get PR information:', error);
      throw new Error(`Failed to get PR #${prNumber} information: ${error.message}`);
    }
  }

  /**
   * Get list of changed files in a PR
   * @param {number} prNumber - PR number
   * @returns {Promise<Array>} - List of changed files
   */
  async getChangedFiles(prNumber) {
    try {
      const files = [];
      const options = this.octokit.rest.pulls.listFiles.endpoint.merge({
        ...this.context,
        pull_number: prNumber,
        per_page: 100
      });

      for await (const response of this.octokit.paginate.iterator(options)) {
        files.push(...response.data);
      }

      return files.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch
      }));
    } catch (error) {
      console.error('Failed to get changed files:', error);
      throw new Error(`Failed to get changed files for PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Get file content
   * @param {string} path - File path
   * @param {string} ref - Branch or commit reference
   * @returns {Promise<string>} - File content
   */
  async getFileContent(path, ref) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        ...this.context,
        path,
        ref
      });

      return Buffer.from(data.content, 'base64').toString();
    } catch (error) {
      console.error('Failed to get file content:', error);
      throw error;
    }
  }

  /**
   * Create a comment on a PR
   * @param {number} prNumber - PR number
   * @param {string} body - Comment content
   * @returns {Promise<object>} - Comment result
   */
  async createPRComment(prNumber, body) {
    try {
      const { data } = await this.octokit.rest.issues.createComment({
        ...this.context,
        issue_number: prNumber,
        body
      });
      return data;
    } catch (error) {
      console.error('Failed to create PR comment:', error);
      throw new Error(`Failed to create comment on PR #${prNumber}: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   * @param {string} baseBranch - Base branch
   * @param {string} newBranch - New branch name
   * @returns {Promise<object>} - Result
   */
  async createBranch(baseBranch, newBranch) {
    try {
      // Get the latest commit of the base branch
      const { data: refData } = await this.octokit.rest.git.getRef({
        ...this.context,
        ref: `heads/${baseBranch}`,
      });

      const sha = refData.object.sha;

      // Create new branch
      const { data } = await this.octokit.rest.git.createRef({
        ...this.context,
        ref: `refs/heads/${newBranch}`,
        sha
      });

      return data;
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw new Error(`Failed to create branch ${newBranch}: ${error.message}`);
    }
  }

  /**
   * Commit a file
   * @param {string} branch - Branch name
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @returns {Promise<object>} - Result
   */
  async commitFile(branch, path, content, message) {
    try {
      // Check if file already exists
      let sha;
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          ...this.context,
          path,
          ref: branch
        });
        sha = data.sha;
      } catch (error) {
        // Ignore if file doesn't exist
      }

      // Commit file
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        ...this.context,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha
      });

      return data;
    } catch (error) {
      console.error('Failed to commit file:', error);
      throw new Error(`Failed to commit file ${path}: ${error.message}`);
    }
  }

  /**
   * Create a pull request
   * @param {string} title - PR title
   * @param {string} body - PR body
   * @param {string} head - Head branch
   * @param {string} base - Base branch
   * @returns {Promise<object>} - PR result
   */
  async createPR(title, body, head, base) {
    try {
      const { data } = await this.octokit.rest.pulls.create({
        ...this.context,
        title,
        body,
        head,
        base
      });
      return data;
    } catch (error) {
      console.error('Failed to create PR:', error);
      throw new Error(`Failed to create new PR: ${error.message}`);
    }
  }
}

module.exports = GitHubClient;
