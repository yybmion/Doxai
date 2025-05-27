const FileFilter = require('../../src/file-filter');

// Mock config
jest.mock('../../src/config', () => ({
  fileConfig: {
    documentableExtensions: new Set([
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'kt', 'cpp', 'c', 'h',
      'cs', 'go', 'rb', 'php', 'swift', 'dart', 'rs', 'html', 'css',
      'scss', 'json', 'yaml', 'yml', 'md', 'sql', 'sh', 'bash'
    ]),
    excludePatterns: [
      'node_modules/', 'dist/', 'build/', '.git/', '.vscode/',
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
      '.pdf', '.zip', '.tar', '.gz', 'package-lock.json'
    ],
    specialFiles: new Set([
      'dockerfile', 'makefile', 'rakefile', 'gemfile'
    ])
  }
}));

describe('FileFilter', () => {
  let fileFilter;

  beforeEach(() => {
    fileFilter = new FileFilter();
  });

  describe('shouldDocumentFile', () => {
    it('should include documentable file extensions', () => {
      expect(fileFilter.shouldDocumentFile('src/app.js')).toBe(true);
      expect(fileFilter.shouldDocumentFile('utils/helper.py')).toBe(true);
      expect(fileFilter.shouldDocumentFile('main.go')).toBe(true);
      expect(fileFilter.shouldDocumentFile('styles.css')).toBe(true);
      expect(fileFilter.shouldDocumentFile('config.json')).toBe(true);
    });

    it('should include special files', () => {
      expect(fileFilter.shouldDocumentFile('Dockerfile')).toBe(true);
      expect(fileFilter.shouldDocumentFile('Makefile')).toBe(true);
      expect(fileFilter.shouldDocumentFile('dockerfile')).toBe(true);
    });

    it('should exclude non-documentable files', () => {
      expect(fileFilter.shouldDocumentFile('image.png')).toBe(false);
      expect(fileFilter.shouldDocumentFile('video.mp4')).toBe(false);
      expect(fileFilter.shouldDocumentFile('archive.zip')).toBe(false);
      expect(fileFilter.shouldDocumentFile('package-lock.json')).toBe(false);
    });

    it('should exclude files matching exclude patterns', () => {
      expect(fileFilter.shouldDocumentFile('node_modules/lib/file.js')).toBe(false);
      expect(fileFilter.shouldDocumentFile('dist/bundle.js')).toBe(false);
      expect(fileFilter.shouldDocumentFile('build/output.js')).toBe(false);
      expect(fileFilter.shouldDocumentFile('.git/config')).toBe(false);
    });
  });

  describe('filterByScope', () => {
    const testFiles = [
      { filename: 'src/app.js', status: 'modified' },
      { filename: 'src/utils.py', status: 'added' },
      { filename: 'test/app.test.js', status: 'modified' },
      { filename: 'docs/README.md', status: 'added' },
      { filename: 'package.json', status: 'modified' },
      { filename: 'logo.png', status: 'added' },
      { filename: 'node_modules/lib.js', status: 'modified' },
      { filename: 'deleted-file.js', status: 'removed' }
    ];

    it('should filter all documentable files with scope "all"', () => {
      const result = fileFilter.filterByScope(testFiles, 'all');

      const expectedFiles = [
        { filename: 'src/app.js', status: 'modified' },
        { filename: 'src/utils.py', status: 'added' },
        { filename: 'test/app.test.js', status: 'modified' },
        { filename: 'docs/README.md', status: 'added' },
        { filename: 'package.json', status: 'modified' },
        { filename: 'deleted-file.js', status: 'removed' }
      ];

      expect(result).toEqual(expectedFiles);
    });

    it('should include files matching include patterns', () => {
      const result = fileFilter.filterByScope(testFiles, 'include:src/');

      expect(result).toEqual([
        { filename: 'src/app.js', status: 'modified' },
        { filename: 'src/utils.py', status: 'added' }
      ]);
    });

    it('should include files matching multiple include patterns', () => {
      const result = fileFilter.filterByScope(testFiles, 'include:src/,docs/');

      expect(result).toEqual([
        { filename: 'src/app.js', status: 'modified' },
        { filename: 'src/utils.py', status: 'added' },
        { filename: 'docs/README.md', status: 'added' }
      ]);
    });

    it('should exclude files matching exclude patterns', () => {
      const result = fileFilter.filterByScope(testFiles, 'exclude:test');

      expect(result).toEqual([
        { filename: 'src/app.js', status: 'modified' },
        { filename: 'src/utils.py', status: 'added' },
        { filename: 'docs/README.md', status: 'added' },
        { filename: 'package.json', status: 'modified' },
        { filename: 'deleted-file.js', status: 'removed' }
      ]);
    });

    it('should exclude files matching multiple exclude patterns', () => {
      const result = fileFilter.filterByScope(testFiles, 'exclude:test,package.json');

      expect(result).toEqual([
        { filename: 'src/app.js', status: 'modified' },
        { filename: 'src/utils.py', status: 'added' },
        { filename: 'docs/README.md', status: 'added' },
        { filename: 'deleted-file.js', status: 'removed' }
      ]);
    });

    it('should handle invalid scope gracefully', () => {
      const result = fileFilter.filterByScope(testFiles, 'invalid:pattern');

      // Should fall back to all documentable files
      expect(result.length).toBeGreaterThan(0);
    });

    it('should separate active and deleted files properly', () => {
      const result = fileFilter.filterByScope(testFiles, 'all');
      const deletedFiles = result.filter(f => f.status === 'removed');
      const activeFiles = result.filter(f => f.status !== 'removed');

      expect(deletedFiles).toHaveLength(1);
      expect(deletedFiles[0].filename).toBe('deleted-file.js');
      expect(activeFiles.length).toBeGreaterThan(0);
    });
  });

  describe('matchesPattern', () => {
    it('should match exact file names', () => {
      expect(fileFilter.matchesPattern('src/app.js', 'app.js', 'app.js')).toBe(true);
      expect(fileFilter.matchesPattern('src/app.js', 'app.js', 'other.js')).toBe(false);
    });

    it('should match patterns in full path', () => {
      expect(fileFilter.matchesPattern('src/components/app.js', 'app.js', 'src/')).toBe(true);
      expect(fileFilter.matchesPattern('src/components/app.js', 'app.js', 'components')).toBe(true);
    });

    it('should support glob patterns', () => {
      expect(fileFilter.matchesPattern('src/app.js', 'app.js', '*.js')).toBe(true);
      expect(fileFilter.matchesPattern('src/app.py', 'app.py', '*.js')).toBe(false);
      expect(fileFilter.matchesPattern('test/app.test.js', 'app.test.js', '*.test.js')).toBe(true);
    });
  });

  describe('getFilterStats', () => {
    const originalFiles = [
      { filename: 'src/app.js', status: 'modified' },
      { filename: 'src/utils.py', status: 'added' },
      { filename: 'test/app.test.js', status: 'modified' },
      { filename: 'deleted.js', status: 'removed' },
      { filename: 'logo.png', status: 'added' }
    ];

    const filteredFiles = [
      { filename: 'src/app.js', status: 'modified' },
      { filename: 'src/utils.py', status: 'added' },
      { filename: 'deleted.js', status: 'removed' }
    ];

    it('should generate correct statistics', () => {
      const stats = fileFilter.getFilterStats(originalFiles, filteredFiles);

      expect(stats).toEqual({
        total: 5,
        included: 3,
        excluded: 2,
        active: 2,
        deleted: 1,
        byExtension: {
          js: 1,
          py: 1
        },
        byStatus: {
          added: 1,
          modified: 1,
          removed: 1
        }
      });
    });

    it('should handle empty filtered files', () => {
      const stats = fileFilter.getFilterStats(originalFiles, []);

      expect(stats.total).toBe(5);
      expect(stats.included).toBe(0);
      expect(stats.excluded).toBe(5);
      expect(stats.active).toBe(0);
      expect(stats.deleted).toBe(0);
    });
  });
});
