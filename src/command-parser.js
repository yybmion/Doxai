const Logger = require('./logger');

/**
 * Parser for PR comment commands
 */
class CommandParser {
  constructor() {
    this.logger = new Logger('CommandParser');

    // Command configuration
    this.commandConfig = {
      doxai: {
        description: 'Generate documentation for code files',
        options: {
          scope: {
            type: 'string',
            default: 'all',
            validate: (value) => {
              const validPatterns = /^(all|include:[^-\s]+|exclude:[^-\s]+)$/;
              return validPatterns.test(value);
            },
            description: 'Filter files: all, include:pattern, exclude:pattern'
          },
          lang: {
            type: 'string',
            default: 'en',
            validate: (value) => ['ko', 'en'].includes(value),
            description: 'Documentation language: ko, en'
          }
        }
      }
    };
  }

  /**
   * Parse command from comment body
   * @param {string} commentBody - PR comment content
   * @returns {object|null} - Parsed command or null
   */
  parse(commentBody) {
    if (!commentBody || typeof commentBody !== 'string') {
      return null;
    }

    // Match command pattern: !command [options]
    const commandMatch = commentBody.match(/^!([a-zA-Z0-9_-]+)(.*)$/m);
    if (!commandMatch) {
      this.logger.debug('No command pattern found in comment');
      return null;
    }

    const [, commandName, optionsString] = commandMatch;

    // Check if command is supported
    if (!this.commandConfig[commandName]) {
      this.logger.debug(`Unknown command: ${commandName}`);
      return null;
    }

    this.logger.info(`Parsing command: ${commandName}`);

    // Parse options
    const options = this.parseOptions(optionsString, this.commandConfig[commandName].options);

    // Validate options
    const validationErrors = this.validateOptions(options, this.commandConfig[commandName].options);
    if (validationErrors.length > 0) {
      this.logger.warn('Command validation errors', validationErrors);
      return {
        command: commandName,
        valid: false,
        errors: validationErrors,
        options
      };
    }

    return {
      command: commandName,
      valid: true,
      options,
      rawCommand: commandMatch[0]
    };
  }

  /**
   * Parse options from string
   * @param {string} optionsString - Options string
   * @param {object} optionConfig - Option configuration
   * @returns {object} - Parsed options
   */
  parseOptions(optionsString, optionConfig) {
    const options = {};

    // Set defaults
    for (const [key, config] of Object.entries(optionConfig)) {
      options[key] = config.default;
    }

    if (!optionsString || !optionsString.trim()) {
      return options;
    }

    // Parse --key value patterns
    const optionRegex = /--(\w+)\s+([^\s-]+(?:[^\s-]*)?)/g;
    let match;

    while ((match = optionRegex.exec(optionsString)) !== null) {
      const [, key, value] = match;
      if (optionConfig[key]) {
        options[key] = this.parseValue(value, optionConfig[key].type);
      } else {
        this.logger.warn(`Unknown option: --${key}`);
      }
    }

    return options;
  }

  /**
   * Parse value based on type
   * @param {string} value - Raw value
   * @param {string} type - Expected type
   * @returns {any} - Parsed value
   */
  parseValue(value, type) {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === '1' || value === 'yes';
      case 'number':
        return Number(value);
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Validate options
   * @param {object} options - Parsed options
   * @param {object} optionConfig - Option configuration
   * @returns {Array} - Validation errors
   */
  validateOptions(options, optionConfig) {
    const errors = [];

    for (const [key, config] of Object.entries(optionConfig)) {
      const value = options[key];

      // Check required
      if (config.required && (value === undefined || value === null)) {
        errors.push(`Option --${key} is required`);
        continue;
      }

      // Run custom validation
      if (config.validate && !config.validate(value)) {
        errors.push(`Invalid value for --${key}: ${value}. ${config.description}`);
      }
    }

    return errors;
  }

  /**
   * Get help text for a command
   * @param {string} commandName - Command name
   * @returns {string} - Help text
   */
  getHelp(commandName) {
    const config = this.commandConfig[commandName];
    if (!config) {
      return `Unknown command: ${commandName}`;
    }

    let help = `**!${commandName}** - ${config.description}\n\n`;
    help += '**Options:**\n';

    for (const [key, optConfig] of Object.entries(config.options)) {
      const required = optConfig.required ? ' (required)' : '';
      const defaultVal = optConfig.default ? ` (default: ${optConfig.default})` : '';
      help += `- \`--${key}\`: ${optConfig.description}${required}${defaultVal}\n`;
    }

    help += '\n**Examples:**\n';
    help += `- \`!${commandName}\` - Use all defaults\n`;
    help += `- \`!${commandName} --scope include:utils,services\` - Only document utils and services\n`;
    help += `- \`!${commandName} --scope exclude:test --lang ko\` - Exclude test files, Korean docs\n`;

    return help;
  }

  /**
   * Check if text contains any command
   * @param {string} text - Text to check
   * @returns {boolean} - Whether text contains a command
   */
  containsCommand(text) {
    return /^!([a-zA-Z0-9_-]+)/m.test(text);
  }
}

// For backward compatibility
CommandParser.parseCommand = function(commentBody) {
  const parser = new CommandParser();
  const result = parser.parse(commentBody);

  if (!result || !result.valid) {
    return null;
  }

  // Return in legacy format
  return {
    project: result.command,
    scope: result.options.scope,
    lang: result.options.lang
  };
};

module.exports = CommandParser;
