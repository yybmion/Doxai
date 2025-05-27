const CommandParser = require('../../src/command-parser');

describe('CommandParser', () => {
  let parser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('parse method', () => {
    it('should parse valid doxai command with defaults', () => {
      const result = parser.parse('!doxai');

      expect(result).toEqual({
        command: 'doxai',
        valid: true,
        options: {
          scope: 'all',
          lang: 'en'
        },
        rawCommand: '!doxai'
      });
    });

    it('should parse command with scope option', () => {
      const result = parser.parse('!doxai --scope include:src/');

      expect(result).toEqual({
        command: 'doxai',
        valid: true,
        options: {
          scope: 'include:src/',
          lang: 'en'
        },
        rawCommand: '!doxai --scope include:src/'
      });
    });

    it('should parse command with language option', () => {
      const result = parser.parse('!doxai --lang ko');

      expect(result).toEqual({
        command: 'doxai',
        valid: true,
        options: {
          scope: 'all',
          lang: 'ko'
        },
        rawCommand: '!doxai --lang ko'
      });
    });

    it('should parse command with multiple options', () => {
      const result = parser.parse('!doxai --scope exclude:test --lang ko');

      expect(result).toEqual({
        command: 'doxai',
        valid: true,
        options: {
          scope: 'exclude:test',
          lang: 'ko'
        },
        rawCommand: '!doxai --scope exclude:test --lang ko'
      });
    });

    it('should return null for non-command text', () => {
      expect(parser.parse('This is just a comment')).toBeNull();
      expect(parser.parse('')).toBeNull();
      expect(parser.parse(null)).toBeNull();
    });

    it('should return null for unknown commands', () => {
      const result = parser.parse('!unknown-command');
      expect(result).toBeNull();
    });

    it('should validate scope options', () => {
      const invalidResult = parser.parse('!doxai --scope invalid-pattern');

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Invalid value for --scope')
          ])
      );
      expect(invalidResult.options.scope).toBe('invalid');
    });

    it('should validate language options', () => {
      const invalidResult = parser.parse('!doxai --lang fr');

      expect(invalidResult).toEqual({
        command: 'doxai',
        valid: false,
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid value for --lang')
        ]),
        options: {
          scope: 'all',
          lang: 'fr'
        }
      });
    });

    it('should handle command in multiline comment', () => {
      const comment = `Some initial text
!doxai --scope include:utils
More text after`;

      const result = parser.parse(comment);
      expect(result).not.toBeNull();
      expect(result.valid).toBe(true);
      expect(result.command).toBe('doxai');
      expect(result.options.scope).toBe('include:utils');
    });
  });

  describe('containsCommand method', () => {
    it('should detect command presence', () => {
      expect(parser.containsCommand('!doxai')).toBe(true);
      expect(parser.containsCommand('Some text\n!doxai --lang ko')).toBe(true);
      expect(parser.containsCommand('No command here')).toBe(false);
    });
  });

  describe('getHelp method', () => {
    it('should return help text for valid command', () => {
      const help = parser.getHelp('doxai');

      expect(help).toContain('!doxai');
      expect(help).toContain('Generate documentation');
      expect(help).toContain('--scope');
      expect(help).toContain('--lang');
      expect(help).toContain('Examples:');
    });

    it('should return error message for unknown command', () => {
      const help = parser.getHelp('unknown');
      expect(help).toContain('Unknown command: unknown');
    });
  });

  describe('backward compatibility', () => {
    it('should support legacy parseCommand static method', () => {
      const result = CommandParser.parseCommand('!doxai --scope include:src --lang ko');

      expect(result).toEqual({
        project: 'doxai',
        scope: 'include:src',
        lang: 'ko'
      });
    });

    it('should return null for invalid legacy command', () => {
      expect(CommandParser.parseCommand('!invalid')).toBeNull();
      expect(CommandParser.parseCommand('not a command')).toBeNull();
    });
  });
});
