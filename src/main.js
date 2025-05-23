const path = require('path');
const core = require('@actions/core');
const github = require('@actions/github');

// Import utilities
const GitHubClient = require('./github');
const AIClient = require('./ai-client');
const CommandParser = require('./command-parser');
const FileFilter = require('./file-filter');
const Logger = require('./logger');
const { createDocsPrompt, createUpdateDocsPrompt } = require('./docs-prompt');
const config = require('./config');

/**
 * Documentation Generator Action
 */
class DocumentationGenerator {
  constructor() {
    this.logger = new Logger('DocumentationGenerator');
    this.commandParser = new CommandParser();
    this.fileFilter = new FileFilter();
    this.githubClient = null;
    this.aiClient = null;
  }

  /**
   * Main entry point
   */
  async run() {
    try {
      this.logger.info('Starting PR Documentation Generator');

      // Validate environment
      const validation = this.validateEnvironment();
      if (!validation.isValid) {
        this.logger.info(validation.message);
        return;
      }

      // Parse command
      const command = this.parseCommand(validation.payload);
      if (!command) {
        return;
      }

      // Initialize clients
      await this.initializeClients();

      // Process PR
      await this.processPR(validation.payload, command);

      this.logger.info('Documentation Generator completed successfully');

    } catch (error) {
      this.logger.error('Documentation generation failed', error);
      core.setFailed(`Documentation generation failed: ${error.message}`);

      // Try to leave error comment
      await this.postErrorComment(error.message);
    }
  }

  /**
   * Validate environment and GitHub event
   * @returns {object} - Validation result
   */
  validateEnvironment() {
    const eventName = process.env.GITHUB_EVENT_NAME;
    const payload = github.context.payload;

    if (eventName !== 'issue_comment') {
      return {
        isValid: false,
        message: 'This action only runs on issue_comment events'
      };
    }

    if (!payload.issue?.pull_request) {
      return {
        isValid: false,
        message: 'This comment is not on a pull request'
      };
    }

    return {
      isValid: true,
      payload
    };
  }

  /**
   * Parse and validate command
   * @param {object} payload - GitHub event payload
   * @returns {object|null} - Parsed command or null
   */
  parseCommand(payload) {
    const commentBody = payload.comment.body;
    const parsedCommand = this.commandParser.parse(commentBody);

    if (!parsedCommand) {
      this.logger.debug('No valid command found in comment');
      return null;
    }

    if (!parsedCommand.valid) {
      this.logger.warn('Invalid command', parsedCommand.errors);
      this.postErrorComment(
          `Invalid command. Errors:\n${parsedCommand.errors.map(e => `- ${e}`).join('\n')}\n\n` +
          this.commandParser.getHelp(parsedCommand.command)
      );
      return null;
    }

    this.logger.info('Command detected', parsedCommand);
    return parsedCommand;
  }

  /**
   * Initialize GitHub and AI clients
   */
  async initializeClients() {
    try {
      this.githubClient = new GitHubClient();
      this.aiClient = new AIClient();
      this.logger.info('Clients initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize clients', error);
      throw error;
    }
  }

  /**
   * Process PR for documentation
   * @param {object} payload - GitHub event payload
   * @param {object} command - Parsed command
   */
  async processPR(payload, command) {
    const prNumber = payload.issue.number;
    const username = payload.comment.user.login;

    // Get PR details
    const prDetails = await this.githubClient.getPRDetails(prNumber);

    // Check if PR is merged
    if (!prDetails.merged) {
      await this.githubClient.createComment(
          prNumber,
          `⚠️ @${username} Documentation generation is only available for merged PRs. ` +
          `Please merge PR #${prNumber} first.`
      );
      return;
    }

    // Get and filter changed files
    const changedFiles = await this.githubClient.getChangedFiles(prNumber);
    const filteredFiles = this.fileFilter.filterByScope(changedFiles, command.options.scope);

    if (filteredFiles.length === 0) {
      await this.githubClient.createComment(
          prNumber,
          `ℹ️ @${username} No files to document based on the specified scope.\n` +
          `Total files in PR: ${changedFiles.length}\n` +
          `Scope: \`${command.options.scope}\``
      );
      return;
    }

    // Show filter statistics
    const filterStats = this.fileFilter.getFilterStats(changedFiles, filteredFiles);
    this.logger.info('File filter statistics', filterStats);

    // Process documentation
    await this.processDocumentation(prDetails, filteredFiles, command, username);
  }

