const path = require('path');
const config = require('./config');
const Logger = require('./logger');

class FileFilter {
  constructor() {
    this.logger = new Logger('FileFilter');
  }

  /**
   * Check if file type is suitable for documentation
   * @param {string} filename - File name with extension
   * @returns {boolean} - Whether the file should be documented
   */
  shouldDocumentFile(filename) {
    // Check exclude patterns first
    if (this.matchesExcludePattern(filename)) {
      this.logger.debug(`Excluding ${filename} - matches exclude pattern`);
      return false;
    }

    // Check special files
    const basename = path.basename(filename).toLowerCase();
    if (config.fileConfig.specialFiles.has(basename)) {
      this.logger.debug(`Including ${filename} - special file`);
      return true;
    }

    // Check extension
    const extension = path.extname(filename).slice(1).toLowerCase();
    const isDocumentable = config.fileConfig.documentableExtensions.has(extension);

    if (!isDocumentable) {
      this.logger.debug(`Excluding ${filename} - not a documentable file type`);
    }

    return isDocumentable;
  }

  /**
   * Check if filename matches any exclude pattern
   * @param {string} filename - File name to check
   * @returns {boolean} - Whether the file matches an exclude pattern
   */
  matchesExcludePattern(filename) {
    return config.fileConfig.excludePatterns.some(pattern => filename.includes(pattern));
  }

  /**
   * Filter files based on scope
   * @param {Array} files - File list
   * @param {string} scope - Scope option (all, include:pattern, exclude:pattern)
   * @returns {Array} - Filtered file list
   */
  filterByScope(files, scope = 'all') {
    this.logger.info(`Filtering ${files.length} files with scope: ${scope}`);

    const deletedFiles = files.filter(file => file.status === 'removed');
    const activeFiles = files.filter(file => file.status !== 'removed');

    const documentableFiles = activeFiles.filter(file => this.shouldDocumentFile(file.filename));

    const documentableDeletedFiles = deletedFiles.filter(file => this.shouldDocumentFile(file.filename));

    this.logger.info(`Found ${documentableFiles.length} documentable files and ${documentableDeletedFiles.length} deleted files`);

    let filteredActive = documentableFiles;
    let filteredDeleted = documentableDeletedFiles;

    if (scope === 'all') {
    } else if (scope.startsWith('include:')) {
      const patterns = scope.substring(8).split(',').map(p => p.trim()).filter(p => p);
      filteredActive = this.filterByPatterns(documentableFiles, patterns, true);
      filteredDeleted = this.filterByPatterns(documentableDeletedFiles, patterns, true);
    } else if (scope.startsWith('exclude:')) {
      const patterns = scope.substring(8).split(',').map(p => p.trim()).filter(p => p);
      filteredActive = this.filterByPatterns(documentableFiles, patterns, false);
      filteredDeleted = this.filterByPatterns(documentableDeletedFiles, patterns, false);
    } else {
      this.logger.warn(`Invalid scope: ${scope}, returning all documentable files`);
    }

    const result = [...filteredActive, ...filteredDeleted];

    this.logger.info(`Final result: ${filteredActive.length} active files, ${filteredDeleted.length} deleted files`);

    return result;
  }

  /**
   * Filter files by patterns
   * @param {Array} files - Files to filter
   * @param {Array} patterns - Patterns to match
   * @param {boolean} include - If true, include matching files. If false, exclude them
   * @returns {Array} - Filtered files
   */
  filterByPatterns(files, patterns, include) {
    return files.filter(file => {
      const basename = path.basename(file.filename);
      const matches = patterns.some(pattern =>
          this.matchesPattern(file.filename, basename, pattern)
      );
      return include ? matches : !matches;
    });
  }

  /**
   * Filter files by include patterns
   * @param {Array} files - Files to filter
   * @param {string} patternsStr - Comma-separated patterns
   * @returns {Array} - Filtered files
   */
  filterByIncludePatterns(files, patternsStr) {
    const patterns = patternsStr.split(',').map(p => p.trim()).filter(p => p);
    this.logger.debug(`Include patterns: ${patterns.join(', ')}`);

    return files.filter(file => {
      const basename = path.basename(file.filename);
      return patterns.some(pattern =>
          this.matchesPattern(file.filename, basename, pattern)
      );
    });
  }

  /**
   * Filter files by exclude patterns
   * @param {Array} files - Files to filter
   * @param {string} patternsStr - Comma-separated patterns
   * @returns {Array} - Filtered files
   */
  filterByExcludePatterns(files, patternsStr) {
    const patterns = patternsStr.split(',').map(p => p.trim()).filter(p => p);
    this.logger.debug(`Exclude patterns: ${patterns.join(', ')}`);

    return files.filter(file => {
      const basename = path.basename(file.filename);
      return !patterns.some(pattern =>
          this.matchesPattern(file.filename, basename, pattern)
      );
    });
  }

  /**
   * Check if file matches a pattern
   * @param {string} filename - Full file path
   * @param {string} basename - Base file name
   * @param {string} pattern - Pattern to match
   * @returns {boolean} - Whether the file matches the pattern
   */
  matchesPattern(filename, basename, pattern) {
    // Exact match
    if (basename === pattern) return true;

    // Contains match
    if (basename.includes(pattern) || filename.includes(pattern)) return true;

    // Simple glob pattern support (*.js)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(basename);
    }

    return false;
  }

  /**
   * Get file statistics for logging
   * @param {Array} originalFiles - Original file list
   * @param {Array} filteredFiles - Filtered file list
   * @returns {object} - Statistics object
   */
  getFilterStats(originalFiles, filteredFiles) {
    const excluded = originalFiles.length - filteredFiles.length;
    const deleted = filteredFiles.filter(f => f.status === 'removed').length;
    const active = filteredFiles.filter(f => f.status !== 'removed').length;

    const byExtension = {};
    const byStatus = {
      added: 0,
      modified: 0,
      removed: deleted
    };

    filteredFiles.forEach(file => {
      if (file.status !== 'removed') {
        const ext = path.extname(file.filename).slice(1) || 'no-extension';
        byExtension[ext] = (byExtension[ext] || 0) + 1;
      }

      if (file.status === 'added') {
        byStatus.added++;
      } else if (file.status === 'modified') {
        byStatus.modified++;
      }
    });

    return {
      total: originalFiles.length,
      included: filteredFiles.length,
      excluded,
      active,
      deleted,
      byExtension,
      byStatus
    };
  }
}

module.exports = FileFilter;
