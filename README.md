# CodeScribe PR Documentation Generator

GitHub Action that automatically creates documentation for code files in merged PRs using AI.


## Features

- **Automatic Documentation Generation**: Creates comprehensive documentation in AsciiDoc format
- **AI-Powered Analysis**: Leverages advanced AI models to analyze code and generate meaningful documentation
- **Multi-Provider Support**: Compatible with multiple AI providers (OpenAI, Anthropic, Google, Azure)
- **Multilingual**: Supports documentation in English and Korean
- **Customizable Scope**: Include or exclude specific files
- **Seamless Integration**: Works with your existing GitHub workflow

## How It Works

1. A pull request is merged into your repository
2. A team member comments on the PR using the CodeScribe command format
3. CodeScribe analyzes the code changes using the specified AI model
4. Documentation is generated in AsciiDoc format
5. A new PR is created with the documentation files
6. The original PR receives a comment with the results

## Installation

Add this to your workflow file (e.g., `.github/workflows/documentation.yml`):

```yaml
name: Generate Documentation
on:
  issue_comment:
    types: [created]

jobs:
  docs:
    if: contains(github.event.comment.body, '@(')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate Documentation
        uses: yybmion/codescribe-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'google'
          ai-model: 'gemini-1.5-flash'
          ai-api-key: ${{ secrets.AI_API_KEY }}
          language: 'en'
```

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `ai-provider` | AI provider (openai, anthropic, google, azure) | No | `google` |
| `ai-model` | AI model to use | No | `gemini-1.5-flash` |
| `ai-api-key` | API key for the chosen AI provider | Yes | - |
| `language` | Documentation language (en, ko) | No | `en` |

## Usage

After setting up the action, use the following command format in PR comments to trigger documentation generation:

```
@(project-name) [options]
```

### Options:

- `--scope`: Specify which files to document
    - `all`: All files (default)
    - `include:file1.js,file2.js`: Only include specific files
    - `exclude:test.js`: Include all files except those specified
- `--lang`: Documentation language
    - `en`: English (default)
    - `ko`: Korean

### Examples:

Generate documentation for all files in English:
```
@(my-project)
```

Generate documentation for specific files in Korean:
```
@(backend-api) --scope include:api-client.js,auth.js --lang ko
```

Generate documentation excluding test files:
```
@(frontend) --scope exclude:test.js,spec.js
```

## Supported AI Providers

CodeScribe supports the following AI providers:

### OpenAI
- Models: gpt-4, gpt-3.5-turbo
- Setup: Provide your API key as `ai-api-key` input

### Anthropic
- Models: claude-3-opus, claude-3-sonnet, claude-3-haiku
- Setup: Provide your API key as `ai-api-key` input

### Google
- Models: gemini-1.5-flash, gemini-1.5-pro
- Setup: Provide your API key as `ai-api-key` input

### Azure OpenAI
- Models: Any deployed on your Azure endpoint
- Setup: Set `AZURE_OPENAI_ENDPOINT` environment variable and provide your API key as `ai-api-key` input

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

== Description

{Detailed description of the class/file}

== Dependencies

* `{Dependency1}` - {Description}
* `{Dependency2}` - {Description}

== Key Methods

=== {MethodName}({Parameters})

[source,{language}]
----
{Method code example}
----

*Purpose*: {Method purpose}

*Parameters*:

* `{ParameterName}` - {Description}

*Return Value*: {Return value description}

*Exceptions*:

* `{ExceptionName}` - {Description}
```

## Requirements

- Node.js 20.x or later
- GitHub token with `repo` scope permissions
- API key for the selected AI provider

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