  /**
   * Process documentation generation
   * @param {object} prDetails - PR details
   * @param {Array} files - Files to document
   * @param {object} command - Command details
   * @param {string} username - User who triggered the action
   */
  async processDocumentation(prDetails, files, command, username) {
    const prNumber = prDetails.number;

    // Setup documentation branch
    const docsBranchBase = `docs/${command.command}-pr-${prNumber}`;
    const { branchName: docsBranch, existingPR } = await this.githubClient.createOrGetDocsBranch(
        prDetails.base,
        docsBranchBase,
        prNumber,
        command.command
    );

    // Process files
    const results = {
      generated: [],
      updated: [],
      skipped: [],
      failed: []
    };

    // Post initial status
    await this.githubClient.createComment(
        prNumber,
        `🔄 @${username} Starting documentation generation for ${files.length} files...`
    );

    // Process each file
    for (const file of files) {
      await this.processFile(file, prDetails, docsBranch, command, results);
    }

    // Create or update PR
    await this.createOrUpdateDocsPR(prDetails, docsBranch, existingPR, results, command, username);
  }

  /**
   * Process a single file for documentation
   * @param {object} file - File to process
   * @param {object} prDetails - PR details
   * @param {string} docsBranch - Documentation branch
   * @param {object} command - Command details
   * @param {object} results - Results accumulator
   */
  async processFile(file, prDetails, docsBranch, command, results) {
    try {
      this.logger.info(`Processing file: ${file.filename}`);

      // Get file content
      const content = await this.githubClient.getFileContent(file.filename, prDetails.head);

      // Generate documentation path
      const basename = path.basename(file.filename, path.extname(file.filename));
      const docsDir = `docs/${command.command}`;
      const docFilename = `${docsDir}/${basename}.adoc`;

      // Check for existing documentation
      const { exists, content: existingDoc, hasChanged } = await this.checkExistingDoc(
          file.filename,
          docFilename,
          docsBranch,
          prDetails
      );

      if (exists && !hasChanged) {
        this.logger.info(`Skipping ${file.filename} - no changes since last documentation`);
        results.skipped.push({
          source: file.filename,
          doc: docFilename,
          reason: 'Source unchanged'
        });
        return;
      }

      // Generate documentation
      const docContent = await this.generateDocumentation(
          file.filename,
          content,
          existingDoc,
          prDetails,
          command.options.lang
      );

      // Commit documentation
      await this.githubClient.commitFile(
          docsBranch,
          docFilename,
          docContent,
          `docs: ${exists ? 'Update' : 'Generate'} documentation for ${basename} (PR #${prDetails.number})`
      );

      // Update results
      if (exists) {
        results.updated.push(docFilename);
      } else {
        results.generated.push(docFilename);
      }

    } catch (error) {
      this.logger.error(`Failed to process file: ${file.filename}`, error);
      results.failed.push({
        filename: file.filename,
        error: error.message
      });
    }
  }

  /**
   * Check for existing documentation
   * @param {string} sourceFile - Source file path
   * @param {string} docFile - Documentation file path
   * @param {string} docsBranch - Documentation branch
   * @param {object} prDetails - PR details
   * @returns {object} - Existing doc info
   */
  async checkExistingDoc(sourceFile, docFile, docsBranch, prDetails) {
    try {
      // Try to get from docs branch first
      const content = await this.githubClient.getFileContent(docFile, docsBranch);
      const hasChanged = await this.githubClient.hasSourceFileChanged(
          sourceFile,
          docFile,
          docsBranch,
          prDetails.head
      );

      return { exists: true, content, hasChanged };

    } catch (error) {
      // Try base branch
      try {
        const content = await this.githubClient.getFileContent(docFile, prDetails.base);
        return { exists: true, content, hasChanged: true };
      } catch (baseError) {
        return { exists: false, content: null, hasChanged: true };
      }
    }
  }

