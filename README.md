# CodeScribe PR Documentation Generator

GitHub Action that automatically creates documentation for code files in merged PRs using AI.

## Features

- **Automatic Documentation Generation**: Creates comprehensive documentation in AsciiDoc format
- **AI-Powered Analysis**: Leverages advanced AI models to analyze code and generate meaningful documentation
- **Multi-Provider Support**: Compatible with multiple AI providers (OpenAI, Anthropic, Google, Azure)
- **Multilingual**: Supports documentation in English and Korean
- **Smart File Filtering**: Automatically filters documentable file types and provides customizable scope options
- **Intelligent Updates**: Skips unchanged files and updates only modified code
- **PR Reuse**: Uses existing documentation PRs for the same source PR to avoid clutter
- **Seamless Integration**: Works with your existing GitHub workflow

## How It Works

1. A pull request is merged into your repository
2. A team member comments on the PR using the CodeScribe command format: `!doxai [options]`
3. CodeScribe analyzes the code changes using the specified AI model
4. Documentation is generated in AsciiDoc format for relevant files only
5. A new documentation PR is created (or existing one is updated)
6. The original PR receives a comment with detailed results

## Installation

### Step 1: Create Workflow File

Add this to your workflow file (e.g., `.github/workflows/doxai.yml`):

```yaml
name: Doxai Documentation Generator
on:
  issue_comment:
    types: [created]

# Required permissions for PR creation
permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  docs:
    if: contains(github.event.comment.body, '!doxai')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        
      - name: Generate Documentation
        uses: yybmion/codescribe-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'google'
          ai-model: 'gemini-1.5-flash'
          ai-api-key: ${{ secrets.AI_API_KEY }}
          language: 'en'
```

### Step 2: Configure Repository Settings

1. Go to your repository's **Settings** > **Actions** > **General**
2. Under "Workflow permissions", select **"Read and write permissions"**
3. Check **"Allow GitHub Actions to create and approve pull requests"**
4. Click **Save**

### Step 3: Add AI API Key

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **"New repository secret"**
3. Name: `AI_API_KEY`
4. Value: Your AI provider's API key
5. Click **"Add secret"**

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ secrets.GITHUB_TOKEN }}` |
| `ai-provider` | AI provider (openai, anthropic, google, azure) | No | `google` |
| `ai-model` | AI model to use | No | `gemini-1.5-flash` |
| `ai-api-key` | API key for the chosen AI provider | Yes | - |
| `language` | Documentation language (en, ko) | No | `en` |

## Usage

**Important**: Documentation generation only works on **merged PRs**.

Use the following command format in PR comments to trigger documentation generation:

```
!doxai [options]
```

### Command Options

- `--scope`: Specify which files to document
  - `all`: All documentable files (default)
  - `include:pattern1,pattern2`: Only include files matching patterns
  - `exclude:pattern1,pattern2`: Exclude files matching patterns
- `--lang`: Documentation language
  - `en`: English (default)
  - `ko`: Korean

### Examples

Generate documentation for all files in English:
```
!doxai
```

Generate documentation for specific files in Korean:
```
!doxai --scope include:src/api,src/auth --lang ko
```

Generate documentation excluding test files:
```
!doxai --scope exclude:test,spec
```

Generate documentation for JavaScript files only:
```
!doxai --scope include:.js
```

## Supported File Types

CodeScribe automatically filters and processes the following file types:

### Programming Languages
- **JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Python**: `.py`, `.pyw`
- **Java/JVM**: `.java`, `.kt`, `.scala`
- **C/C++**: `.c`, `.cpp`, `.h`, `.hpp`
- **Other**: `.cs`, `.rs`, `.go`, `.rb`, `.php`, `.swift`, `.dart`, `.r`

### Web Development
- **Markup**: `.html`, `.htm`
- **Styling**: `.css`, `.scss`, `.sass`, `.less`
- **Frameworks**: `.vue`, `.svelte`

### Configuration & Scripts
- **Data**: `.json`, `.yaml`, `.yml`, `.xml`
- **Scripts**: `.sh`, `.bash`, `.ps1`, `.bat`
- **Build**: `Dockerfile`, `Makefile`, `.gradle`

### Documentation
- **Text**: `.md`, `.rst`, `.adoc`, `.txt`

### Automatically Excluded
- **Build directories**: `node_modules/`, `dist/`, `build/`, `target/`
- **Binary files**: Images, videos, executables
- **Lock files**: `package-lock.json`, `yarn.lock`
- **Environment files**: `.env`, `.env.local`

## Smart Documentation Features

### Intelligent Updates
- **Changed files**: Only processes files that have been modified since last documentation
- **Skipped files**: Shows which files were skipped because they haven't changed
- **New files**: Generates documentation for newly added files
- **Updated files**: Updates documentation for modified files

### PR Management
- **Single documentation PR**: Creates one documentation PR per source PR
- **Automatic reuse**: Subsequent commands update the existing documentation PR
- **Detailed tracking**: Shows exactly what was generated, updated, or skipped

### Example Output
```
✅ @username Documentation generation completed.

