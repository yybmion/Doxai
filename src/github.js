const { getOctokit } = require('@actions/github');
const config = require('./config');
const Logger = require('./logger');

/**
 * GitHub API client with enhanced error handling and logging
 */
class GitHubClient {
  constructor(token = config.githubToken) {
    this.logger = new Logger('GitHubClient');
    this.octokit = getOctokit(token);
    this.context = {
      owner: process.env.GITHUB_REPOSITORY_OWNER,
      repo: process.env.GITHUB_REPOSITORY?.split('/')[1],
    };

    if (!this.context.owner || !this.context.repo) {
      throw new Error(
          'GitHub repository context not available. Ensure GITHUB_REPOSITORY is set.');
    }

    this.logger.info(
        `Initialized for ${this.context.owner}/${this.context.repo}`);
  }

  /**
   * Find existing documentation PR for a specific source PR
   * @param {number} sourcePrNumber - Source PR number
   * @param {string} project - Project name
   * @returns {Promise<object|null>} - Existing PR info or null
   */
  async findExistingDocsPR(sourcePrNumber, project) {
    try {
      const titlePattern = `docs: Generate documentation for ${project} (PR #${sourcePrNumber})`;
      const branchPattern = `docs/${project}-pr-${sourcePrNumber}`;

      this.logger.debug(
          `Looking for PR with title: ${titlePattern} or branch: ${branchPattern}`);

      const {data: prs} = await this.octokit.rest.pulls.list({
        ...this.context,
        state: 'open',
        per_page: 100
      });

      const existingPR = prs.find(pr =>
          pr.title === titlePattern ||
          pr.head.ref.startsWith(branchPattern)
      );

      if (existingPR) {
        this.logger.info(
            `Found existing documentation PR: #${existingPR.number}`);
        return {
          number: existingPR.number,
          title: existingPR.title,
          url: existingPR.html_url,
          head: existingPR.head.ref,
          base: existingPR.base.ref
        };
      }

      this.logger.debug('No existing documentation PR found');
      return null;

    } catch (error) {
      this.logger.error('Error finding existing docs PR', error);
      throw new Error(`Failed to search for existing PRs: ${error.message}`);
    }
  }

