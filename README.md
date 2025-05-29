# Doxai - AI-Powered Documentation Generator

(Add an example of a picture later...)

*[English](./README.md) | [한국어](./README.ko.md)*

**Doxai** is an intelligent GitHub Action that automatically generates comprehensive technical documentation for your code changes when PRs are merged. Powered by advanced AI models and **language-specific analysis templates**, it creates detailed AsciiDoc documentation tailored to each programming language's unique characteristics.

## ✨ Key Features

[Doxai Core Features Guide](./FEATURES.md)

- **🧠 Language-Specific AI Analysis**: Specialized templates for different programming paradigms
    - **Object-Oriented**: Java, C#, Kotlin, Scala, Swift (focuses on classes, inheritance, design patterns)
    - **Functional**: JavaScript, TypeScript, Python, Go, Rust, Dart (emphasizes functions, data flow, async patterns)
    - **Web Frontend**: HTML, CSS, SCSS, Vue, Svelte (UI/UX, responsiveness, accessibility)
    - **Data & Queries**: SQL, CSV (business context, performance, data quality)
    - **Systems**: C, C++, Headers (memory management, performance, system interfaces)
- **Multiple AI Providers**: OpenAI GPT, Anthropic Claude, Google Gemini support
- **Smart Documentation**: Generates detailed technical documentation in AsciiDoc format
- **Intelligent Updates**: Only processes files that have actually changed since last documentation
- **Multi-language Support**: Generate documentation in English or Korean with native-quality writing
- **Flexible Filtering**: Include/exclude files based on patterns and scopes
- **Batch Processing**: Efficiently handles multiple files in single commits
- **PR Reuse**: Updates existing documentation PRs instead of creating duplicates
- **Folder Structure**: Organizes documentation with proper folder hierarchies

## 🎯 Language-Specific Analysis

### Object-Oriented Languages (Java, C#, Kotlin, Scala, Swift)
```asciidoc
= UserService Class Documentation

== Class Hierarchy
=== Inheritance Relationships
* *Parent Class*: `BaseService` - Provides common service functionality
* *Implemented Interfaces*: `Authenticatable` - User authentication contract

== Object-Oriented Design Features
=== Applied Design Principles
* *Single Responsibility Principle*: Handles only user-related operations
* *Dependency Injection*: Dependencies injected through constructor

=== Used Design Patterns
* *Factory Pattern*: Creates different user types based on roles
```

### Functional Languages (JS, TS, Python, Go, Rust, Dart)
```asciidoc
= Utils Module Documentation

== Data Transformation Flow
=== Input Data Format
* Raw user data from API responses

=== Transformation Process
1. Validates required fields
2. Normalizes email format
3. Encrypts sensitive information

== Functional Programming Features
=== Higher-Order Function Usage
* `mapUsers` - Transforms user objects using provided mapping function
* `filterActive` - Filters users based on activity status
```

### Web Frontend (HTML, CSS, Vue, Svelte)
```asciidoc
= LoginForm Component Documentation

== UI Structure and Layout
=== Visual Composition
* *Layout*: CSS Grid with responsive breakpoints
* *Arrangement*: Centered form with validation feedback

== Accessibility
=== Keyboard Navigation
* Tab order follows logical form flow
* Enter key submits form
=== Screen Reader Support
* All inputs have descriptive labels
* Error messages announced to screen readers
```

### Data & Queries (SQL, CSV)
```asciidoc
= User Analytics Query Documentation

== Business Context
=== Use Cases
* Monthly user engagement reporting
* Customer retention analysis

== Query Logic
=== Performance Considerations
* *Indexes*: Composite index on (user_id, created_at) for optimal performance
* *Execution Time*: ~200ms on 1M user dataset
```

### Systems Programming (C, C++)
```asciidoc
= Memory Pool Implementation Documentation

== Memory Management
=== Allocation Strategy
* *Dynamic Allocation*: Pre-allocates large memory blocks
* *Deallocation*: Marks blocks as free without immediate system calls

== Performance Characteristics
=== Time Complexity
* Allocation: O(1) average case
* Deallocation: O(1)
```

## 🚀 Quick Start

### 1. Setup Workflow

Create `.github/workflows/codeScribeAi.yml`:

```yml
name: CodeScribe AI Documentation

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

      - name: Generate Documentation
        uses: yybmion/Doxai@v1.2.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'google'
          ai-model: 'gemini-2.0-flash'
          ai-api-key: ${{ secrets.AI_API_KEY }}
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
# Generate docs for all files in English (automatic language detection)
!doxai

# Generate docs for specific directories in Korean
!doxai --scope include:src/api,src/auth --lang ko

# Exclude test files and generate in Korean
!doxai --scope exclude:test,spec --lang ko

# Include only specific file types
!doxai --scope include:*.java,*.js
```

