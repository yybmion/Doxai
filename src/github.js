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
   * Find existing documentation PR for a specific source PR
   * @param {number} sourcePrNumber - Source PR number
   * @param {string} project - Project name (e.g., 'doxai')
   * @returns {Promise<object|null>} - Existing PR info or null
   */
  async findExistingDocsPR(sourcePrNumber, project) {
    try {
      // Search for PRs with specific title pattern
      const titlePattern = `docs: Generate documentation for ${project} (PR #${sourcePrNumber})`;

      // Get all open PRs
      const { data: prs } = await this.octokit.rest.pulls.list({
        ...this.context,
        state: 'open',
        per_page: 100
      });

      // Find PR with matching title or head branch pattern
      const branchPattern = `docs/${project}-pr-${sourcePrNumber}`;

      const existingPR = prs.find(pr =>
          pr.title === titlePattern ||
          pr.head.ref.startsWith(branchPattern)
      );

      if (existingPR) {
        console.log(`Found existing documentation PR: #${existingPR.number} (${existingPR.head.ref})`);
        return {
          number: existingPR.number,
          title: existingPR.title,
          url: existingPR.html_url,
          head: existingPR.head.ref,
          base: existingPR.base.ref
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding existing docs PR:', error);
      return null;
    }
  }



  /**
   * Create a new branch or get existing branch (improved version)
   * @param {string} baseBranch - Base branch
   * @param {string} newBranch - New branch name
   * @param {number} sourcePrNumber - Source PR number for documentation
   * @param {string} project - Project name
   * @returns {Promise<{branchName: string, created: boolean, existingPR: object|null}>}
   */
  async createOrGetDocsBranch(baseBranch, newBranch, sourcePrNumber, project) {
    try {
      // First, check if there's an existing documentation PR for this source PR
      const existingPR = await this.findExistingDocsPR(sourcePrNumber, project);

      if (existingPR) {
        console.log(`Using existing documentation branch: ${existingPR.head}`);
        return {
          branchName: existingPR.head,
          created: false,
          existingPR: existingPR
        };
      }

      // Check if the exact branch name exists
      let finalBranchName = newBranch;
      let branchExists = await this.branchExists(finalBranchName);

      // If branch exists but no PR found, create a unique name
      if (branchExists) {
        const timestamp = Math.floor(Date.now() / 1000);
        finalBranchName = `${newBranch}-${timestamp}`;
        console.log(`Branch ${newBranch} exists but no PR found. Using ${finalBranchName} instead.`);
        branchExists = await this.branchExists(finalBranchName);
      }

      // If the new branch name also exists, use it anyway (shouldn't happen often)
      if (branchExists) {
        console.log(`Branch ${finalBranchName} already exists. Using existing branch.`);
        return { branchName: finalBranchName, created: false, existingPR: null };
      }

      // Get the latest commit of the base branch
      const { data: refData } = await this.octokit.rest.git.getRef({
        ...this.context,
        ref: `heads/${baseBranch}`,
      });

      const sha = refData.object.sha;

      // Create new branch
      await this.octokit.rest.git.createRef({
        ...this.context,
        ref: `refs/heads/${finalBranchName}`,
        sha
      });

      console.log(`Branch ${finalBranchName} created successfully.`);
      return { branchName: finalBranchName, created: true, existingPR: null };
    } catch (error) {
      console.error('Failed to create or get docs branch:', error);
      throw new Error(`Failed to create or get docs branch ${newBranch}: ${error.message}`);
    }
  }

  /**
   * Check if a branch exists
   * @param {string} branchName - Branch name to check
   * @returns {Promise<boolean>} - Whether the branch exists
   */
  async branchExists(branchName) {
    try {
      await this.octokit.rest.git.getRef({
        ...this.context,
        ref: `heads/${branchName}`,
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
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
