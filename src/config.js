const path = require('path');
const core = require('@actions/core');

const config = {
  githubToken: core.getInput('github-token'),

  aiProvider: core.getInput('ai-provider'),
  aiModel: core.getInput('ai-model'),
  aiApiKey: core.getInput('ai-api-key'),

  language: core.getInput('language'),

  aiEndpoints: {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    azure: process.env.AZURE_OPENAI_ENDPOINT
  },

  templatePath: path.join(__dirname, '..', '.github', 'templates')
};

module.exports = config;
