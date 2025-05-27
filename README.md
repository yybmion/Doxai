# Doxai - AI-Powered Documentation Generator

(Add an example of a picture later...)

*[English](./README.md) | [한국어](./README.ko.md)*

**Doxai** is an intelligent GitHub Action that automatically generates comprehensive technical documentation for your code changes when PRs are merged. Powered by advanced AI models, it creates detailed AsciiDoc documentation that helps developers understand and maintain codebases more effectively.

## ✨ Key Features

- **🤖 AI-Powered Analysis**: Leverages OpenAI GPT, Anthropic Claude, Google Gemini, or Azure OpenAI
- **📚 Smart Documentation**: Generates detailed technical documentation in AsciiDoc format
- **🔄 Intelligent Updates**: Only processes files that have actually changed since last documentation
- **🌍 Multi-language Support**: Generate documentation in English or Korean
- **🎯 Flexible Filtering**: Include/exclude files based on patterns and scopes
- **⚡ Batch Processing**: Efficiently handles multiple files in single commits
- **🔄 PR Reuse**: Updates existing documentation PRs instead of creating duplicates
- **📁 Folder Structure**: Organizes documentation with proper folder hierarchies

## 🚀 Quick Start

### 1. Setup Workflow

Create `.github/workflows/doxai.yml`:

```yaml
name: Doxai Documentation Generator
on:
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  docs:
    if: |
      github.event.issue.pull_request && 
      contains(github.event.comment.body, '!doxai')
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Generate Documentation
        uses: yybmion/doxai@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'google'
          ai-model: 'gemini-1.5-flash'
          ai-api-key: ${{ secrets.AI_API_KEY }}
          language: 'en'
```

### 2. Configure Repository

1. Go to **Settings** > **Actions** > **General**
2. Set **Workflow permissions** to **"Read and write permissions"**
3. Enable **"Allow GitHub Actions to create and approve pull requests"**

### 3. Add API Key

1. Navigate to **Settings** > **Secrets and variables** > **Actions**
2. Add your AI provider's API key as `AI_API_KEY`

### 4. Usage

After merging a PR, comment with:

```
!doxai
```

## 🎛️ Advanced Usage

### Command Options

| Option | Description | Default | Examples |
|--------|-------------|---------|----------|
| `--scope` | File filtering scope | `all` | `include:src/`, `exclude:test/` |
| `--lang` | Documentation language | `en` | `ko`, `en` |

### Examples

```bash
# Generate docs for all files in English
!doxai

# Generate docs for specific directories in Korean
!doxai --scope include:src/api,src/auth --lang ko

# Exclude test files and generate in Korean
!doxai --scope exclude:test,spec --lang ko

# Include only JavaScript files
!doxai --scope include:*.js
```

## ⚙️ Configuration

### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub API token | Yes | `${{ secrets.GITHUB_TOKEN }}` |
| `ai-provider` | AI provider | No | `google` |
| `ai-model` | AI model to use | No | `gemini-1.5-flash` |
| `ai-api-key` | AI API key | Yes | - |
| `language` | Documentation language | No | `en` |

### Supported AI Providers

<details>
<summary><strong>Google Gemini (Recommended)</strong></summary>

```yaml
ai-provider: 'google'
ai-model: 'gemini-1.5-flash'  # or gemini-1.5-pro
```
- Fast and cost-effective
- Excellent code understanding
- Good multilingual support
</details>

<details>
<summary><strong>OpenAI GPT</strong></summary>

```yaml
ai-provider: 'openai'
ai-model: 'gpt-4'  # or gpt-3.5-turbo
```
- High-quality output
- Comprehensive analysis
- Premium pricing
</details>

<details>
<summary><strong>Anthropic Claude</strong></summary>

```yaml
ai-provider: 'anthropic'
ai-model: 'claude-3-opus'  # or claude-3-sonnet, claude-3-haiku
```
- Detailed explanations
- Strong reasoning capabilities
- Context-aware documentation
</details>

<details>
<summary><strong>Azure OpenAI</strong></summary>

```yaml
ai-provider: 'azure'
ai-model: 'your-deployment-name'
env:
  AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
```
- Enterprise-grade security
- Custom deployments
- Regional compliance
</details>

## 📁 Supported File Types

### Programming Languages
- **JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Python**: `.py`, `.pyw`
- **Java/JVM**: `.java`, `.kt`, `.scala`
- **C/C++**: `.c`, `.cpp`, `.h`, `.hpp`
- **Others**: `.cs`, `.rs`, `.go`, `.rb`, `.php`, `.swift`, `.dart`, `.r`

### Web Technologies
- **Markup**: `.html`, `.htm`
- **Styling**: `.css`, `.scss`, `.sass`, `.less`
- **Frameworks**: `.vue`, `.svelte`

### Configuration & Scripts
- **Data**: `.json`, `.yaml`, `.yml`, `.xml`
- **Scripts**: `.sh`, `.bash`, `.ps1`, `.bat`
- **Build**: `Dockerfile`, `Makefile`, `.gradle`

### Documentation
- **Text**: `.md`, `.rst`, `.adoc`, `.txt`

## 🧠 Smart Features

### Intelligent File Processing

Doxai automatically:
- ✅ **Detects Changes**: Only processes files modified since last documentation
- ✅ **Skips Unchanged**: Avoids redundant processing for unchanged files
- ✅ **Batch Commits**: Groups multiple file changes into single commits
- ✅ **Folder Structure**: Creates organized documentation hierarchies

### Example Output

```asciidoc
= UserService Class Documentation

== Overview
The `UserService` class manages user authentication and profile operations...

== Dependencies
* `bcrypt` - Password hashing and verification
* `jwt` - JSON Web Token handling

== Key Methods
=== authenticate(email, password)
*Purpose*: Authenticates user credentials and returns JWT token
*Parameters*: 
* `email` - User email address
* `password` - Plain text password
*Return Value*: JWT token string or null if authentication fails
```

## 📊 Workflow Results

After running, Doxai provides detailed feedback:

```
✅ @username Documentation generation completed!

📚 Documentation PR: #156 (created)

📊 Summary:
- Generated: 3 files
- Updated: 2 files  
- Skipped: 1 file (unchanged)
- Failed: 0 files

🔗 View Documentation: https://github.com/owner/repo/pull/156
```

## 🚨 Important Notes

### Requirements
- **Node.js**: 20.x or later
- **Merged PRs Only**: Documentation generation only works on merged PRs
- **Valid API Keys**: Ensure your AI provider API key is valid and has sufficient quota

### Limitations
- Large files (>50KB) may be truncated for AI processing
- Complex code structures might require manual review
- API rate limits may affect processing speed

## 🛠️ Development

### Local Setup

```bash
# Clone repository
git clone https://github.com/yybmion/doxai.git
cd doxai

# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=ai-client

# Watch mode
npm run test:watch
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by [yybmion](https://github.com/yybmion)**

*Star ⭐ this repo if you find it helpful!
