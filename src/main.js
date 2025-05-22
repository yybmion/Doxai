const path = require('path');
const core = require('@actions/core');
const github = require('@actions/github');
const GitHubClient = require('./github');
const AIClient = require('./ai-client');
const { docsPromptTemplates, createDocsPrompt, createUpdateDocsPrompt } = require('./docs-prompt');
const config = require('./config');
const fs = require('fs').promises;

/**
 * Parse PR comment to extract command and options
 * @param {string} commentBody - PR comment content
 * @returns {object|null} - Parsing result or null
 */
function parseCommand(commentBody) {
  const commandRegex = /!([a-zA-Z0-9_-]+)(.*)/;
  const match = commentBody.match(commandRegex);

  if (!match) {
    return null;
  }

  const project = match[1];
  const options = match[2].trim();

  if (project !== 'doxai') {
    return null;
  }

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
  console.log('All files before filtering:', files.map(f => f.filename));

  if (scope === 'all') {
    return files;
  }

  if (scope.startsWith('include:')) {
    const patterns = scope.substring(8).split(',');
    console.log('Include patterns:', patterns);

    const filtered = files.filter(file => {
      const basename = path.basename(file.filename);

      return patterns.some(pattern =>
          basename === pattern ||
          basename.includes(pattern) ||
          file.filename.includes(pattern)
      );
    });

    console.log('Filtered files:', filtered.map(f => f.filename));
    return filtered;
  }

  if (scope.startsWith('exclude:')) {
    const patterns = scope.substring(8).split(',');
    return files.filter(file => {
      const basename = path.basename(file.filename);
      return !patterns.some(pattern =>
          basename === pattern ||
          basename.includes(pattern) ||
          file.filename.includes(pattern)
      );
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

    // Documentation branch name base
    const docsBranchBase = `docs/${command.project}-pr-${prNumber}`;

    // Create or get existing documentation branch
    console.log(`Checking for existing documentation branch for PR #${prNumber}...`);
    const { branchName: docsBranch, created: branchCreated, existingPR } =
        await githubClient.createOrGetDocsBranch(prDetails.base, docsBranchBase, prNumber, command.project);

    if (existingPR) {
      console.log(`Found existing documentation PR #${existingPR.number}. Will update it.`);
    } else if (!branchCreated) {
      console.log(`Using existing branch: ${docsBranch}`);
    } else {
      console.log(`Created new branch: ${docsBranch}`);
    }

    // Generate documentation for each file
    console.log(`Starting documentation generation for ${filteredFiles.length} files...`);

    const generatedFiles = [];
    const updatedFiles = [];
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

        // Create documentation filename
        const basename = path.basename(file.filename).split('.')[0];
        const docsDir = `docs/${command.project}`;
        const docFilename = `${docsDir}/${basename}.adoc`;

        // Check if documentation file already exists in the docs branch
        let existingDocContent = null;
        let isUpdate = false;
        try {
          existingDocContent = await githubClient.getFileContent(docFilename, docsBranch);
          console.log(`Existing documentation found for ${file.filename} in docs branch`);
          isUpdate = true;
        } catch (error) {
          // If not found in docs branch, check in base branch
          try {
            existingDocContent = await githubClient.getFileContent(docFilename, prDetails.base);
            console.log(`Existing documentation found for ${file.filename} in base branch`);
            isUpdate = true;
          } catch (baseError) {
            console.log(`No existing documentation for ${file.filename}, creating new`);
          }
        }

        // Generate documentation
        console.log(`${isUpdate ? 'Updating' : 'Generating'} documentation for: ${file.filename}`);
        const systemPrompt = docsPromptTemplates[command.lang] || docsPromptTemplates.en;

        let userPrompt;
        if (isUpdate && existingDocContent) {
          // Update existing documentation
          userPrompt = createUpdateDocsPrompt(file.filename, content, existingDocContent, prDetails, command.lang);
        } else {
          // Create new documentation
          userPrompt = createDocsPrompt(file.filename, content, prDetails, command.lang);
        }

        // Send request to AI
        const documentContent = await aiClient.sendPrompt(systemPrompt, userPrompt);

        // Commit documentation file
        await githubClient.commitFile(
            docsBranch,
            docFilename,
            documentContent,
            `docs: ${isUpdate ? 'Update' : 'Generate'} documentation for ${basename} (PR #${prNumber})`
        );

        if (isUpdate) {
          updatedFiles.push(docFilename);
        } else {
          generatedFiles.push(docFilename);
        }
        console.log(`Documentation completed: ${docFilename}`);

      } catch (error) {
        console.error(`Error processing file: ${file.filename}`, error);
        failedFiles.push({
          filename: file.filename,
          reason: `Error occurred: ${error.message}`
        });
      }
    }

    // Summary and PR creation/update
    const totalProcessedFiles = generatedFiles.length + updatedFiles.length;

    if (totalProcessedFiles > 0) {
      let prUrl;

      if (existingPR) {
        // Use existing PR
        prUrl = existingPR.url;
        console.log(`Updated existing documentation PR: ${prUrl}`);

        // Add comment to existing PR about the update
        await githubClient.createPRComment(
            existingPR.number,
            `📝 Documentation updated for PR #${prNumber} by @${payload.comment.user.login}
            
**Files processed in this update:**
${generatedFiles.length > 0 ? `\n**New documentation:**\n${generatedFiles.map(file => `- ${file}`).join('\n')}` : ''}
${updatedFiles.length > 0 ? `\n**Updated documentation:**\n${updatedFiles.map(file => `- ${file}`).join('\n')}` : ''}

${failedFiles.length > 0 ? `\n**Failed files:**\n${failedFiles.map(f => `- ${f.filename}: ${f.reason}`).join('\n')}` : ''}

Command: \`${commentBody}\``
        );
      } else {
        // Create new PR
        console.log('Creating new documentation PR...');

        const prBody = `# ${command.project} Documentation Generation
        
Documentation was automatically generated for PR #${prNumber}.

## Generated Documentation Files
${generatedFiles.map(file => `- ${file}`).join('\n')}

${updatedFiles.length > 0 ? `
## Updated Documentation Files
${updatedFiles.map(file => `- ${file}`).join('\n')}
` : ''}

${failedFiles.length > 0 ? `
## Failed Files
${failedFiles.map(f => `- ${f.filename}: ${f.reason}`).join('\n')}
` : ''}

This documentation was automatically generated. Please review and modify the content if needed.`;

        const prTitle = `docs: Generate documentation for ${command.project} (PR #${prNumber})`;

        try {
          const pr = await githubClient.createPR(
              prTitle,
              prBody,
              docsBranch,
              prDetails.base
          );
          prUrl = pr.html_url;
        } catch (error) {
          if (error.message.includes('A pull request already exists')) {
            // This shouldn't happen with our new logic, but just in case
            prUrl = 'existing PR (could not retrieve URL)';
          } else {
            throw error;
          }
        }
      }

      // Comment on original PR
      await githubClient.createPRComment(
          prNumber,
          `✅ @${payload.comment.user.login} Documentation generation completed.
        
${existingPR ? 'Updated' : 'Created'} documentation for ${totalProcessedFiles} files: ${prUrl}

${generatedFiles.length > 0 ? `**New:** ${generatedFiles.length} files` : ''}${updatedFiles.length > 0 ? `${generatedFiles.length > 0 ? ', ' : ''}**Updated:** ${updatedFiles.length} files` : ''}

${failedFiles.length > 0 ? `⚠️ ${failedFiles.length} files failed to process.` : ''}`
      );

    } else {
      // All files failed
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
