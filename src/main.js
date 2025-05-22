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
 * Check if file type is suitable for documentation
 * @param {string} filename - File name with extension
 * @returns {boolean} - Whether the file should be documented
 */
function shouldDocumentFile(filename) {
  const documentableExtensions = [
    'js', 'jsx', 'ts', 'tsx',           // JavaScript/TypeScript
    'py', 'pyw',                       // Python
    'java', 'kt', 'scala',             // JVM 언어
    'cs', 'vb',                        // .NET
    'cpp', 'c', 'h', 'hpp',            // C/C++
    'rs',                              // Rust
    'go',                              // Go
    'rb',                              // Ruby
    'php',                             // PHP
    'swift',                           // Swift
    'dart',                            // Dart
    'r',                               // R
    'sql',                             // SQL

    'sh', 'bash', 'zsh', 'fish',       // Shell
    'ps1', 'psm1',                     // PowerShell
    'bat', 'cmd',                      // Windows Batch

    'html', 'htm',
    'css', 'scss', 'sass', 'less',
    'vue', 'svelte',

    'json', 'yaml', 'yml',
    'toml', 'ini', 'conf',
    'xml',
    'dockerfile',

    'md', 'rst', 'adoc', 'txt',

    'makefile', 'cmake',
    'gradle', 'maven'
  ];

  const excludePatterns = [
    'node_modules/', 'dist/', 'build/', '.next/', '.nuxt/',
    'target/', 'bin/', 'obj/', '.git/', '.vscode/', '.idea/',

    '.tmp', '.temp', '.cache', '.log',

    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.pdf', '.zip', '.tar', '.gz', '.rar',
    '.exe', '.dll', '.so', '.dylib',

    '.env', '.env.local', '.env.production',
    'package-lock.json', 'yarn.lock', 'composer.lock'
  ];

  if (excludePatterns.some(pattern => filename.includes(pattern))) {
    return false;
  }

  const extension = path.extname(filename).slice(1).toLowerCase();

  const basename = path.basename(filename).toLowerCase();
  const specialFiles = [
    'dockerfile', 'makefile', 'rakefile', 'gemfile',
    'podfile', 'vagrantfile', 'gruntfile', 'gulpfile'
  ];

  if (specialFiles.includes(basename)) {
    return true;
  }

  return documentableExtensions.includes(extension);
}

/**
 * Filter files based on scope (with smart file type filtering)
 * @param {Array} files - File list
 * @param {string} scope - Scope option
 * @returns {Array} - Filtered file list
 */