  /**
   * Create a new branch or get existing branch
   * @param {string} baseBranch - Base branch
   * @param {string} newBranch - New branch name
   * @param {number} sourcePrNumber - Source PR number
   * @param {string} project - Project name
   * @returns {Promise<{branchName: string, created: boolean, existingPR: object|null}>}
   */
  async createOrGetDocsBranch(baseBranch, newBranch, sourcePrNumber, project) {
    try {
      // Check for existing PR first
      const existingPR = await this.findExistingDocsPR(sourcePrNumber, project);
      if (existingPR) {
        return {
          branchName: existingPR.head,
          created: false,
          existingPR
        };
      }

      // Check if the branch exists
      const branchExists = await this.branchExists(newBranch);

      if (branchExists) {
        // Branch exists but no PR - use the same branch
        this.logger.info(`Using existing branch: ${newBranch}`);
        return {
          branchName: newBranch,
          created: false,
          existingPR: null
        };
      }

      // Create new branch only if it doesn't exist
      await this.createBranch(newBranch, baseBranch);
      return {
        branchName: newBranch,
        created: true,
        existingPR: null
      };

    } catch (error) {
      this.logger.error('Failed to create or get docs branch', error);
      throw new Error(`Branch operation failed: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   * @param {string} branchName - New branch name
   * @param {string} baseBranch - Base branch to branch from
   * @returns {Promise<void>}
   */
  async createBranch(branchName, baseBranch) {
    try {
      const {data: refData} = await this.octokit.rest.git.getRef({
        ...this.context,
        ref: `heads/${baseBranch}`,
      });

      await this.octokit.rest.git.createRef({
        ...this.context,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha
      });

      this.logger.info(`Created branch: ${branchName} from ${baseBranch}`);

    } catch (error) {
      if (error.status === 422) {
        throw new Error(`Branch ${branchName} already exists`);
      }
      throw error;
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
   * Get PR details with enhanced error handling
   * @param {number} prNumber - PR number
   * @returns {Promise<object>} - PR information
   */
  async getPRDetails(prNumber) {
    try {
      const {data: prData} = await this.octokit.rest.pulls.get({
        ...this.context,
        pull_number: prNumber
      });

      const details = {
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
        head: prData.head.ref,
        state: prData.state
      };

      this.logger.debug(`Retrieved PR #${prNumber} details`, {
        state: details.state,
        merged: details.merged,
        author: details.author
      });

      return details;

    } catch (error) {
      if (error.status === 404) {
        throw new Error(`PR #${prNumber} not found`);
      }
      this.logger.error(`Failed to get PR #${prNumber} details`, error);
      throw new Error(`Failed to get PR details: ${error.message}`);
    }
  }

  /**
   * Get list of changed files in a PR with pagination
   * @param {number} prNumber - PR number
   * @returns {Promise<Array>} - List of changed files
   */
  async getChangedFiles(prNumber) {
    try {
      const files = [];
      const iterator = this.octokit.paginate.iterator(
          this.octokit.rest.pulls.listFiles,
          {
            ...this.context,
            pull_number: prNumber,
            per_page: 100
          }
      );

      for await (const response of iterator) {
        files.push(...response.data);
      }

      const processedFiles = files.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch
      }));

      this.logger.info(
          `Retrieved ${processedFiles.length} changed files from PR #${prNumber}`);
      return processedFiles;

    } catch (error) {
      this.logger.error(`Failed to get changed files for PR #${prNumber}`,
          error);
      throw new Error(`Failed to get changed files: ${error.message}`);
    }
  }

  /**
   * Get file content with enhanced error handling
   * @param {string} path - File path
   * @param {string} ref - Branch or commit reference
   * @returns {Promise<string>} - File content
   */
  async getFileContent(path, ref) {
    try {
      const {data} = await this.octokit.rest.repos.getContent({
        ...this.context,
        path,
        ref
      });

      if (Array.isArray(data)) {
        throw new Error(`Path ${path} is a directory, not a file`);
      }

      if (data.type !== 'file') {
        throw new Error(`Path ${path} is not a file (type: ${data.type})`);
      }

      const content = Buffer.from(data.content, 'base64').toString();
      this.logger.debug(
          `Retrieved content for ${path} (${content.length} bytes)`);

      return content;

    } catch (error) {
      if (error.status === 404) {
        this.logger.debug(`File not found: ${path} on ${ref}`);
        throw new Error(`File not found: ${path}`);
      }
      this.logger.error(`Failed to get file content: ${path}`, error);
      throw error;
    }
  }

  /**
   * Create or update file with automatic SHA handling
   * @param {string} branch - Branch name
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @returns {Promise<object>} - Commit result
   */
  async commitFile(branch, path, content, message) {
    try {
      // Get current file SHA if exists
      let sha;
      try {
        const {data} = await this.octokit.rest.repos.getContent({
          ...this.context,
          path,
          ref: branch
        });
        sha = data.sha;
        this.logger.debug(`Updating existing file: ${path}`);
      } catch (error) {
        if (error.status === 404) {
          this.logger.debug(`Creating new file: ${path}`);
        } else {
          throw error;
        }
      }

      const {data} = await this.octokit.rest.repos.createOrUpdateFileContents({
        ...this.context,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha
      });

      this.logger.info(`Committed file: ${path} to ${branch}`);
      return data;

    } catch (error) {
      this.logger.error(`Failed to commit file: ${path}`, error);
      throw new Error(`Failed to commit file ${path}: ${error.message}`);
    }
  }

  /**
   * Delete a file from the repository
   * @param {string} branch - Branch name
   * @param {string} path - File path to delete
   * @param {string} message - Commit message
   * @returns {Promise<object>} - Deletion result
   */
  async deleteFile(branch, path, message) {
    try {
      // Get file SHA first
      const { data } = await this.octokit.rest.repos.getContent({
        ...this.context,
        path,
        ref: branch
      });

      if (Array.isArray(data)) {
        throw new Error(`Cannot delete directory: ${path}`);
      }

      // Delete the file
      const result = await this.octokit.rest.repos.deleteFile({
        ...this.context,
        path,
        message,
        sha: data.sha,
        branch
      });

      this.logger.info(`Deleted file: ${path} from ${branch}`);
      return result;

    } catch (error) {
      if (error.status === 404) {
        this.logger.warn(`File not found for deletion: ${path}`);
        return null;
      }
      this.logger.error(`Failed to delete file: ${path}`, error);
      throw new Error(`Failed to delete file ${path}: ${error.message}`);
    }
  }

  /**
   * Create a pull request with validation
   * @param {string} title - PR title
   * @param {string} body - PR body
   * @param {string} head - Head branch
   * @param {string} base - Base branch
   * @returns {Promise<object>} - Created PR data
   */
  async createPR(title, body, head, base) {
    try {
      // Validate branches exist
      if (!await this.branchExists(head)) {
        throw new Error(`Head branch ${head} does not exist`);
      }

      if (!await this.branchExists(base)) {
        throw new Error(`Base branch ${base} does not exist`);
      }

      const {data} = await this.octokit.rest.pulls.create({
        ...this.context,
        title,
        body,
        head,
        base
      });

      this.logger.info(`Created PR #${data.number}: ${title}`);
      return {
        number: data.number,
        title: data.title,
        html_url: data.html_url,
        head: data.head.ref,
        base: data.base.ref
      };

    } catch (error) {
      if (error.status === 422 && error.message.includes('already exists')) {
        this.logger.warn('PR already exists between these branches');
        throw new Error('A pull request already exists between these branches');
      }
      this.logger.error('Failed to create PR', error);
      throw new Error(`Failed to create PR: ${error.message}`);
    }
  }

  /**
   * Create a comment on a PR or issue
   * @param {number} issueNumber - Issue/PR number
   * @param {string} body - Comment content
   * @returns {Promise<object>} - Created comment data
   */
  async createComment(issueNumber, body) {
    try {
      const {data} = await this.octokit.rest.issues.createComment({
        ...this.context,
        issue_number: issueNumber,
        body
      });

      this.logger.info(`Created comment on #${issueNumber}`);
      return data;

    } catch (error) {
      this.logger.error(`Failed to create comment on #${issueNumber}`, error);
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  /**
   * Check if source file has changed since last documentation
   * @param {string} sourceFile - Source file path
   * @param {string} docFile - Documentation file path
   * @param {string} docsBranch - Documentation branch
   * @param {string} sourceBranch - Source branch
   * @returns {Promise<boolean>} - Whether source has changed
   */
  async hasSourceFileChanged(sourceFile, docFile, docsBranch, sourceBranch) {
    try {
      // Get last commit date for doc file
      const {data: docCommits} = await this.octokit.rest.repos.listCommits({
        ...this.context,
        path: docFile,
        sha: docsBranch,
        per_page: 1
      });

      if (docCommits.length === 0) {
        this.logger.debug(
            'No commits found for doc file, assuming source changed');
        return true;
      }

      const lastDocCommitDate = new Date(docCommits[0].commit.committer.date);

      // Get last commit date for source file
      const {data: sourceCommits} = await this.octokit.rest.repos.listCommits({
        ...this.context,
        path: sourceFile,
        sha: sourceBranch,
        per_page: 1
      });

      if (sourceCommits.length === 0) {
        this.logger.debug('No commits found for source file');
        return false;
      }

      const lastSourceCommitDate = new Date(
          sourceCommits[0].commit.committer.date);
      const hasChanged = lastSourceCommitDate > lastDocCommitDate;

      this.logger.debug(`Source file ${hasChanged ? 'has'
          : 'has not'} changed since last doc`, {
        sourceFile,
        lastSourceCommit: lastSourceCommitDate.toISOString(),
        lastDocCommit: lastDocCommitDate.toISOString()
      });

      return hasChanged;

    } catch (error) {
      this.logger.warn(
          `Could not determine change status for ${sourceFile}, assuming changed`,
          error);
      return true;
    }
  }

  /**
   * Commit multiple files in a single commit
   * @param {string} branch - Branch name
   * @param {Array} files - Array of {path, content} objects
   * @param {string} message - Commit message
   * @returns {Promise<object>} - Commit result
   */
  async commitMultipleFiles(branch, files, message) {
    try {
      // Get the latest commit SHA for the branch
      const {data: ref} = await this.octokit.rest.git.getRef({
        ...this.context,
        ref: `heads/${branch}`
      });

      const latestCommitSha = ref.object.sha;

      // Get the tree SHA of the latest commit
      const {data: commit} = await this.octokit.rest.git.getCommit({
        ...this.context,
        commit_sha: latestCommitSha
      });

      const baseTreeSha = commit.tree.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
          files.map(async (file) => {
            const {data: blob} = await this.octokit.rest.git.createBlob({
              ...this.context,
              content: Buffer.from(file.content).toString('base64'),
              encoding: 'base64'
            });

            return {
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: blob.sha
            };
          })
      );

      // Create a new tree with all the files
      const {data: newTree} = await this.octokit.rest.git.createTree({
        ...this.context,
        base_tree: baseTreeSha,
        tree: blobs
      });

      // Create a new commit
      const {data: newCommit} = await this.octokit.rest.git.createCommit({
        ...this.context,
        message,
        tree: newTree.sha,
        parents: [latestCommitSha]
      });

      // Update the branch reference
      await this.octokit.rest.git.updateRef({
        ...this.context,
        ref: `heads/${branch}`,
        sha: newCommit.sha
      });

      this.logger.info(`Created commit ${newCommit.sha.substring(0,
          7)} with ${files.length} files`);

      return newCommit;

    } catch (error) {
      this.logger.error('Failed to commit multiple files', error);
      throw new Error(`Failed to commit files: ${error.message}`);
    }
  }

  /**
   * Commit multiple changes (add/update/delete) in a single commit
   * @param {string} branch - Branch name
   * @param {Array} filesToCommit - Array of {path, content} objects to add/update
   * @param {Array} filesToDelete - Array of file paths to delete
   * @param {string} message - Commit message
   * @returns {Promise<object>} - Commit result
   */
  async commitMultipleChanges(branch, filesToCommit, filesToDelete, message) {
    try {
      // Get the latest commit SHA for the branch
      const { data: ref } = await this.octokit.rest.git.getRef({
        ...this.context,
        ref: `heads/${branch}`
      });

      const latestCommitSha = ref.object.sha;

      // Get the tree SHA of the latest commit
      const { data: commit } = await this.octokit.rest.git.getCommit({
        ...this.context,
        commit_sha: latestCommitSha
      });

      const baseTreeSha = commit.tree.sha;

      // Create blobs for files to add/update
      const blobs = await Promise.all(
          filesToCommit.map(async (file) => {
            const { data: blob } = await this.octokit.rest.git.createBlob({
              ...this.context,
              content: Buffer.from(file.content).toString('base64'),
              encoding: 'base64'
            });

            return {
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: blob.sha
            };
          })
      );

      // Add deletion entries (sha: null means delete)
      const deletions = filesToDelete.map(path => ({
        path,
        mode: '100644',
        type: 'blob',
        sha: null  // null SHA means delete the file
      }));

      // Combine all tree entries
      const treeItems = [...blobs, ...deletions];

      // Create a new tree with all the changes
      const { data: newTree } = await this.octokit.rest.git.createTree({
        ...this.context,
        base_tree: baseTreeSha,
        tree: treeItems
      });

      // Create a new commit
      const { data: newCommit } = await this.octokit.rest.git.createCommit({
        ...this.context,
        message,
        tree: newTree.sha,
        parents: [latestCommitSha]
      });

      // Update the branch reference
      await this.octokit.rest.git.updateRef({
        ...this.context,
        ref: `heads/${branch}`,
        sha: newCommit.sha
      });

      this.logger.info(
          `Created commit ${newCommit.sha.substring(0, 7)} with ${filesToCommit.length} files added/updated and ${filesToDelete.length} files deleted`
      );

      return newCommit;

    } catch (error) {
      this.logger.error('Failed to commit multiple changes', error);
      throw new Error(`Failed to commit changes: ${error.message}`);
    }
  }
}

module.exports = GitHubClient;