Updated documentation: #145

**New:** 2 files
**Updated:** 1 files  
**Skipped:** 3 files (unchanged)
```

## Supported AI Providers

### OpenAI
```yaml
ai-provider: 'openai'
ai-model: 'gpt-4'  # or 'gpt-3.5-turbo'
```

### Anthropic
```yaml
ai-provider: 'anthropic'
ai-model: 'claude-3-opus'  # or 'claude-3-sonnet', 'claude-3-haiku'
```

### Google (Recommended)
```yaml
ai-provider: 'google'
ai-model: 'gemini-1.5-flash'  # or 'gemini-1.5-pro'
```

### Azure OpenAI
```yaml
ai-provider: 'azure'
ai-model: 'your-deployment-name'
```
Set the `AZURE_OPENAI_ENDPOINT` environment variable in your workflow.

## Documentation Format

The generated documentation follows AsciiDoc format with the following structure:

```asciidoc
= {Class/File Name}
:toc:
:source-highlighter: highlight.js

== Overview

The `{Class/File Name}` is responsible for {main functionality description}.

[cols="1,3"]
|===
|PR Number|#{PR Number}
|Author|@{Author}
|Created Date|{Creation Date}
|Last Modified|{Last Modified Date} by @{Modifier}
|===

== Detailed Description

{Comprehensive description of the class/file functionality, 
design patterns, and architectural considerations}

== Main Use Cases

[source,javascript]
----
// Example usage of this class/file
const instance = new ExampleClass();
instance.mainMethod();
----

== Dependencies

* `dependency1` - Purpose and relationship explanation
* `dependency2` - Purpose and relationship explanation

== Key Methods

=== methodName(parameterType parameterName)

[source,javascript]
----
// Method implementation example
function methodName(parameter) {
    // Core logic
    return result;
}
----

*Purpose*: Detailed explanation of what this method accomplishes

*Parameters*:
* `parameterName` - Type and purpose, including constraints

*Return Value*: Type and meaning of returned value

*Exceptions*:
* `ExceptionType` - When it occurs and how to handle

*Usage Example*:
[source,javascript]
----
const result = instance.methodName(value);
----

== Important Notes

* Key considerations when using this code
* Known limitations or constraints
```

## Troubleshooting

### Common Issues

**Error: "GitHub Actions is not permitted to create or approve pull requests"**
- Solution: Enable PR creation permissions in repository settings (see Installation Step 2)

**Error: "Documentation generation is only possible on merged PRs"**
- Solution: Merge the PR first, then run the documentation command

**Error: "AI API request failed"**
- Solution: Check your API key and ensure it has proper permissions
- Verify the AI provider and model names are correct

**No files to document**
- Check if your files are in the supported file types list
- Verify your `--scope` pattern matches the intended files

## Requirements

- Node.js 20.x or later
- GitHub repository with Actions enabled
- API key for the selected AI provider
- Merged pull requests (documentation generation only works on merged PRs)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: This action requires merged PRs to function. The AI analysis is performed on the final merged code to ensure documentation accuracy.
