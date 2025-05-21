const path = require('path');
const core = require('@actions/core');
const github = require('@actions/github');
const GitHubClient = require('./github');
const AIClient = require('./ai-client');
const { docsPromptTemplates, createDocsPrompt } = require('./docs-prompt');
const config = require('./config');
const fs = require('fs').promises;

/**
 * Parse PR comment to extract command and options
 * @param {string} commentBody - PR comment content
 * @returns {object|null} - Parsing result or null
 */
function parseCommand(commentBody) {
  const commandRegex = /@([a-zA-Z0-9_-]+)(.*)/;
  const match = commentBody.match(commandRegex);

  if (!match) {
    return null;
  }

  const project = match[1];
  const options = match[2].trim();

  // Set default values
  const result = {
    project,
    scope: 'all',
    lang: config.language
  };

  // Parse scope option
  const scopeRegex = /--scope\s+(all|include:[^-\s]+|exclude:[^-\s]+)/;
  const scopeMatch = options.match(scopeRegex);
  if (scopeMatch) {
    result.scope = scopeMatch[1];
  }

  // Parse language option
  const langRegex = /--lang\s+([a-zA-Z-]+)/;
  const langMatch = options.match(langRegex);
  if (langMatch) {
    result.lang = langMatch[1];
  }

  return result;
}

/**
 * Filter files based on scope
 * @param {Array} files - File list
 * @param {string} scope - Scope option
 * @returns {Array} - Filtered file list
 */
function filterFilesByScope(files, scope) {
  if (scope === 'all') {
    return files;
  }

  if (scope.startsWith('include:')) {
    const filenames = scope.substring(8).split(',');
    return files.filter(file => {
      const basename = path.basename(file.filename);
      return filenames.includes(basename);
    });
  }

  if (scope.startsWith('exclude:')) {
    const filenames = scope.substring(8).split(',');
    return files.filter(file => {
      const basename = path.basename(file.filename);
      return !filenames.includes(basename);
    });
  }

  return files;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('PR Documentation Generator starting...');

    // GitHub event context
    const eventName = process.env.GITHUB_EVENT_NAME;
    const payload = github.context.payload;

    // Check event type
    if (eventName !== 'issue_comment' || !payload.issue?.pull_request) {
      console.log('This event is not a PR comment.');
      return;
    }

    // Check comment content
    const commentBody = payload.comment.body;
    const command = parseCommand(commentBody);

    if (!command) {
      console.log('Not a documentation generation command.');
      return;
    }

    console.log('Documentation command detected:', JSON.stringify(command));

    // Initialize GitHub client
    const githubClient = new GitHubClient();

    // Extract PR number
    const prNumber = payload.issue.number;

    // Check PR status
    const prDetails = await githubClient.getPRDetails(prNumber);

    if (!prDetails.merged) {
      console.log('PR is not merged. Leaving error message and exiting.');
      await githubClient.createPRComment(
          prNumber,
          `⚠️ @${payload.comment.user.login} Documentation generation is only possible on merged PRs. Please merge the PR and try again.`
      );
      return;
    }

    // Get list of changed files
    console.log('Getting list of changed files...');
    const changedFiles = await githubClient.getChangedFiles(prNumber);

    // Filter files based on scope
    const filteredFiles = filterFilesByScope(changedFiles, command.scope);

    if (filteredFiles.length === 0) {
      console.log('No files to process.');
      await githubClient.createPRComment(
          prNumber,
          `ℹ️ @${payload.comment.user.login} No files to document. Please check your scope option.`
      );
      return;
    }

    // Initialize AI client
    const aiClient = new AIClient();

    // Documentation branch name
    const docsBranch = `docs/${command.project}-pr-${prNumber}`;

    // Create new branch
    console.log(`Creating documentation branch: ${docsBranch}`);
    await githubClient.createBranch(prDetails.base, docsBranch);

    // Generate documentation for each file
    console.log(`Starting documentation generation for ${filteredFiles.length} files...`);

    const generatedFiles = [];
    const failedFiles = [];

    for (const file of filteredFiles) {
      try {
        // Get file content
        const content = await githubClient.getFileContent(file.filename, prDetails.head);

        if (!content) {
          console.log(`File not found: ${file.filename}`);
          failedFiles.push({ filename: file.filename, reason: 'File not found.' });
          continue;
        }

        // Generate documentation
        console.log(`Generating documentation for: ${file.filename}`);
        const systemPrompt = docsPromptTemplates[command.lang] || docsPromptTemplates.en;
        const userPrompt = createDocsPrompt(file.filename, content, prDetails, command.lang);

        // Send request to AI
        const documentContent = await aiClient.sendPrompt(systemPrompt, userPrompt);

        // Create documentation filename
        const basename = path.basename(file.filename).split('.')[0];
        const docFilename = `docs/${command.project}/${basename}.adoc`;

        // Commit documentation file
        await githubClient.commitFile(
            docsBranch,
            docFilename,
            documentContent,
            `docs: Generate documentation for ${basename} (PR #${prNumber})`
        );

        generatedFiles.push(docFilename);
        console.log(`Documentation completed: ${docFilename}`);

      } catch (error) {
        console.error(`Error processing file: ${file.filename}`, error);
        failedFiles.push({
          filename: file.filename,
          reason: `Error occurred: ${error.message}`
        });
      }
    }

    // Summary and PR creation
    if (generatedFiles.length > 0) {
      // Create PR
      console.log('Creating documentation PR...');

      const prBody = `# ${command.project} Documentation Generation
      
Documentation was automatically generated for PR #${prNumber}.

## Generated Documentation Files
${generatedFiles.map(file => `- ${file}`).join('\n')}

${failedFiles.length > 0 ? `
## Failed Files
${failedFiles.map(f => `- ${f.filename}: ${f.reason}`).join('\n')}
` : ''}

This documentation was automatically generated. Please review and modify the content if needed.`;

      const pr = await githubClient.createPR(
          `docs: Generate documentation for ${command.project} (PR #${prNumber})`,
          prBody,
          docsBranch,
          prDetails.base
      );

      // Comment on original PR
      await githubClient.createPRComment(
          prNumber,
          `✅ @${payload.comment.user.login} Documentation generation completed.
        
Created documentation for ${generatedFiles.length} files in a new PR: ${pr.html_url}

${failedFiles.length > 0 ? `⚠️ ${failedFiles.length} files failed to process.` : ''}`
      );

    } else {
      // Add branch deletion logic here if needed (when all files fail)
      await githubClient.createPRComment(
          prNumber,
          `❌ @${payload.comment.user.login} Documentation generation failed.
        
Failed to process all files (${failedFiles.length}).
Main error: ${failedFiles[0]?.reason || 'Unknown error'}`
      );
    }

    console.log('PR Documentation Generator completed.');

  } catch (error) {
    console.error('Error during documentation generation:', error);
    core.setFailed(`Documentation generation failed: ${error.message}`);

    // Leave error message if issue comment context exists
    try {
      const payload = github.context.payload;
      if (payload.issue && payload.comment) {
        const githubClient = new GitHubClient();
        await githubClient.createPRComment(
            payload.issue.number,
            `❌ @${payload.comment.user.login} An error occurred during documentation generation: ${error.message}`
        );
      }
    } catch (commentError) {
      console.error('Failed to create error comment:', commentError);
    }
  }
}

// Execute main function
main();

module.exports = {
  main,
  parseCommand,
  filterFilesByScope
};