## ⚙️ Configuration

### Action Inputs

| Input | Description | Required | Default                       |
|-------|-------------|----------|-------------------------------|
| `github-token` | GitHub API token | Yes | `${{ secrets.GITHUB_TOKEN }}` |
| `ai-provider` | AI provider | No | `google`                      |
| `ai-model` | AI model to use | No | `gemini-2.0-flash`            |
| `ai-api-key` | AI API key | Yes | -                             |
| `language` | Documentation language | No | `en`                          |

### Supported AI Providers

<details>
<summary><strong>Google Gemini (Recommended)</strong></summary>

```yaml
ai-provider: 'google'
ai-model: 'gemini-2.0-flash'  # or gemini-1.5-flash
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

## 📁 Supported File Types & Analysis

### 🎯 Object-Oriented Languages
- **Java** (`.java`) → Class hierarchy, design patterns, inheritance analysis
- **C#** (`.cs`) → SOLID principles, properties, async patterns
- **Kotlin** (`.kt`) → Data classes, extension functions, coroutines
- **Scala** (`.scala`) → Functional OOP hybrid, case classes, traits
- **Swift** (`.swift`) → Protocols, optionals, memory management

### ⚡ Functional Languages
- **JavaScript** (`.js`, `.jsx`) → Function composition, closures, async/await
- **TypeScript** (`.ts`, `.tsx`) → Type safety, generics, interfaces
- **Python** (`.py`, `.pyw`) → Generators, decorators, comprehensions
- **Go** (`.go`) → Goroutines, channels, interfaces
- **Rust** (`.rs`) → Ownership, lifetimes, pattern matching
- **Dart** (`.dart`) → Futures, streams, widgets

### 🎨 Web Frontend
- **HTML** (`.html`, `.htm`) → Semantic structure, accessibility, SEO
- **CSS** (`.css`, `.scss`, `.sass`, `.less`) → Responsive design, animations
- **Vue** (`.vue`) → Component composition, reactivity, lifecycle
- **Svelte** (`.svelte`) → Compile-time optimization, stores

### 📊 Data & Queries
- **SQL** (`.sql`) → Query optimization, business logic, performance
- **CSV** (`.csv`) → Data structure, quality assessment, usage patterns

### ⚙️ Systems Programming
- **C** (`.c`, `.h`) → Memory management, system calls, performance
- **C++** (`.cpp`, `.hpp`) → RAII, templates, STL usage

### 🚫 Excluded by Default
- Configuration files (`.json`, `.yaml`, `.xml`, `.toml`)
- Scripts (`.sh`, `.bat`, `.ps1`)
- Documentation (`.md`, `.rst`, `.txt`)

## 🧠 Smart Features

### Intelligent Language Detection

Doxai automatically detects your programming language and applies specialized analysis:

```
UserService.java → Object-Oriented Expert
├── Analyzes class hierarchy and design patterns
├── Focuses on SOLID principles and inheritance
└── Documents method contracts and exceptions

utils.js → Functional Programming Expert  
├── Examines function composition and data flow
├── Analyzes async patterns and error handling
└── Documents pure functions vs side effects

LoginForm.vue → Frontend UI/UX Expert
├── Reviews component structure and props
├── Evaluates accessibility and responsiveness  
└── Documents user interactions and state management
```

### Cost-Effective Processing

- **Smart Targeting**: Only the relevant template for each file type
- **90% Token Savings**: No irrelevant analysis templates sent to AI
- **Batch Processing**: Multiple files processed in single commits

## 📊 Workflow Results

After running, Doxai provides detailed feedback:

```
✅ @username Documentation generation completed!

📚 Documentation PR: #156 (created)

📊 Summary:
- Generated: 3 files (Java→OOP, JS→Functional, Vue→Frontend)
- Updated: 2 files  
- Skipped: 1 file (unchanged)
- Failed: 0 files

Language Groups Processed:
🎯 oop_class: 1 file (specialized class analysis)
⚡ functional: 1 file (function-focused documentation)  
🎨 web_frontend: 1 file (UI/UX comprehensive review)

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
- Config/script/documentation files are excluded by default (can be customized)

### Language-Specific Considerations
- **Mixed Projects**: Each file gets appropriate specialized analysis
- **Fallback Behavior**: Unknown extensions default to functional analysis
- **Template Customization**: Advanced users can modify analysis templates

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

*Star ⭐ this repo if you find it helpful!*
