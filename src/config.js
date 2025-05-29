const path = require('path');
const core = require('@actions/core');

class Config {
  constructor() {
    this.githubToken = this.getRequiredInput('github-token');
    this.aiProvider = this.getInput('ai-provider', 'google');
    this.aiModel = this.getInput('ai-model', 'gemini-2.0-flash');
    this.aiApiKey = this.getRequiredInput('ai-api-key');
    this.language = this.getInput('language', 'en');

    // AI provider configurations
    this.aiProviderConfig = {
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        headers: (apiKey) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        })
      },
      anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        headers: (apiKey) => ({
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2025-05-01'
        })
      },
      google: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
        headers: (apiKey) => ({
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        })
      }
    };

    this.templatePath = path.join(__dirname, '..', '.github', 'templates');

    // File filtering configuration
    this.fileConfig = {
      documentableExtensions: new Set([
        // Programming languages
        'js', 'jsx', 'ts', 'tsx', 'py', 'pyw', 'java', 'kt', 'scala',
        'cs', 'vb', 'cpp', 'c', 'h', 'hpp', 'rs', 'go', 'rb', 'php',
        'swift', 'dart', 'r', 'sql',
        // Scripts
        'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'bat', 'cmd',
        // Web
        'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
        // Config
        'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'xml',
        // Docs
        'md', 'rst', 'adoc', 'txt',
        // Build
        'makefile', 'cmake', 'gradle', 'maven'
      ]),
      excludePatterns: [
        'node_modules/', 'dist/', 'build/', '.next/', '.nuxt/',
        'target/', 'bin/', 'obj/', '.git/', '.vscode/', '.idea/',
        '.tmp', '.temp', '.cache', '.log',
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
        '.pdf', '.zip', '.tar', '.gz', '.rar',
        '.exe', '.dll', '.so', '.dylib',
        '.env', '.env.local', '.env.production',
        'package-lock.json', 'yarn.lock', 'composer.lock',

        '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.xml',
        '.md', '.rst', '.adoc', '.txt',
        '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.bat', '.cmd'
      ],
      specialFiles: new Set([
        'dockerfile', 'makefile', 'rakefile', 'gemfile',
        'podfile', 'vagrantfile', 'gruntfile', 'gulpfile'
      ])
    };

    this.validate();
  }

  getInput(name, defaultValue = '') {
    return core.getInput(name) || defaultValue;
  }

  getRequiredInput(name) {
    const value = core.getInput(name);
    if (!value) {
      throw new Error(`Required input '${name}' is missing`);
    }
    return value;
  }

  validate() {
    // Validate AI provider
    if (!this.aiProviderConfig[this.aiProvider]) {
      throw new Error(`Unsupported AI provider: ${this.aiProvider}. Supported providers: ${Object.keys(this.aiProviderConfig).join(', ')}`);
    }

    // Validate language
    const supportedLanguages = ['ko', 'en'];
    if (!supportedLanguages.includes(this.language)) {
      throw new Error(`Unsupported language: ${this.language}. Supported languages: ${supportedLanguages.join(', ')}`);
    }
  }

  getAIEndpoint() {
    return this.aiProviderConfig[this.aiProvider].endpoint;
  }

  getAIHeaders() {
    return this.aiProviderConfig[this.aiProvider].headers(this.aiApiKey);
  }

  isValidModel(model) {
    return this.aiProviderConfig[this.aiProvider].models.includes(model);
  }
}

// Export singleton instance
module.exports = new Config();
