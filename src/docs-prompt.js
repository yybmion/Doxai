const path = require('path');
const config = require('./config');
const Logger = require('./logger');

/**
 * Documentation prompt templates and generators with embedded templates
 */
class DocsPromptGenerator {
  constructor() {
    this.logger = new Logger('DocsPromptGenerator');

    // Language group mappings - maps file extensions to language groups
    this.languageGroups = {
      // Object-oriented class languages
      'java': 'oop_class',
      'cs': 'oop_class',
      'kt': 'oop_class',
      'scala': 'oop_class',
      'swift': 'oop_class',

      // Functional programming languages
      'js': 'functional',
      'ts': 'functional',
      'py': 'functional',
      'go': 'functional',
      'rs': 'functional',
      'dart': 'functional',

      // Web frontend technologies
      'html': 'web_frontend',
      'css': 'web_frontend',
      'scss': 'web_frontend',
      'sass': 'web_frontend',
      'less': 'web_frontend',
      'vue': 'web_frontend',
      'svelte': 'web_frontend',

      // Data and query languages
      'sql': 'data',
      'csv': 'data',

      // Native/system programming languages
      'c': 'native',
      'cpp': 'native',
      'h': 'native',
      'hpp': 'native'
    };

    // Language mappings for code syntax highlighting
    this.codeLanguageMap = {
      'java': 'Java',
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'py': 'Python',
      'rb': 'Ruby',
      'php': 'PHP',
      'cs': 'C#',
      'go': 'Go',
      'sh': 'Shell',
      'html': 'HTML',
      'css': 'CSS',
      'sql': 'SQL',
      'yml': 'YAML',
      'yaml': 'YAML',
      'json': 'JSON',
      'md': 'Markdown',
      'xml': 'XML',
      'cpp': 'C++',
      'c': 'C',
      'rs': 'Rust',
      'kt': 'Kotlin',
      'swift': 'Swift',
      'dart': 'Dart',
      'r': 'R'
    };

    // Embedded templates - all templates directly in code
    this.templates = this.getEmbeddedTemplates();
  }

  /**
   * Get all embedded templates
   * @returns {object} - All templates organized by [group][language]
   */
  getEmbeddedTemplates() {
    return {
      oop_class: {
        ko: require('./templates/oop-class-ko'),
        en: require('./templates/oop-class-en')
      },
      functional: {
        ko: require('./templates/functional-ko'),
        en: require('./templates/functional-en')
      },
      web_frontend: {
        ko: require('./templates/web-frontend-ko'),
        en: require('./templates/web-frontend-en')
      },
      data: {
        ko: require('./templates/data-ko'),
        en: require('./templates/data-en')
      },
      native: {
        ko: require('./templates/native-ko'),
        en: require('./templates/native-en')
      }
    };
  }

  /**
   * Determine language group based on file extension
   * @param {string} filename - File name with extension
   * @returns {string} - Language group name
   */
  getLanguageGroup(filename) {
    const extension = path.extname(filename).slice(1).toLowerCase();
    const group = this.languageGroups[extension];

    if (!group) {
      this.logger.warn(`No language group found for extension: ${extension}, using functional as default`);
      return 'functional';
    }

    return group;
  }

  /**
   * Extract clean filename without path
   * @param {string} fullPath - Full file path
   * @returns {string} - Clean filename only
   */
  getCleanFilename(fullPath) {
    return fullPath.split('/').pop();
  }

  /**
   * Get display name for programming language
   * @param {string} filename - File name
   * @returns {string} - Language display name
   */
  getLanguageFromFilename(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    return this.codeLanguageMap[extension] || extension.toUpperCase();
  }

  /**
   * Format date string for display
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date (YYYY-MM-DD)
   */
  formatDate(dateString) {
    return new Date(dateString).toISOString().split('T')[0];
  }

  /**
   * Get system prompt for specific file and documentation language
   * @param {string} filename - Source file name
   * @param {string} docLanguage - Documentation language (ko/en)
   * @returns {string} - System prompt specialized for the file type
   */
  getSystemPrompt(filename, docLanguage = 'en') {
    const languageGroup = this.getLanguageGroup(filename);
    const template = this.templates[languageGroup]?.[docLanguage];

    if (!template || !template.systemPrompt) {
      this.logger.warn(`No system prompt found for ${languageGroup}/${docLanguage}, using default`);
      return this.getDefaultSystemPrompt(docLanguage);
    }

    return template.systemPrompt;
  }