  /**
   * Generate documentation using AI
   * @param {string} filename - Source file name
   * @param {string} content - File content
   * @param {string} existingDoc - Existing documentation if any
   * @param {object} prDetails - PR details
   * @param {string} language - Documentation language
   * @returns {Promise<string>} - Generated documentation
   */
  async generateDocumentation(filename, content, existingDoc, prDetails, language) {
    const systemPrompt = config.docsPromptTemplates?.[language] || config.docsPromptTemplates?.en || '';

    let userPrompt;
    if (existingDoc) {
      userPrompt = createUpdateDocsPrompt(filename, content, existingDoc, prDetails, language);
    } else {
      userPrompt = createDocsPrompt(filename, content, prDetails, language);
    }

    return await this.aiClient.sendPrompt(systemPrompt, userPrompt);
  }

  /**
   * Create or update documentation PR
   * @param {object} prDetails - Original PR details
   * @param {string} docsBranch - Documentation branch
   * @param {object} existingPR - Existing PR if any
   * @param {object} results - Processing results
   * @param {object} command - Command details
   * @param {string} username - User who triggered action
   */
  async createOrUpdateDocsPR(prDetails, docsBranch, existingPR, results, command, username) {
    const totalProcessed = results.generated.length + results.updated.length;

    if (totalProcessed === 0 && results.failed.length > 0) {
      // All files failed
      await this.githubClient.createComment(
          prDetails.number,
          `❌ @${username} Documentation generation failed for all files.\n\n` +
          `**Failed files:**\n${results.failed.map(f => `- ${f.filename}: ${f.error}`).join('\n')}`
      );
      return;
    }

    let prUrl;

    if (existingPR) {
      // Update existing PR
      prUrl = existingPR.url;
      await this.postUpdateComment(existingPR.number, results, command, username);
    } else if (totalProcessed > 0) {
      // Create new PR
      const pr = await this.createDocsPR(prDetails, docsBranch, results, command);
      prUrl = pr.html_url;
    }

    // Post summary
    await this.postSummaryComment(prDetails.number, results, prUrl, existingPR, username);
  }

  /**
   * Create documentation PR
   * @param {object} prDetails - Original PR details
   * @param {string} docsBranch - Documentation branch
   * @param {object} results - Processing results
   * @param {object} command - Command details
   * @returns {Promise<object>} - Created PR
   */
  async createDocsPR(prDetails, docsBranch, results, command) {
    const title = `docs: Generate documentation for ${command.command} (PR #${prDetails.number})`;

    const body = this.generatePRBody(prDetails, results, command);

    try {
      return await this.githubClient.createPR(title, body, docsBranch, prDetails.base);
    } catch (error) {
      if (error.message.includes('already exists')) {
        this.logger.warn('PR already exists but was not found earlier');
        return { html_url: 'existing PR' };
      }
      throw error;
    }
  }

  /**
   * Generate PR body content
   * @param {object} prDetails - Original PR details
   * @param {object} results - Processing results
   * @param {object} command - Command details
   * @returns {string} - PR body markdown
   */
  generatePRBody(prDetails, results, command) {
    let body = `# ${command.command} Documentation Generation\n\n`;
    body += `This PR contains automatically generated documentation for PR #${prDetails.number}.\n\n`;

    if (results.generated.length > 0) {
      body += `## 📄 Generated Documentation (${results.generated.length})\n`;
      body += results.generated.map(f => `- ${f}`).join('\n');
      body += '\n\n';
    }

    if (results.updated.length > 0) {
      body += `## 📝 Updated Documentation (${results.updated.length})\n`;
      body += results.updated.map(f => `- ${f}`).join('\n');
      body += '\n\n';
    }

    if (results.skipped.length > 0) {
      body += `## ⏭️ Skipped Files (${results.skipped.length})\n`;
      body += results.skipped.map(f => `- ${f.source} - ${f.reason}`).join('\n');
      body += '\n\n';
    }

    if (results.failed.length > 0) {
      body += `## ❌ Failed Files (${results.failed.length})\n`;
      body += results.failed.map(f => `- ${f.filename}: ${f.error}`).join('\n');
      body += '\n\n';
    }

    body += `---\n`;
    body += `**Source PR:** #${prDetails.number} - ${prDetails.title}\n`;
    body += `**Command:** \`${command.rawCommand}\`\n`;
    body += `**Language:** ${command.options.lang}\n\n`;
    body += `*This documentation was automatically generated. Please review and modify as needed.*`;

    return body;
  }