function filterFilesByScope(files, scope) {
  console.log('All files before filtering:', files.map(f => f.filename));

  // First filter by documentable file types
  const documentableFiles = files.filter(file => {
    const shouldDoc = shouldDocumentFile(file.filename);
    if (!shouldDoc) {
      console.log(`Skipping ${file.filename} - not a documentable file type`);
    }
    return shouldDoc;
  });

  console.log('Documentable files:', documentableFiles.map(f => f.filename));

  if (scope === 'all') {
    return documentableFiles;
  }

  if (scope.startsWith('include:')) {
    const patterns = scope.substring(8).split(',');
    console.log('Include patterns:', patterns);

    const filtered = documentableFiles.filter(file => {
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
    return documentableFiles.filter(file => {
      const basename = path.basename(file.filename);
      return !patterns.some(pattern =>
          basename === pattern ||
          basename.includes(pattern) ||
          file.filename.includes(pattern)
      );
    });
  }

  return documentableFiles;
}

/**
 * Check if source file has changed since last documentation generation
 * @param {object} githubClient - GitHub client instance
 * @param {string} sourceFilename - Source file name
 * @param {string} docFilename - Documentation file name
 * @param {string} docsBranch - Documentation branch
 * @param {string} sourceBranch - Source branch (head of PR)
 * @returns {Promise<boolean>} - Whether the source file has changed
 */
async function hasSourceFileChanged(githubClient, sourceFilename, docFilename, docsBranch, sourceBranch) {
  try {
    const { data: commits } = await githubClient.octokit.rest.repos.listCommits({
      ...githubClient.context,
      path: docFilename,
      sha: docsBranch,
      per_page: 1
    });

    if (commits.length === 0) {
      return true;
    }

    const lastDocCommitDate = new Date(commits[0].commit.committer.date);

    const { data: sourceCommits } = await githubClient.octokit.rest.repos.listCommits({
      ...githubClient.context,
      path: sourceFilename,
      sha: sourceBranch,
      per_page: 1
    });

    if (sourceCommits.length === 0) {
      return false;
    }

    const lastSourceCommitDate = new Date(sourceCommits[0].commit.committer.date);

    return lastSourceCommitDate > lastDocCommitDate;

  } catch (error) {
    console.log(`Could not check file change status for ${sourceFilename}, assuming changed`);
    return true;
  }
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
    const skippedFiles = [];
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

        // Check if documentation file already exists
        let existingDocContent = null;
        let isUpdate = false;
        let hasExistingDoc = false;

        try {
          existingDocContent = await githubClient.getFileContent(docFilename, docsBranch);
          hasExistingDoc = true;
          isUpdate = true;
          console.log(`Existing documentation found for ${file.filename} in docs branch`);
        } catch (error) {
          try {
            existingDocContent = await githubClient.getFileContent(docFilename, prDetails.base);
            hasExistingDoc = true;
            isUpdate = true;
            console.log(`Existing documentation found for ${file.filename} in base branch`);
          } catch (baseError) {
            console.log(`No existing documentation for ${file.filename}, creating new`);
            hasExistingDoc = false;
            isUpdate = false;
          }
        }

        if (hasExistingDoc) {
          const sourceChanged = await hasSourceFileChanged(
              githubClient,
              file.filename,
              docFilename,
              docsBranch,
              prDetails.head
          );

          if (!sourceChanged) {
            console.log(`Skipping ${file.filename} - source file hasn't changed since last documentation`);
            skippedFiles.push({
              filename: file.filename,
              docFilename: docFilename,
              reason: 'Source file unchanged since last documentation'
            });
            continue;
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

    if (totalProcessedFiles > 0 || skippedFiles.length > 0) {
      let prUrl;

      if (existingPR) {
        // Use existing PR
        prUrl = existingPR.url;

        // 기존 문서 PR에 상세한 업데이트 댓글 추가
        let updateComment = `📝 Documentation updated for PR #${prNumber} by @${payload.comment.user.login}\n`;

        if (generatedFiles.length > 0) {
          updateComment += `\n**New documentation:**\n${generatedFiles.map(file => `- ${file}`).join('\n')}`;
        }

        if (updatedFiles.length > 0) {
          updateComment += `\n**Updated documentation:**\n${updatedFiles.map(file => `- ${file}`).join('\n')}`;
        }

        if (skippedFiles.length > 0) {
          updateComment += `\n**Skipped (unchanged):**\n${skippedFiles.map(file => `- ${file.docFilename} (${file.reason})`).join('\n')}`;
        }

        if (failedFiles.length > 0) {
          updateComment += `\n**Failed:**\n${failedFiles.map(f => `- ${f.filename}: ${f.reason}`).join('\n')}`;
        }

        updateComment += `\n\nCommand: \`${commentBody}\``;

        await githubClient.createPRComment(existingPR.number, updateComment);
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

      let summaryComment = `✅ @${payload.comment.user.login} Documentation generation completed.\n\n`;
      summaryComment += `${existingPR ? 'Updated' : 'Created'} documentation: ${prUrl}\n\n`;

      if (generatedFiles.length > 0) summaryComment += `**New:** ${generatedFiles.length} files\n`;
      if (updatedFiles.length > 0) summaryComment += `**Updated:** ${updatedFiles.length} files\n`;
      if (skippedFiles.length > 0) summaryComment += `**Skipped:** ${skippedFiles.length} files (unchanged)\n`;
      if (failedFiles.length > 0) summaryComment += `**Failed:** ${failedFiles.length} files\n`;

      await githubClient.createPRComment(prNumber, summaryComment);

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
  filterFilesByScope,
  hasSourceFileChanged,
  shouldDocumentFile
};
