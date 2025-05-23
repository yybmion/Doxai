const config = require('./config');

/**
 * Documentation prompt templates and generators
 */
class DocsPromptGenerator {
  constructor() {
    // Language mappings for code blocks
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
  }

  /**
   * Get language display name from file extension
   * @param {string} filename - File name
   * @returns {string} - Language display name
   */
  getLanguageFromFilename(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    return this.codeLanguageMap[extension] || extension.toUpperCase();
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date
   */
  formatDate(dateString) {
    return new Date(dateString).toISOString().split('T')[0];
  }

  /**
   * Create documentation prompt for new file
   * @param {string} filename - Source file name
   * @param {string} fileContent - Source file content
   * @param {object} prDetails - PR details
   * @param {string} language - Documentation language (ko/en)
   * @returns {string} - User prompt
   */
  createDocsPrompt(filename, fileContent, prDetails, language = 'en') {
    const codeLanguage = this.getLanguageFromFilename(filename);
    const template = this.getTemplate(language, 'create', codeLanguage);

    return template
    .replace(/\${prNumber}/g, prDetails.number)
    .replace(/\${author}/g, prDetails.author)
    .replace(/\${createdDate}/g, this.formatDate(prDetails.createdAt))
    .replace(/\${updatedDate}/g, this.formatDate(prDetails.updatedAt))
    .replace(/\${updatedBy}/g, prDetails.mergedBy || prDetails.author)
    .replace(/\${filename}/g, filename)
    .replace(/\${fileContent}/g, fileContent);
  }

  /**
   * Create documentation update prompt
   * @param {string} filename - Source file name
   * @param {string} fileContent - Current file content
   * @param {string} existingDocContent - Existing documentation
   * @param {object} prDetails - PR details
   * @param {string} language - Documentation language (ko/en)
   * @returns {string} - User prompt
   */
  createUpdateDocsPrompt(filename, fileContent, existingDocContent, prDetails, language = 'en') {
    const codeLanguage = this.getLanguageFromFilename(filename);
    const template = this.getTemplate(language, 'update', codeLanguage);

    return template
    .replace(/\${prNumber}/g, prDetails.number)
    .replace(/\${author}/g, prDetails.author)
    .replace(/\${createdDate}/g, this.formatDate(prDetails.createdAt))
    .replace(/\${updatedDate}/g, this.formatDate(prDetails.updatedAt))
    .replace(/\${updatedBy}/g, prDetails.mergedBy || prDetails.author)
    .replace(/\${filename}/g, filename)
    .replace(/\${fileContent}/g, fileContent)
    .replace(/\${existingDocContent}/g, existingDocContent);
  }

  /**
   * Get template based on language and type
   * @param {string} language - Language (ko/en)
   * @param {string} type - Template type (create/update)
   * @param {string} codeLanguage - Programming language name
   * @returns {string} - Template string
   */
  getTemplate(language, type, codeLanguage) {
    const templates = {
      ko: {
        create: `# 코드 문서화 요청

다음 ${codeLanguage} 파일을 분석하여 한국어로 AsciiDoc 형식의 기술 문서를 생성해주세요.

## PR 정보
- PR 번호: \${prNumber}
- 작성자: \${author}
- 작성일: \${createdDate}
- 마지막 수정: \${updatedDate} by \${updatedBy}

## 파일 정보
- 파일명: \${filename}
- 언어: ${codeLanguage}

## 코드
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## 요청사항
1. 위 코드를 철저히 분석하여 AsciiDoc 형식의 개발자 문서를 생성해주세요.
2. 문서는 개발자가 이 코드를 이해하고 사용하는 데 필요한 모든 정보를 포함해야 합니다.
3. 클래스/파일의 주요 기능, 메소드, 의존성 등을 명확하게 설명해주세요.
4. 시스템 프롬프트에서 제공한 AsciiDoc 템플릿 형식을 정확히 따라주세요.
5. 코드에서 명확하지 않은 부분은 추측하지 말고, 문서에 이를 명시해주세요.
6. AsciiDoc 문서만 반환해주세요. 추가 설명은 필요 없습니다.`,

        update: `# 코드 문서 업데이트 요청

다음 ${codeLanguage} 파일이 변경되었습니다. 기존 문서를 업데이트해주세요.

## PR 정보
- PR 번호: \${prNumber}
- 작성자: \${author}
- 작성일: \${createdDate}
- 마지막 수정: \${updatedDate} by \${updatedBy}

## 파일 정보
- 파일명: \${filename}
- 언어: ${codeLanguage}

## 현재 코드
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## 기존 문서
\`\`\`asciidoc
\${existingDocContent}
\`\`\`

## 요청사항
1. 변경된 코드를 반영하여 기존 문서를 업데이트해주세요.
2. 새로운 메소드나 기능은 문서에 추가하고, 제거된 것은 삭제해주세요.
3. 기존 문서의 형식과 스타일을 유지해주세요.
4. PR 정보 섹션을 최신 정보로 업데이트해주세요.
5. 업데이트된 전체 AsciiDoc 문서를 반환해주세요.`
      },

      en: {
        create: `# Documentation Request

Please analyze the following ${codeLanguage} file and generate technical documentation in AsciiDoc format.

## PR Information
- PR Number: \${prNumber}
- Author: \${author}
- Created Date: \${createdDate}
- Last Modified: \${updatedDate} by \${updatedBy}

## File Information
- Filename: \${filename}
- Language: ${codeLanguage}

## Code
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## Requirements
1. Thoroughly analyze the above code and generate developer documentation in AsciiDoc format.
2. The documentation should include all necessary information for developers to understand and use this code.
3. Clearly explain the main functionality, methods, and dependencies of the class/file.
4. Follow the AsciiDoc template format provided in the system prompt exactly.
5. Do not make assumptions about unclear parts; indicate these in the documentation.
6. Return only the AsciiDoc document without additional explanations.`,

        update: `# Documentation Update Request

The following ${codeLanguage} file has been modified. Please update the existing documentation.

## PR Information
- PR Number: \${prNumber}
- Author: \${author}
- Created Date: \${createdDate}
- Last Modified: \${updatedDate} by \${updatedBy}

## File Information
- Filename: \${filename}
- Language: ${codeLanguage}

## Current Code
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## Existing Documentation
\`\`\`asciidoc
\${existingDocContent}
\`\`\`

## Requirements
1. Update the existing documentation to reflect the code changes.
2. Add new methods or features to the documentation and remove deleted ones.
3. Maintain the existing document's format and style.
4. Update the PR information section with the latest details.
5. Return the complete updated AsciiDoc document.`
      }
    };

    return templates[language]?.[type] || templates.en[type];
  }

  /**
   * Get system prompt template
   * @param {string} language - Language (ko/en)
   * @returns {string} - System prompt
   */
  getSystemPrompt(language = 'en') {
    const prompts = {
      ko: `당신은 코드 문서화 전문가입니다. 제공된 코드 파일을 철저히 분석하여 AsciiDoc 형식의 정확하고 유용한 문서를 생성해야 합니다.

## 분석 방법
1. 코드를 전체적으로 살펴보고 주요 목적과 기능을 파악하세요.
2. 클래스/파일의 역할과 시스템 내에서의 위치를 이해하세요.
3. 모든 public 메소드와 중요한 private 메소드를 식별하세요.
4. 코드가 의존하는 외부 라이브러리와 내부 모듈을 파악하세요.

## 포함해야 할 정보
1. 클래스/파일의 주요 기능과 역할 (핵심 목적 중심)
2. 주요 메소드/함수와 그 목적 (getter/setter와 같은 단순 메소드는 생략 가능)
3. 의존성 (다른 클래스/라이브러리/모듈 등)
4. 주요 사용 사례 또는 예제 (가능한 경우)
5. 발생 가능한 중요 예외 상황

## 문서화 원칙
- 명확하고 간결하게 작성하세요.
- 기술적으로 정확한 설명을 제공하세요.
- 개발자가 코드를 빠르게 이해하고 사용할 수 있도록 작성하세요.
- 코드에서 명확하지 않은 부분이 있다면, 추측하지 말고 "이 부분의 목적은 코드에서 명확하지 않습니다"라고 표시하세요.

다음 AsciiDoc 형식을 정확히 사용하세요:

${this.getAsciiDocTemplate()}`,

      en: `You are a code documentation expert. You need to thoroughly analyze the provided code file and generate precise and useful documentation in AsciiDoc format.

## Analysis Method
1. Review the code holistically to understand its main purpose and functionality.
2. Understand the role of the class/file and its position within the system.
3. Identify all public methods and important private methods.
4. Identify external libraries and internal modules the code depends on.

## Information to Include
1. Main functionality and role of the class/file (focus on core purpose)
2. Key methods/functions and their purposes (simple methods like getters/setters can be omitted)
3. Dependencies (other classes/libraries/modules etc.)
4. Main use cases or examples (where possible)
5. Important exceptions that may occur

## Documentation Principles
- Write clearly and concisely.
- Provide technically accurate descriptions.
- Write for developers to quickly understand and use the code.
- If something is unclear in the code, don't guess - indicate "The purpose of this section is not clear from the code".

Use the following AsciiDoc format exactly:

${this.getAsciiDocTemplate()}`
    };

    return prompts[language] || prompts.en;
  }

  /**
   * Get AsciiDoc template structure
   * @returns {string} - AsciiDoc template
   */
  getAsciiDocTemplate() {
    return `= {Class/File Name}
:toc:
:source-highlighter: highlight.js

== Overview

The \`{Class/File Name}\` is responsible for {main functionality description}. {Brief explanation of role in the system}

[cols="1,3"]
|===
|PR Number|#{PR Number}
|Author|@{Author}
|Created Date|{Creation Date}
|Last Modified|{Last Modified Date} by @{Modifier}
|===

== Detailed Description

{Detailed description of the class/file - 2-3 paragraphs explaining specific functionality, purpose, design intentions, etc.}

== Main Use Cases

[source,javascript]
----
// Simple example code using this class/file
const instance = new {ClassName}(...);
instance.{mainMethod}(...);
----

== Dependencies

* \`{Dependency1}\` - {Purpose of the dependency and its relationship with this class}
* \`{Dependency2}\` - {Purpose of the dependency and its relationship with this class}

== Key Methods

=== {MethodName}({parameter types and names})

[source,{language}]
----
// Method signature and main logic only
{Simplified method code - focus on core logic}
----

*Purpose*: {Specific purpose of the method and what it accomplishes}

*Parameters*:

* \`{ParameterName}\` - {Type and purpose, constraints if any}

*Return Value*: {Return type and meaning, possible range of return values}

*Exceptions*:

* \`{ExceptionName}\` - {When it occurs and how to handle it}

*Usage Example*:

[source,{language}]
----
// Example code using this method
const result = instance.{methodName}(params);
----

== Important Notes

* {Important considerations when using this code}
* {Known limitations or cautions}`;
  }
}

// Create singleton instance
const promptGenerator = new DocsPromptGenerator();

// Export compatibility functions
module.exports = {
  docsPromptTemplates: {
    ko: promptGenerator.getSystemPrompt('ko'),
    en: promptGenerator.getSystemPrompt('en')
  },
  createDocsPrompt: (filename, fileContent, prDetails, language) =>
      promptGenerator.createDocsPrompt(filename, fileContent, prDetails, language),
  createUpdateDocsPrompt: (filename, fileContent, existingDocContent, prDetails, language) =>
      promptGenerator.createUpdateDocsPrompt(filename, fileContent, existingDocContent, prDetails, language),
  DocsPromptGenerator
};