  /**
   * Post update comment on existing PR
   * @param {number} prNumber - Documentation PR number
   * @param {object} results - Processing results
   * @param {object} command - Command details
   * @param {string} username - User who triggered action
   */
  async postUpdateComment(prNumber, results, command, username) {
    let comment = `📝 Documentation updated by @${username}\n\n`;

    if (results.generated.length > 0) {
      comment += `**New documentation:** ${results.generated.length} files\n`;
    }

    if (results.updated.length > 0) {
      comment += `**Updated documentation:** ${results.updated.length} files\n`;
    }

    if (results.skipped.length > 0) {
      comment += `**Skipped (unchanged):** ${results.skipped.length} files\n`;
    }

    if (results.failed.length > 0) {
      comment += `**Failed:** ${results.failed.length} files\n`;
      comment += '\nFailed files:\n';
      comment += results.failed.map(f => `- ${f.filename}: ${f.error}`).join('\n');
    }

    comment += `\n\nCommand: \`${command.rawCommand}\``;

    await this.githubClient.createComment(prNumber, comment);
  }

  /**
   * Post summary comment on source PR
   * @param {number} prNumber - Source PR number
   * @param {object} results - Processing results
   * @param {string} prUrl - Documentation PR URL
   * @param {boolean} existingPR - Whether PR existed
   * @param {string} username - User who triggered action
   */
  async postSummaryComment(prNumber, results, prUrl, existingPR, username) {
    const total = results.generated.length + results.updated.length + results.skipped.length;
    const processed = results.generated.length + results.updated.length;

    let comment = `✅ @${username} Documentation generation completed!\n\n`;
    comment += `📊 **Summary:**\n`;
    comment += `- Total files: ${total}\n`;
    comment += `- Generated: ${results.generated.length}\n`;
    comment += `- Updated: ${results.updated.length}\n`;
    comment += `- Skipped: ${results.skipped.length}\n`;
    comment += `- Failed: ${results.failed.length}\n\n`;

    if (prUrl) {
      comment += `📚 **Documentation PR:** ${prUrl} (${existingPR ? 'updated' : 'created'})\n`;
    }

    if (results.failed.length > 0) {
      comment += `\n⚠️ **Some files failed to process:**\n`;
      comment += results.failed.slice(0, 5).map(f => `- ${f.filename}: ${f.error}`).join('\n');
      if (results.failed.length > 5) {
        comment += `\n...and ${results.failed.length - 5} more`;
      }
    }

    await this.githubClient.createComment(prNumber, comment);
  }

  /**
   * Post error comment
   * @param {string} errorMessage - Error message to post
   */
  async postErrorComment(errorMessage) {
    try {
      const payload = github.context.payload;
      if (payload?.issue?.number && payload?.comment?.user?.login && this.githubClient) {
        await this.githubClient.createComment(
            payload.issue.number,
            `❌ @${payload.comment.user.login} Error: ${errorMessage}`
        );
      }
    } catch (error) {
      this.logger.error('Failed to post error comment', error);
    }
  }
}

// Main execution
async function main() {
  const generator = new DocumentationGenerator();
  await generator.run();
}

// Execute if running directly
if (require.main === module) {
  main();
}

module.exports = {
  DocumentationGenerator,
  main
};