  /**
   * Create documentation prompt for new file
   * @param {string} filename - Source file name
   * @param {string} fileContent - Source file content
   * @param {object} prDetails - PR details
   * @param {string} language - Documentation language (ko/en)
   * @returns {string} - Specialized user prompt
   */
  createDocsPrompt(filename, fileContent, prDetails, language = 'en') {
    const languageGroup = this.getLanguageGroup(filename);
    const codeLanguage = this.getLanguageFromFilename(filename);
    const cleanFilename = this.getCleanFilename(filename);

    this.logger.info(`Creating docs prompt: ${languageGroup}/${language} for ${cleanFilename}`);

    const template = this.templates[languageGroup]?.[language];

    if (!template || !template.createTemplate) {
      this.logger.warn(`No create template found for ${languageGroup}/${language}, using default`);
      return this.getDefaultCreatePrompt(filename, fileContent, prDetails, language);
    }

    // Replace placeholders in template with actual values
    return template.createTemplate
    .replace(/\{codeLanguage\}/g, codeLanguage)
    .replace(/\${prNumber}/g, prDetails.number)
    .replace(/\${author}/g, prDetails.author)
    .replace(/\${createdDate}/g, this.formatDate(prDetails.createdAt))
    .replace(/\${updatedDate}/g, this.formatDate(prDetails.updatedAt))
    .replace(/\${updatedBy}/g, prDetails.mergedBy || prDetails.author)
    .replace(/\${filename}/g, cleanFilename)
    .replace(/\${fullPath}/g, filename)
    .replace(/\${fileContent}/g, fileContent);
  }

  /**
   * Create documentation update prompt
   * @param {string} filename - Source file name
   * @param {string} fileContent - Current file content
   * @param {string} existingDocContent - Existing documentation
   * @param {object} prDetails - PR details
   * @param {string} language - Documentation language (ko/en)
   * @returns {string} - Specialized update prompt
   */
  createUpdateDocsPrompt(filename, fileContent, existingDocContent, prDetails, language = 'en') {
    const languageGroup = this.getLanguageGroup(filename);
    const codeLanguage = this.getLanguageFromFilename(filename);
    const cleanFilename = this.getCleanFilename(filename);

    this.logger.info(`Creating update docs prompt: ${languageGroup}/${language} for ${cleanFilename}`);

    const template = this.templates[languageGroup]?.[language];

    if (!template || !template.updateTemplate) {
      this.logger.warn(`No update template found for ${languageGroup}/${language}, using default`);
      return this.getDefaultUpdatePrompt(filename, fileContent, existingDocContent, prDetails, language);
    }

    // Replace placeholders in template with actual values
    return template.updateTemplate
    .replace(/\{codeLanguage\}/g, codeLanguage)
    .replace(/\${prNumber}/g, prDetails.number)
    .replace(/\${author}/g, prDetails.author)
    .replace(/\${createdDate}/g, this.formatDate(prDetails.createdAt))
    .replace(/\${updatedDate}/g, this.formatDate(prDetails.updatedAt))
    .replace(/\${updatedBy}/g, prDetails.mergedBy || prDetails.author)
    .replace(/\${filename}/g, cleanFilename)
    .replace(/\${fullPath}/g, filename)
    .replace(/\${fileContent}/g, fileContent)
    .replace(/\${existingDocContent}/g, existingDocContent);
  }

  /**
   * Get default system prompt as fallback
   * @param {string} language - Documentation language
   * @returns {string} - Default system prompt
   */
  getDefaultSystemPrompt(language) {
    return language === 'ko'
        ? `당신은 코드 문서화 전문가입니다. 제공된 코드를 분석하여 한국어로 AsciiDoc 형식의 문서를 생성해주세요.`
        : `You are a code documentation expert. Please analyze the provided code and generate documentation in AsciiDoc format in English.`;
  }

  /**
   * Get default create prompt as fallback
   */
  getDefaultCreatePrompt(filename, fileContent, prDetails, language) {
    const languageTemplate = language === 'ko'
        ? `# 코드 문서화 요청\n다음 파일을 분석하여 한국어로 AsciiDoc 문서를 생성해주세요.\n\n## 코드\n\`\`\`\n${fileContent}\n\`\`\``
        : `# Code Documentation Request\nPlease analyze the following file and generate AsciiDoc documentation in English.\n\n## Code\n\`\`\`\n${fileContent}\n\`\`\``;

    return languageTemplate;
  }

  /**
   * Get default update prompt as fallback
   */
  getDefaultUpdatePrompt(filename, fileContent, existingDocContent, prDetails, language) {
    return language === 'ko'
        ? `# 문서 업데이트 요청\n변경된 파일의 기존 문서를 업데이트해주세요.`
        : `# Documentation Update Request\nPlease update the existing documentation for the changed file.`;
  }
}

// Create singleton instance
const promptGenerator = new DocsPromptGenerator();

// Export compatibility functions
module.exports = {
  createDocsPrompt: (filename, fileContent, prDetails, language = 'en') => {
    console.log(`[DocsPrompt] Creating docs prompt for language: ${language}, file: ${filename}`);
    return promptGenerator.createDocsPrompt(filename, fileContent, prDetails, language);
  },

  createUpdateDocsPrompt: (filename, fileContent, existingDocContent, prDetails, language = 'en') => {
    console.log(`[DocsPrompt] Creating update docs prompt for language: ${language}, file: ${filename}`);
    return promptGenerator.createUpdateDocsPrompt(filename, fileContent, existingDocContent, prDetails, language);
  },

  getSystemPrompt: (filename, language = 'en') => {
    return promptGenerator.getSystemPrompt(filename, language);
  },

  getLanguageGroup: (filename) => {
    return promptGenerator.getLanguageGroup(filename);
  },

  DocsPromptGenerator
};
