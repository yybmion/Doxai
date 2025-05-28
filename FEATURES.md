# 🔥 Doxai Core Features

Doxai is not just a simple documentation generator. It's an intelligent, fully automated code documentation system.

---

## 📋 Table of Contents

- [🏗️ Smart Folder Structure Generation](#-smart-folder-structure-generation)
- [🔄 Intelligent Document Updates](#-intelligent-document-updates)
- [🗑️ Automatic File Deletion](#-automatic-file-deletion)
- [📁 File Scope Filtering](#-file-scope-filtering)
- [🌍 Multi-language Support](#-multi-language-support)
- [♻️ PR Reuse System](#-pr-reuse-system)
- [⚡ Smart Skip Feature](#-smart-skip-feature)
- [🎯 Intelligent File Type Detection](#-intelligent-file-type-detection)
- [🤖 AI Provider Support](#-ai-provider-support)
- [📊 Real-time Progress Notifications](#-real-time-progress-notifications)

---

## 🏗️ Smart Folder Structure Generation

### Feature Description
Systematically organizes documentation by mirroring the exact directory structure of your source code.

### How it Works
```
📁 Source Code                   📁 Generated Documentation
src/
├── auth/
│   ├── login.js           →    docs/doxai/src/auth/login.adoc
│   └── signup.js          →    docs/doxai/src/auth/signup.adoc
├── api/
│   └── users.js           →    docs/doxai/src/api/users.adoc
└── utils/
    └── helpers.js         →    docs/doxai/src/utils/helpers.adoc
```

### Benefits
- ✅ **Intuitive Navigation**: Easy to find docs with same structure as source code
- ✅ **Automatic Categorization**: Auto-organize by file location
- ✅ **Scalability**: Documentation structure expands automatically with new folders

---

## 🔄 Intelligent Document Updates

### Feature Description
When code changes, existing documentation is updated incrementally rather than being completely regenerated, preserving context and consistency.

### How it Works
1. **Change Detection**: Compare source file modification time with document generation time
2. **Smart Analysis**: Automatically detect new methods, modified logic, and deleted features
3. **Context Preservation**: Maintain existing document format and style
4. **Incremental Updates**: Only regenerate changed sections with AI

### Example
```diff
// Existing Documentation
=== login(username, password)
Performs user authentication.

+ // Newly Added Content
+ === validateToken(token)
+ Validates JWT token authenticity.

// Modified Content is Auto-Updated
=== login(username, password, rememberMe)  // ← Parameter added
Performs user authentication with optional remember me functionality.  // ← Description updated
```

---

## 🗑️ Automatic File Deletion

### Feature Description
When source files are deleted, corresponding documentation is automatically removed to maintain synchronization between code and docs.

### How it Works
1. **Deletion Detection**: Detect files with `status: 'removed'` in PR
2. **Document Mapping**: Find documentation files corresponding to deleted source files
3. **Safe Deletion**: Verify document existence before deletion
4. **Logging**: Report deleted document list in PR comments

### Example Scenario
```bash
# Files deleted in PR
- src/old-feature.js (deleted)
- src/deprecated/legacy.js (deleted)

# Documentation automatically deleted
- docs/doxai/src/old-feature.adoc (auto-deleted)
- docs/doxai/src/deprecated/legacy.adoc (auto-deleted)
```

### Result Report
```markdown
✅ Documentation generation completed!

📊 Summary:
- Generated: 3
- Updated: 2
- **Deleted: 2**  ← Shows deleted documents
- Skipped: 1

🗑️ Deleted documentation:
- docs/doxai/src/old-feature.adoc
- docs/doxai/src/deprecated/legacy.adoc
```

---

## 📁 File Scope Filtering

### Feature Description
Powerful filtering system that allows selective documentation of specific parts of your project.

### Usage
```bash
# Document all files
!doxai

# Include specific folders only
!doxai --scope include:src/api,src/auth

# Include specific file types only
!doxai --scope include:*.js,*.ts

# Exclude test files
!doxai --scope exclude:test,spec,__tests__

# Complex conditions (exclude Node.js modules and config files)
!doxai --scope exclude:node_modules,dist,build,*.config.js
```

### Supported Patterns
- **Exact filename**: `package.json`
- **Folder paths**: `src/components/`
- **Wildcards**: `*.test.js`, `src/**/*.ts`
- **Multiple patterns**: `pattern1,pattern2,pattern3`

---

## 🌍 Multi-language Support

### Feature Description
Generate documentation in Korean or English to match your development team's language preferences.

### Usage
```bash
# Generate English documentation (default)
!doxai

# Generate Korean documentation
!doxai --lang ko

# Specific scope + Korean
!doxai --scope include:src/core --lang ko
```

### Language-specific Quality
| Language | Features | Examples |
|----------|----------|----------|
| **Korean** | • Natural Korean expressions<br>• Appropriate translation of dev terms<br>• Reflects Korean dev culture | `사용자 인증을 처리하는 클래스입니다`<br>`매개변수가 올바르지 않을 때 예외가 발생합니다` |
| **English** | • International standard tech doc format<br>• Developer-friendly expressions<br>• Suitable for global collaboration | `Handles user authentication processes`<br>`Throws exception when parameters are invalid` |

---

## ♻️ PR Reuse System

### Feature Description
When requesting documentation multiple times for the same PR, the system updates the existing documentation PR instead of creating new ones.

### How it Works
1. **Existing PR Search**: Search using pattern `docs: Generate documentation for doxai (PR #123)`
2. **Branch Reuse**: Reuse `docs/doxai-pr-123` branch
3. **Smart Updates**: Only process changed files
4. **History Management**: Record change history with comments for each update

### Scenario Example
```bash
# First execution
!doxai
→ Creates new PR #456: "docs: Generate documentation for doxai (PR #123)"

# Second execution on same PR (after code modifications)
!doxai --lang ko
→ Updates existing PR #456 (doesn't create new PR)
→ Adds comment: "Documentation updated by @username"
```

### Benefits
- ✅ **PR Organization**: Prevents duplicate documentation PRs
- ✅ **History Tracking**: Manage all document changes in one place
- ✅ **Review Efficiency**: Reviewers can see all documentation changes in one PR

---

## ⚡ Smart Skip Feature

### Feature Description
Intelligent system that prevents unnecessary AI calls, saving costs and time.

### Skip Conditions
1. **Unchanged Source Code**: Source file hasn't changed since last documentation generation
2. **Up-to-date Documentation**: Existing documentation matches current code
3. **Duplicate Files**: Already processed files

### Working Example
```bash
# First execution: Process all 5 files
!doxai
→ Generated: 5 files

# Second execution after modifying only 2 files
!doxai
→ Generated: 0 files
→ Updated: 2 files
→ Skipped: 3 files (unchanged)  ← Smart skip!
```

### Report Example
```markdown
📊 Summary:
- Total files: 10
- Generated: 2
- Updated: 3
- **Skipped: 5** (unchanged)
- Failed: 0

⏭️ Skipped files:
- src/utils/constants.js - Source unchanged
- src/config/database.js - Source unchanged
- src/models/User.js - Source unchanged
```

---

## 🎯 Intelligent File Type Detection

### Feature Description
Automatically detects and intelligently selects documentation targets from 60+ file types.

### Supported File Types

#### Programming Languages
```
JavaScript/TypeScript: .js, .jsx, .ts, .tsx
Python: .py, .pyw
Java/JVM: .java, .kt, .scala
C/C++: .c, .cpp, .h, .hpp
Others: .cs, .rs, .go, .rb, .php, .swift, .dart, .r
```

#### Web Development
```
Markup: .html, .htm
Styling: .css, .scss, .sass, .less
Frameworks: .vue, .svelte
```

#### Configuration & Data
```
Data: .json, .yaml, .yml, .xml
Scripts: .sh, .bash, .ps1, .bat
Build: Dockerfile, Makefile, .gradle
```

### Auto-excluded Files
```
❌ Build folders: node_modules/, dist/, build/
❌ Binaries: .png, .jpg, .exe, .dll
❌ Environment: .env, package-lock.json
❌ IDE settings: .vscode/, .idea/
```

---

## 🤖 AI Provider Support

### Feature Description
Supports various AI providers, allowing you to choose based on preferences and budget.

### Supported Providers

#### Google (Recommended)
```yaml
ai-provider: 'google'
ai-model: 'gemini-2.0-flash'
```
- ✅ **Generous free tier**
- ✅ **Fast response time**
- ✅ **High code comprehension**

#### OpenAI
```yaml
ai-provider: 'openai'
ai-model: 'gpt-4'
```
- ✅ **Excellent documentation quality**
- ⚠️ **Paid usage**

#### Anthropic
```yaml
ai-provider: 'anthropic'
ai-model: 'claude-3-opus'
```
- ✅ **Superior reasoning capabilities**
- ⚠️ **Paid usage**

---

## 📊 Real-time Progress Notifications

### Feature Description
Real-time monitoring of the documentation generation process with detailed progress updates.

### Notification Stages

#### 1. Start Notification
```markdown
🔄 @username Starting documentation generation for 5 files...
```

#### 2. Progress Logs (GitHub Actions)
```bash
2024-01-01T10:00:01Z INFO [DocumentationGenerator] Processing file: src/auth/login.js
2024-01-01T10:00:05Z INFO [AIClient] Response received from google (gemini-2.0-flash) in 3.2s
2024-01-01T10:00:06Z INFO [GitHubClient] Committed file: docs/doxai/src/auth/login.adoc
```

#### 3. Final Result Notification
```markdown
✅ @username Documentation generation completed!

📊 Summary:
- Total files: 15
- Generated: 5 files
- Updated: 3 files
- Deleted: 1 file
- Skipped: 6 files (unchanged)
- Failed: 0 files

📚 Documentation PR: https://github.com/user/repo/pull/456 (created)

📄 Generated Documentation:
- docs/doxai/src/auth/login.adoc
- docs/doxai/src/api/users.adoc
- docs/doxai/src/utils/helpers.adoc

📝 Updated Documentation:
- docs/doxai/src/core/app.adoc
- docs/doxai/src/config/database.adoc

⏭️ Skipped (unchanged):
- docs/doxai/src/models/User.adoc
- docs/doxai/src/routes/index.adoc
```

#### 4. Detailed Error Information
```markdown
❌ @username Some files failed to process:

⚠️ Failed files:
- src/complex-algorithm.js: AI API rate limit exceeded
- src/malformed-syntax.js: File parsing error

✅ Successfully processed: 8/10 files
📚 Documentation PR: https://github.com/user/repo/pull/456
```

---

## 🚀 Comprehensive Example: Real Usage Scenario

### Scenario: Document only API folder of large project

```bash
# Command
!doxai --scope include:src/api --lang en

# Processing Steps
1. 🔍 Analyze changed files in PR #123
2. 📁 Filter only files in src/api folder
3. 🎯 Documentation targets: 8 files (5 modified, 2 new, 1 deleted)
4. ⚡ Smart skip: 3 files (unchanged)
5. 🤖 Process 5 files with AI (English)
6. 🗑️ Auto-delete 1 document
7. ♻️ Update existing documentation PR
8. 📊 Report results

# Final Result
✅ @developer Documentation generation completed!

📊 Summary:
- Total files: 8
- Generated: 2
- Updated: 3  
- Deleted: 1
- Skipped: 3 (unchanged)

📚 Documentation PR: https://github.com/myproject/repo/pull/456 (updated)
```

---

## 💡 Usage Tips

### Efficient Usage
1. **Incremental Documentation**: Execute by folder instead of entire project
2. **Scope Utilization**: Selectively document folders with frequent changes
3. **Language Consistency**: Unify documentation language within team
4. **Regular Updates**: Synchronize all documentation after major changes

### Recommended Workflow
```bash
# 1. New feature development (specific module only)
!doxai --scope include:src/new-feature

# 2. Bug fixes (affected files only)
!doxai --scope include:src/auth,src/api

# 3. Pre-release (full synchronization)
!doxai

# 4. Korean team (localization)
!doxai --lang ko
```

---

## 🎉 Conclusion

Doxai is not just a tool, but an **intelligent documentation partner**. With a single command, you can systematically manage documentation for your entire project and maintain up-to-date documentation by reflecting code changes in real-time.

**🚀 Get started now!**
